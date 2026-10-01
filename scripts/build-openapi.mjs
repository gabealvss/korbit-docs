#!/usr/bin/env node
// Gera a spec pública da API Korbit (openapi/korbit-public-v1.json) a partir
// do OpenAPI completo do monorepo. Remove todo endpoint não acessível por
// chave de API de merchant, injeta servers/security para o playground da
// Mintlify e roda um guard de segurança que falha o build em qualquer vazamento.
//
// Uso: pnpm sync --spec /caminho/korbit/docs/contracts/openapi/korbit-api-v1.json
//      node scripts/build-openapi.mjs --spec <arquivo> [--out openapi/korbit-public-v1.json]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';

const args = {};
for (let i = 2; i < argv.length; i++) {
  const flag = argv[i];
  if (flag === '--spec' || flag === '--out') args[flag.slice(2)] = argv[++i];
}
const specPath = args.spec;
if (!specPath) {
  console.error('Uso: node scripts/build-openapi.mjs --spec <caminho-do-openapi.json> [--out <saida.json>]');
  exit(1);
}
const outPath = resolve(args.out ?? 'openapi/korbit-public-v1.json');

const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));

// ---------------------------------------------------------------------------
// 1. Denylist — nada que não seja acessível por chave de API merchant sobrevive.
// ---------------------------------------------------------------------------
const REMOVED_PATH_PATTERNS = [
  /^\/health\//,
  /^\/metrics$/,
  /^\/v1$/,
  /^\/v1\/dashboard\//,
  /^\/v1\/operations\//,
  /^\/v1\/internal\//,
  /^\/v1\/portal\//,
  // buyer-facing: chamados pelo checkout público do comprador, não pelo merchant
  /^\/v1\/checkout-links\/\{publicCode\}\/sessions$/,
  /^\/v1\/checkout-sessions\/resolve$/,
  /^\/v1\/checkout-sessions\/status$/,
  /^\/v1\/checkout-sessions\/submit$/,
  /^\/v1\/checkout-sessions\/address-suggestions$/,
  /^\/v1\/checkout-sessions\/address-details$/,
  // entrada de webhooks dos PSPs (Woovi/Mercado Pago) — não é API de merchant
  /^\/v1\/webhooks\/providers\//,
];

const removed = [];
const paths = {};
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  if (REMOVED_PATH_PATTERNS.some((re) => re.test(path))) {
    removed.push(path);
    continue;
  }
  paths[path] = item;
}

