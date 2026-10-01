#!/usr/bin/env node
// Guard de segurança independente — valida a spec pública COMITADA (e pode ser
// usado no CI para impedir que um vazamento seja mergeado).
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

const FORBIDDEN_IN_PATHS = /\/v1\/(dashboard|operations|portal|internal)\//;
const FORBIDDEN_STRINGS = [
  /\/health\//,
  /\/metrics/,
  /\/v1\/checkout-sessions\/(resolve|status|submit|address-)/,
  /\/v1\/checkout-links\/[^"]*\/sessions/,
  /\/v1\/webhooks\/providers\//,
  /api-staging\.korbit/,
  /api-test(?!\.korbit\.com\.br)/,
  /kbt_(live|test)_[A-Za-z0-9_-]{16,}/,
];

const violations = [];
const file = process.argv[2] ?? 'openapi/korbit-public-v1.json';
const spec = JSON.parse(readFileSync(file, 'utf8'));

for (const path of Object.keys(spec.paths ?? {})) {
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
scan(spec, '$');

if (violations.length > 0) {
  console.error(`GUARD FALHOU em ${file} (${violations.length} violações):`);
  for (const v of violations) console.error(`  - ${v}`);
  exit(1);
}
console.log(`Guard OK: ${file} não contém endpoints internos, URLs de staging nem segredos.`);
