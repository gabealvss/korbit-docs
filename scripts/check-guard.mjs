#!/usr/bin/env node
// Guard de segurança independente — valida a spec pública COMITADA e TODO o
// conteúdo MDX (pode rodar no CI para impedir que um vazamento seja mergeado).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { exit } from 'node:process';

const FORBIDDEN_IN_PATHS = /\/v1\/(dashboard|operations|portal|internal)\//;
const FORBIDDEN_STRINGS = [
  /\/health\//,
  /\/metrics/,
  /\/v1\/checkout-sessions\/(resolve|status|submit|address-)/,
  /\/v1\/checkout-links\/[^"'\s]*\/sessions/,
  /\/v1\/webhooks\/providers\//,
  /api-staging\.korbit/,
  /api-test(?!\.korbit\.com\.br)/, // sandbox oficial permitido
  /\.fly\.dev/,
  /app-staging\.korbit/,
  /postgresql:\/\//,
  /kbt_(live|test)_(?!EXEMPLO)[A-Za-z0-9_-]{16,}/, // placeholders kbt_*_EXEMPLO permitidos
  /woovi/i, // provedores de pagamento nunca aparecem no público
  /mercado[\s_-]?pago/i,
  /mercadopago/i,
];

const violations = [];
const scan = (node, jsonPath) => {
  if (typeof node === 'string') {
    for (const re of FORBIDDEN_STRINGS) {
      if (re.test(node)) violations.push(`${jsonPath}: ${re}`);
    }
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) scan(value, `${jsonPath}.${key}`);
};

// 1. Spec pública
const specFile = process.argv[2] ?? 'openapi/korbit-public-v1.json';
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
for (const path of Object.keys(spec.paths ?? {})) {
  if (FORBIDDEN_IN_PATHS.test(path)) violations.push(`${specFile}: path proibido: ${path}`);
}
scan(spec, specFile);

// 2. Conteúdo (mdx/md + docs.json)
const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'openapi') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(mdx|md|json)$/.test(entry)) files.push(full);
  }
  return files;
};
for (const file of walk('.')) {
  const text = readFileSync(file, 'utf8');
  scan({ [file]: text }, file);
}

if (violations.length > 0) {
  console.error(`GUARD FALHOU (${violations.length} violações):`);
  for (const v of violations) console.error(`  - ${v}`);
  exit(1);
}
console.log('Guard OK: sem endpoints internos, URLs de staging, segredos ou nomes de provedores.');