// ---------------------------------------------------------------------------
// 2. Re-tag — agrupa a reference por domínio de produto.
// ---------------------------------------------------------------------------
const TAG_BY_PREFIX = [
  [/^\/v1\/sandbox\//, 'Sandbox'],
  [/^\/v1\/test\//, 'Sandbox'],
  [/^\/v1\/payment-intents/, 'Pagamentos'],
  [/^\/v1\/checkout-links/, 'Checkout'],
  [/^\/v1\/checkout-sessions$/, 'Checkout'],
  [/^\/v1\/products\//, 'Catálogo'],
  [/^\/v1\/products$/, 'Catálogo'],
  [/^\/v1\/offers/, 'Catálogo'],
  [/^\/v1\/customers\//, 'Clientes e Pedidos'],
  [/^\/v1\/customers$/, 'Clientes e Pedidos'],
  [/^\/v1\/customer-portal-sessions/, 'Clientes e Pedidos'],
  [/^\/v1\/orders/, 'Clientes e Pedidos'],
  [/^\/v1\/subscriptions/, 'Assinaturas'],
  [/^\/v1\/balance/, 'Saldo e Saques'],
  [/^\/v1\/funds\/releases/, 'Saldo e Saques'],
  [/^\/v1\/payout-beneficiaries/, 'Saldo e Saques'],
  [/^\/v1\/payout-requests/, 'Saldo e Saques'],
  [/^\/v1\/advance\//, 'Antecipações'],
  [/^\/v1\/refunds/, 'Refunds e Disputas'],
  [/^\/v1\/refund-cases/, 'Refunds e Disputas'],
  [/^\/v1\/webhook-subscriptions/, 'Webhooks'],
  [/^\/v1\/iam\//, 'Chaves de API'],
  [/^\/v1\/activity$/, 'Atividade'],
];

const tagOf = (path) => TAG_BY_PREFIX.find(([re]) => re.test(path))?.[1] ?? 'Outros';

function humanize(operationId) {
  const words = operationId
    .replace(/Commerce|Merchant/g, '')
    .replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

for (const [path, item] of Object.entries(paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    op.tags = [tagOf(path)];
    if (!op.summary && op.operationId) op.summary = humanize(op.operationId);
  }
}

// ---------------------------------------------------------------------------
// 3. Security — apenas bearerAuth de merchant; servers para o playground.
// ---------------------------------------------------------------------------
const keptSchemes = { bearerAuth: spec.components?.securitySchemes?.bearerAuth };
if (!keptSchemes.bearerAuth) throw new Error('bearerAuth não encontrado no spec de origem');

const output = {
  openapi: '3.1.0',
  info: {
    title: 'Korbit API',
    version: '1.0.0',
    description:
      'API de pagamentos da Korbit para merchants: PIX, cartão (com 3DS), assinaturas, checkout por link, payouts, antecipações e refunds — com idempotência, webhooks assinados e ambiente sandbox.',
    contact: { name: 'Suporte Korbit', email: 'suporte@korbit.com.br' },
  },
  servers: [
    { url: 'https://api.korbit.com.br', description: 'Produção (chaves kbt_live_)' },
    { url: 'https://api-test.korbit.com.br', description: 'Sandbox (chaves kbt_test_)' },
  ],
  security: [{ bearerAuth: [] }],
  tags: [...new Set(Object.values(paths).flatMap((i) => Object.values(i).flatMap((o) => o.tags ?? [])))]
    .sort()
    .map((name) => ({ name })),
  paths,
  components: { securitySchemes: keptSchemes },
};

// ---------------------------------------------------------------------------
// 4. Poda de schemas — mantém apenas componentes referenciados (transitivo).
// ---------------------------------------------------------------------------
const collectRefs = (node, acc) => {
  if (node === null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    for (const child of node) collectRefs(child, acc);
    return acc;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
      acc.add(value.slice('#/components/schemas/'.length));
    } else {
      collectRefs(value, acc);
    }
  }
  return acc;
};

const sourceSchemas = spec.components?.schemas ?? {};
const keep = new Set(collectRefs({ paths, securitySchemes: keptSchemes }, new Set()));
let grew = true;
while (grew) {
  grew = false;
  for (const name of [...keep]) {
    const schema = sourceSchemas[name];
    if (!schema) continue;
    const before = keep.size;
    collectRefs(schema, keep);
    if (keep.size > before) grew = true;
  }
}
const schemas = {};
for (const name of [...keep].sort()) {
  if (!sourceSchemas[name]) throw new Error(`$ref pendente para schema inexistente: ${name}`);
  schemas[name] = sourceSchemas[name];
}
output.components.schemas = schemas;

// ---------------------------------------------------------------------------
// 5. Guard de segurança — falha o build em qualquer vazamento.
// ---------------------------------------------------------------------------
const FORBIDDEN_IN_PATHS = /\/v1\/(dashboard|operations|portal|internal)\//;
const FORBIDDEN_STRINGS = [
  /api-staging\.korbit/,
  /api-test(?!\.korbit\.com\.br)/, // sandbox oficial permitido; qualquer outro host de teste é vazamento
  /\.fly\.dev/,
  /app-staging\.korbit/,
  /korbit_api:|korbit_worker:|postgresql:\/\//,
  /kbt_(live|test)_[A-Za-z0-9_-]{16,}/, // nenhuma chave com cara de real
];
const violations = [];
for (const path of Object.keys(output.paths)) {
  if (FORBIDDEN_IN_PATHS.test(path)) violations.push(`path proibido: ${path}`);
}
const scan = (node, jsonPath) => {
  if (typeof node === 'string') {
    for (const re of FORBIDDEN_STRINGS) {
      if (re.test(node)) violations.push(`string proibida em ${jsonPath}: ${re}`);
    }
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) scan(value, `${jsonPath}.${key}`);
};
scan(output, '$');

if (removed.length === 0) {
  violations.push('nenhum path foi removido — spec de origem inesperado; verifique --spec');
}
if (violations.length > 0) {
  console.error(`GUARD DE SEGURANÇA FALHOU (${violations.length}):`);
  for (const v of violations) console.error(`  - ${v}`);
  exit(1);
}

// ---------------------------------------------------------------------------
// 6. Saída
// ---------------------------------------------------------------------------
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Spec pública gerada: ${outPath}\n` +
    `  paths mantidos: ${Object.keys(paths).length} (operações: ${Object.values(paths).flatMap((i) => Object.keys(i).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m))).length})\n` +
    `  paths removidos: ${removed.length}\n` +
    `  schemas mantidos: ${Object.keys(schemas).length}/${Object.keys(sourceSchemas).length}\n` +
    `  guard: OK (nenhum padrão proibido no output)`,
);
