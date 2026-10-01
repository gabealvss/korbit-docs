# Korbit Docs

Documentação pública da API Korbit para merchants — construída com [Mintlify](https://mintlify.com).

> **Repositório com conteúdo destinado a ser público.** Nunca commite segredos, chaves reais, URLs de staging ou endpoints internos. O pipeline de OpenAPI possui guard automatizado (`scripts/build-openapi.mjs`) que falha o build se detectar padrões proibidos.

## Estrutura

```
docs.json          # config Mintlify (navegação, tema, playground)
openapi/           # spec pública GERADA a partir do monorepo (commitada)
scripts/           # pipeline de filtro/sanitização do OpenAPI
guias/             # quickstart, auth, erros, idempotência, rate limits...
pagamentos/        # payment intents, PIX, cartão/3DS, checkout links, assinaturas
saldo-saques/      # balance, funds releases, beneficiários, payouts
antecipacoes/      # receivables, quotes, requests
refunds-disputas/  # refunds e casos de contestação
catalogo-crm/      # produtos, preços, ofertas, clientes, pedidos
webhooks/          # assinatura Svix, catálogo de eventos, retries
sandbox/           # simulação e casos de teste
recursos/          # FAQ, glossário, changelog, suporte
snippets/          # componentes MDX reutilizáveis
```

## Desenvolvimento local

```bash
npm i -g mint         # CLI do Mintlify (uma vez)
mint dev              # prévia em http://localhost:3000
```

## Sincronizar a spec da API

A fonte de verdade é o OpenAPI do monorepo Korbit. Para regenerar a spec pública:

```bash
pnpm sync --spec /caminho/para/korbit/docs/contracts/openapi/korbit-api-v1.json
# ou, de dentro do monorepo:
pnpm --dir ../korbit --filter @korbit/api openapi:export && pnpm sync --spec ../korbit/docs/contracts/openapi/korbit-api-v1.json
```

O script remove endpoints internos (dashboard, operations, portal), injeta `servers`/`security` para o playground e revalida o guard de segurança.

## Publish

Conecte o repositório na sua organização Mintlify (GitHub App) e configure o domínio `docs.korbit.com.br`. Tudo neste repo está pronto para o deploy — o publish não exige alterações de conteúdo.
