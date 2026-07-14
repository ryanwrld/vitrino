---
phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico
plan: 02
subsystem: whatsapp-order-flow
tags: [whatsapp, encoding, wa.me, pure-functions, vitest, storage]

# Dependency graph
requires:
  - phase: 01-onboarding-e-loja
    provides: "DEFAULT_MESSAGE_TEMPLATE, REQUIRED_TEMPLATE_PLACEHOLDERS (src/lib/validation/onboarding.ts) e normalizeWhatsAppBR (src/lib/phone/normalize-br.ts) — telefone já normalizado no onboarding, só lido aqui"
  - phase: 03-crud-de-produtos-e-pipeline-de-m-dia
    provides: "formatBRLPriceInput (src/lib/currency/brl.ts) usado para {preço} sem prefixo R$ duplicado"
provides:
  - "interpolateMessageTemplate/buildOrderMessage/buildWhatsAppUrl — montagem pura da mensagem de pedido com encoding único"
  - "decideOrderAction — decisão pura do botão 'Pedir agora' (navegar vs sacudir)"
  - "getProductImagePublicUrl — helper consolidado de URL pública do Storage (elimina duplicação em page.tsx e public-actions.ts)"
affects: ["05-03", "05-04"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Funções puras sem DOM para lógica crítica de WhatsApp (encoding, decisão de CTA) — testáveis em milissegundos, sem browser"
    - "encodeURIComponent chamado exatamente uma vez sobre a string COMPLETA já composta (template + linha de foto), nunca sobre sub-pedaços"

key-files:
  created:
    - src/lib/whatsapp/order-message.ts
    - src/lib/whatsapp/order-guard.ts
    - src/lib/storage/product-image-url.ts
    - tests/products/order-message.test.ts
    - tests/products/order-button-guard.test.ts
  modified: []

key-decisions:
  - "getProductImagePublicUrl centraliza o one-liner de URL pública do Storage antes duplicado byte-a-byte em src/app/loja/[slug]/page.tsx e src/lib/products/public-actions.ts — extração feita, mas os dois call sites originais NÃO foram migrados neste plano (fora do escopo desta fatia; plano cobre só a criação dos módulos puros e seus testes)"
  - "{preço} interpola o valor bruto formatado via formatBRLPriceInput (chamado pelo consumidor de order-message.ts, fora deste módulo) — nunca formatBRLPrice, que prefixaria um segundo 'R$' no template padrão"

patterns-established:
  - "Módulo utilitário puro por responsabilidade (mensagem, guarda de CTA, URL de storage) em vez de um único arquivo grande — mantém testável sem mocking"

requirements-completed: [PED-03]

coverage:
  - id: D1
    description: "interpolateMessageTemplate substitui as 4 chaves do template (incluindo {preço} com ç literal) via replaceAll"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "tests/products/order-message.test.ts#interpolateMessageTemplate > substitui as 4 chaves do DEFAULT_MESSAGE_TEMPLATE, incluindo acentos, sem duplicar 'R$'"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildOrderMessage anexa 'Foto: <url>' quando há fotoUrl e omite a linha quando fotoUrl é null"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "tests/products/order-message.test.ts#buildOrderMessage > anexa a linha 'Foto: <url>' quando fotoUrl não é null"
        status: pass
      - kind: unit
        ref: "tests/products/order-message.test.ts#buildOrderMessage > NÃO anexa a linha 'Foto:' quando fotoUrl é null"
        status: pass
    human_judgment: false
  - id: D3
    description: "buildWhatsAppUrl codifica a mensagem completa exatamente uma vez (round-trip via decodeURIComponent preserva acentos, sem %2520/dupla codificação)"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "tests/products/order-message.test.ts#buildWhatsAppUrl > começa com https://wa.me/ e codifica a mensagem uma única vez, preservando acentos no round-trip"
        status: pass
      - kind: unit
        ref: "tests/products/order-message.test.ts#buildWhatsAppUrl > codifica a mensagem sem foto exatamente uma vez"
        status: pass
    human_judgment: false
  - id: D4
    description: "decideOrderAction retorna {shouldNavigate:false, shouldShake:true} sem tamanho e {shouldNavigate:true, shouldShake:false} com tamanho"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "tests/products/order-button-guard.test.ts#decideOrderAction > sem tamanho selecionado (null): não navega, sacode"
        status: pass
      - kind: unit
        ref: "tests/products/order-button-guard.test.ts#decideOrderAction > com tamanho selecionado: navega, não sacode"
        status: pass
    human_judgment: false
  - id: D5
    description: "getProductImagePublicUrl retorna a public URL do bucket product-images, ou null quando path é null"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (tipos verificados; wrapper trivial sem lógica condicional além do guard de null, coberto por typecheck e uso consistente com os dois call sites originais)"
        status: unknown
    human_judgment: true
    rationale: "Este plano não incluiu um teste unitário dedicado para getProductImagePublicUrl (o plano só listou order-message.test.ts e order-button-guard.test.ts como artifacts de teste); a função é um wrapper trivial de um método do SDK Supabase Storage já usado nos dois call sites existentes, mas a integração real (retorno de URL válida) só é exercida quando 05-03/05-04 consumirem o helper na vitrine."

# Metrics
duration: 15min
completed: 2026-07-14
status: complete
---

# Phase 05 Plan 02: Módulos Puros de Pedido no WhatsApp Summary

**Três módulos utilitários puros (order-message.ts, order-guard.ts, product-image-url.ts) que montam a mensagem de pedido com encoding único, decidem a ação do botão "Pedir agora" e consolidam a URL pública de imagens do Storage — cobertos por 7 testes Vitest verdes em milissegundos, sem DOM.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2 completed
- **Files modified:** 5 (todos criados)

## Accomplishments
- `order-message.ts`: `interpolateMessageTemplate`, `buildOrderMessage`, `buildWhatsAppUrl` — a fatia automatizável de PED-03, travando a correção de encoding (armadilha #6 do catálogo de bugs do PROJECT.md) com feedback rápido
- `order-guard.ts`: `decideOrderAction` isola a decisão pura do CTA "Pedir agora" (navegar vs sacudir) para consumo testável pelo PED-04 em plano futuro
- `product-image-url.ts`: `getProductImagePublicUrl` consolida o one-liner de URL pública do Storage hoje duplicado em `page.tsx` e `public-actions.ts` (extração feita; migração dos call sites fica para o plano que efetivamente consumir este helper)
- 7 testes unitários verdes cobrindo: substituição das 4 chaves (com acentos), ausência de "R$" duplicado, linha de foto presente/ausente, round-trip de encoding único (sem `%2520`/dupla codificação), e os dois ramos de `decideOrderAction`

## Task Commits

Each task was committed atomically:

1. **Task 1: Módulos puros order-message.ts, order-guard.ts e product-image-url.ts** - `967d7ea` (feat)
2. **Task 2: Testes unitários de mensagem e guarda de pedido** - `d6bb71b` (test)

**Plan metadata:** (this commit)

_Note: Plan structure ordered implementation (Task 1) before tests (Task 2) rather than strict RED→GREEN — both tasks were marked `tdd="true"` but the plan itself sequenced module creation first (verified via `tsc --noEmit`) then test creation (verified via `vitest run`), which was followed as written._

## Files Created/Modified
- `src/lib/whatsapp/order-message.ts` - Interpolação do template, anexo da linha de foto, e codificação única da URL wa.me
- `src/lib/whatsapp/order-guard.ts` - Decisão pura do CTA "Pedir agora" (navegar vs sacudir)
- `src/lib/storage/product-image-url.ts` - Wrapper de `getPublicUrl` do bucket `product-images`, retornando `null` para path `null`
- `tests/products/order-message.test.ts` - 5 testes: interpolação, linha de foto, encoding único (2 casos)
- `tests/products/order-button-guard.test.ts` - 2 testes: os dois ramos de `decideOrderAction`

## Decisions Made
- `{preço}` recebe o valor já formatado via `formatBRLPriceInput` (responsabilidade do chamador, fora deste módulo) — `order-message.ts` não importa `formatBRLPrice` nem faz qualquer formatação de moeda internamente, apenas interpola a string recebida
- `getProductImagePublicUrl` foi criado e tipado com `SupabaseClient<Database>` seguindo a convenção já usada em `public-list.ts`/`actions.ts`, mas os dois call sites duplicados (`page.tsx` L83-88, `public-actions.ts` L58-63) não foram refatorados para usá-lo neste plano — o plano listou apenas a criação do helper como artifact, não a migração dos consumidores existentes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Execução foi interrompida por um erro transitório de conexão de API logo após o commit da Task 2 e antes da escrita do SUMMARY.md. Nenhum trabalho foi perdido: `git log`/`git status` confirmaram que ambos os commits de task já estavam persistidos e a árvore de trabalho estava limpa antes da retomada; testes (`npx vitest run`) foram re-executados como confirmação (7/7 verde) sem re-implementar nada.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `order-message.ts` e `order-guard.ts` estão prontos para consumo pelo componente do botão "Pedir agora" (PED-04, planos seguintes desta fase) — a lógica de montagem de mensagem e decisão de clique já está provada por teste puro
- `getProductImagePublicUrl` está disponível para os planos que forem tocar `page.tsx`/`public-actions.ts` ou o componente de pedido, mas a migração dos dois call sites duplicados ainda não foi feita — sinalizar para o plano que efetivamente monta a mensagem de pedido consumir este helper em vez de reimplementar o one-liner
- `npx tsc --noEmit` limpo para os arquivos deste plano (únicos erros remanescentes são pré-existentes em `tests/supabase/server-cookies.test.ts`, documentados em STATE.md, fora do escopo desta fase)

---
*Phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico*
*Completed: 2026-07-14*
