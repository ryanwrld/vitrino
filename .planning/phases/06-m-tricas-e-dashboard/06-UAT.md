---
status: testing
phase: 06-m-tricas-e-dashboard
source: [06-VERIFICATION.md]
started: 2026-07-15T17:00:00.000Z
updated: 2026-07-15T17:00:00.000Z
---

## Current Test

number: 1
name: Trocar filtro/busca na vitrine não registra um novo pageview (D-02)
expected: |
  Na vitrine pública (/loja/[slug]), abrir a página do grid uma vez (1 pageview
  registrado, product_id null). Trocar o filtro de marca/categoria ou o termo
  de busca (searchParams muda, pathname continua o mesmo) várias vezes NÃO deve
  gravar novos pageviews — o contador de "Acessos" no dashboard não deve subir
  a cada troca de filtro, só na primeira visita à página.
awaiting: user response

## Tests

### 1. Trocar filtro/busca na vitrine não registra um novo pageview (D-02)
expected: Contador de Acessos no dashboard sobe 1x ao abrir a vitrine, e permanece igual ao trocar filtros/busca repetidamente na mesma sessão.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
