---
phase: 03-crud-de-produtos-e-pipeline-de-m-dia
plan: 03
subsystem: products
tags: [react-hook-form, useFieldArray, server-actions, supabase, rls, clsx, tailwind-merge]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Tabelas products/product_sizes/product_photos com RLS, database.types.ts regenerado"
  - phase: 03-02
    provides: "productSchema (Zod), saveProduct (Server Action), product-form.tsx (formulário de tela única)"
provides:
  - "size-grid.tsx (grade 36-45, useFieldArray, ciclo de 3 estados)"
  - "Persistência de product_sizes em saveProduct (src/lib/products/actions.ts)"
  - "markProductEsgotado (src/lib/products/actions.ts) — atalho de bulk-esgotar (D-04)"
  - "clsx + tailwind-merge instalados (primeira vez no projeto)"
affects: [03-04, 03-05, 03-06]

# Tech tracking
tech-stack:
  added: ["clsx@2.1.1", "tailwind-merge@3.6.0"]
  patterns:
    - "cn() helper (clsx+twMerge) definido localmente em size-grid.tsx, não extraído para módulo compartilhado — único consumidor nesta fatia"
    - "useFieldArray com append/update/remove/replace — nunca um array paralelo de estado (Pitfall 5 do 03-RESEARCH.md)"
    - "Tamanho não-incluído simplesmente ausente do array `sizes`, nunca representado com um campo `included: false`"

key-files:
  created:
    - src/app/(admin)/produtos/size-grid.tsx
    - tests/products/availability.test.ts
  modified:
    - src/lib/products/actions.ts
    - src/lib/validation/product.ts
    - src/app/(admin)/produtos/product-form.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "productSchema.sizes usa .optional() em vez de .default([]) — .default() causa incompatibilidade de tipo entre zodResolver (zod 4.4.3 + @hookform/resolvers 5.4.0) e useForm<ProductInput>, já que o output type com default() diverge do input type esperado pelo Resolver; .optional() evita essa incompatibilidade sem mudar o comportamento (fallback ?? [] tanto no client quanto no servidor)"
  - "cn() helper definido localmente dentro de size-grid.tsx (não um novo arquivo src/lib/cn.ts) — único consumidor desta fatia, evita um arquivo fora do files_modified do plano"
  - "productSchema.ts recebeu o campo sizes (fora do files_modified original do 03-03-PLAN.md) — necessário como blocking issue: useFieldArray<ProductInput> exige que 'sizes' exista tipado no schema consumido por zodResolver em product-form.tsx; sem isso o formulário não compila (Rule 3 — auto-fix de bloqueio, não decisão arquitetural)"

requirements-completed: [PROD-02, PROD-04, PROD-07]

coverage:
  - id: D1
    description: "saveProduct persiste exatamente os tamanhos escolhidos em product_sizes com o available correto (nunca a grade inteira)"
    requirement: PROD-02
    verification:
      - kind: integration
        ref: "tests/products/availability.test.ts (persiste exatamente os tamanhos escolhidos)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Produto sem tamanho marcado fica sem linhas em product_sizes (rascunho, D-10 — EXISTS falso na Fase 4)"
    requirement: PROD-02
    verification:
      - kind: integration
        ref: "tests/products/availability.test.ts (sem nenhum tamanho enviado, persiste 0 linhas)"
        status: pass
    human_judgment: false
  - id: D3
    description: "markProductEsgotado zera available de todos os tamanhos do produto (D-04)"
    requirement: PROD-04
    verification:
      - kind: integration
        ref: "tests/products/availability.test.ts (põe available=false em todos os tamanhos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "markProductEsgotado num produto de outra loja afeta 0 linhas (isolamento RLS, T-03-09)"
    requirement: PROD-04
    verification:
      - kind: integration
        ref: "tests/products/availability.test.ts (cross-tenant: afeta 0 linhas)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Grade de tamanhos 36-45 com 37-43 pré-incluídos esgotados ao criar; ciclo de 3 estados por toque; atalho 'Marcar tudo como esgotado' visível no formulário"
    requirement: PROD-07
    verification: []
    human_judgment: true
    rationale: "Ciclo visual de pílulas (cores/line-through) e o toast de sucesso do atalho são comportamento DOM/client-only — o shape de retorno das Server Actions é coberto por teste de integração, mas a renderização visual (cores corretas, toque cicla estado, toast aparece) requer verificação manual/UAT no navegador"

duration: 12min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 3: Tamanhos e Disponibilidade por Produto Summary

**Grade de tamanhos 36-45 (react-hook-form `useFieldArray`, ciclo de 3 estados por toque) integrada ao formulário de produto, com persistência exata em `product_sizes` e o atalho "Marcar tudo como esgotado" (`markProductEsgotado`) — 37-43 nascem pré-incluídos e esgotados ao criar um produto novo.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-13
- **Tasks:** 2
- **Files modified:** 6 (2 criados, 4 modificados)

## Accomplishments
- Teste de integração real (`tests/products/availability.test.ts`) cobrindo persistência exata de tamanhos escolhidos, rascunho sem tamanho (0 linhas, D-10), bulk-esgotar (`markProductEsgotado`) e isolamento cross-tenant via RLS — começou vermelho (Task 1: `saveProduct` não persistia sizes, `markProductEsgotado` não existia), ficou verde após a Task 2
- `clsx` + `tailwind-merge` instaladas (2.1.1 / 3.6.0, gate de legitimidade já aprovado em 03-RESEARCH.md, sem checkpoint humano necessário)
- `size-grid.tsx`: grade de 10 pílulas (36-45) via `useFieldArray` (name "sizes"), ciclo de 3 estados por toque (não-incluído -> incluído/esgotado -> incluído/disponível -> não-incluído), pré-seleção 37-43 esgotada ao criar (D-02/D-03), 36/44/45 fora até adicionados manualmente (D-01)
- Atalho "Marcar tudo como esgotado" (D-04): em criação, só reseta o form state (`replace`); com `productId` presente (modo edição, futuro Plan 03-05), chama `markProductEsgotado` e mostra toast antes de refletir no form state
- `saveProduct` estendido: parseia e revalida o campo "sizes" (JSON string do FormData) e insere só as linhas escolhidas em `product_sizes` (nunca a grade inteira)
- `markProductEsgotado(productId)`: `UPDATE product_sizes SET available=false WHERE product_id`, owner-scoped via RLS (T-03-09) — cross-tenant afeta 0 linhas, sem erro
- Suíte completa de testes (93 testes, 22 arquivos) permanece verde; `npx tsc --noEmit` sem novos erros (os 2 erros pré-existentes em `tests/supabase/server-cookies.test.ts` continuam idênticos, fora do escopo deste plano); `npm run lint` sem novos erros/warnings (os 474 erros/128 warnings pré-existentes vêm de `.claude/scripts/` e de padrões já presentes em `settings-form.tsx`/`onboarding-wizard.tsx`, confirmados idênticos antes e depois via `git stash`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Teste de integração (RED) — persistência e bulk-esgotar de tamanhos** - `10b2409` (test)
2. **Task 2: Instalar clsx/tailwind-merge + size-grid + persistência de sizes + markProductEsgotado** - `ad656b8` (feat)

_Note: Task 1/2 seguiram o ciclo TDD RED->GREEN (teste criado vermelho — 3/4 casos falhando, `sizes` não persistidos e `markProductEsgotado` inexistente —, ficou verde após a Task 2 implementar ambos)._

## Files Created/Modified
- `tests/products/availability.test.ts` - teste de integração real (signUp+saveOnboarding para seed, chama saveProduct/markProductEsgotado, verifica via client anônimo autenticado; inclui caso cross-tenant)
- `src/app/(admin)/produtos/size-grid.tsx` - componente client, grade 36-45 via `useFieldArray`, `cn()` helper local (clsx+tailwind-merge), atalho de bulk-esgotar
- `src/app/(admin)/produtos/product-form.tsx` - integra `<SizeGrid control={control} productId={productId} />` entre as seções Preço e Descrição; serializa `sizes` como JSON no `onSubmit`; nova prop opcional `productId` (preparação para o modo edição do Plan 03-05)
- `src/lib/products/actions.ts` - `saveProduct` estendido para parsear/validar/inserir `product_sizes`; nova Server Action `markProductEsgotado`
- `src/lib/validation/product.ts` - `productSchema` ganhou o campo `sizes` (array `{size, available}`, `.optional()`)
- `package.json` / `package-lock.json` - `clsx@2.1.1`, `tailwind-merge@3.6.0`

## Decisions Made
- `productSchema.sizes` usa `.optional()` em vez de `.default([])` (como o Code Example de 03-RESEARCH.md sugeria) — `.default()` quebra a compatibilidade de tipos entre `zodResolver` (zod 4.4.3 + `@hookform/resolvers` 5.4.0) e `useForm<ProductInput>` (o *output type* do schema com default diverge do *input type* esperado pelo `Resolver` genérico, gerando erro `tsc` de "Two different types with this name exist, but they are unrelated"). `.optional()` evita a incompatibilidade sem mudar o comportamento observável — tanto o client (`values.sizes ?? []`) quanto o servidor (`sizesParsed.data ?? []`) já tratam ausência como array vazio.
- O helper `cn()` (composição `clsx`+`tailwind-merge`) foi definido localmente dentro de `size-grid.tsx`, não extraído para um novo arquivo `src/lib/cn.ts` — único consumidor nesta fatia, e um novo arquivo compartilhado não estava no `files_modified` do plano.
- `src/lib/validation/product.ts` foi modificado apesar de não constar no `files_modified` original do `03-03-PLAN.md` — tratado como blocking issue (Rule 3): `useFieldArray<ProductInput, "sizes">` em `size-grid.tsx` exige que o tipo `ProductInput` (inferido de `productSchema`) já contenha o campo `sizes`; sem essa adição o `zodResolver`/`useForm` do `product-form.tsx` não compila. Não é uma decisão arquitetural nova — é exatamente o campo que o próprio `03-RESEARCH.md` (§Code Examples) já havia esboçado para `productSchema`, apenas com `.optional()` no lugar de `.default([])` pelo motivo acima.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `src/lib/validation/product.ts` precisou ganhar o campo `sizes`**
- **Found during:** Task 2, ao tipar `size-grid.tsx`/`product-form.tsx` com `useFieldArray<ProductInput, "sizes">`
- **Issue:** O `files_modified` do `03-03-PLAN.md` não listava `src/lib/validation/product.ts`, mas sem o campo `sizes` no `productSchema`, `ProductInput` não tem essa chave e `useFieldArray`/`zodResolver` não compilam (bloqueio direto para completar a Task 2 como descrita — integração via `useFieldArray` no `product-form.tsx`).
- **Fix:** Adicionado `sizes: z.array(z.object({ size: z.number().int().min(36).max(45), available: z.boolean() })).optional()` ao `productSchema`, reaproveitado no servidor via `productSchema.shape.sizes.safeParse(...)` para revalidar o JSON recebido em `saveProduct`.
- **Files modified:** `src/lib/validation/product.ts`
- **Verification:** `npx tsc --noEmit` limpo (nenhum erro novo); `npx vitest run tests/products/availability.test.ts` verde.
- **Committed in:** `ad656b8` (Task 2)

**2. [Rule 1 - Bug] `.default([])` (conforme sugerido em 03-RESEARCH.md) causava erro de tipo no resolver**
- **Found during:** Task 2, `npx tsc --noEmit` após integrar `SizeGrid` em `product-form.tsx`
- **Issue:** Usar `.default([])` no campo `sizes` do Zod schema tornava o *output type* (`z.infer`) não-opcional, mas o `Resolver` gerado por `zodResolver` (que usa o *input type*, onde `sizes` continua opcional por causa do default) ficava incompatível com o genérico `useForm<ProductInput>` — erro `TS2322` ("Two different types with this name exist, but they are unrelated").
- **Fix:** Trocado `.default([])` por `.optional()`; fallback `?? []` aplicado explicitamente tanto no client (`values.sizes ?? []` no `onSubmit`) quanto no servidor (`sizesParsed.data ?? []` em `saveProduct`).
- **Files modified:** `src/lib/validation/product.ts`, `src/lib/products/actions.ts`
- **Verification:** `npx tsc --noEmit` limpo; suíte completa (93 testes) verde.
- **Committed in:** `ad656b8` (Task 2)

**Total deviations:** 2 auto-fixes (Rule 3 blocking issue + Rule 1 bug), ambos dentro do escopo técnico da Task 2, sem impacto no comportamento/critérios de aceitação do plano.
**Impact on plan:** Nenhum impacto nos `must_haves`/`success_criteria` — a persistência exata de tamanhos, o atalho de bulk-esgotar e o ciclo de 3 estados continuam se comportando exatamente como especificado; a mudança foi só na representação de tipo Zod, não no comportamento observável.

## Issues Encountered
- Pré-existentes e fora de escopo (confirmados idênticos antes/depois via `git stash` + `npx tsc --noEmit`/`npm run lint`): 2 erros de tipo em `tests/supabase/server-cookies.test.ts` (não relacionados a este plano) e 474 erros/128 warnings de lint originados em `.claude/scripts/` (tooling do GSD, fora do código do produto) — não fixados, por estarem fora do escopo desta task (Scope Boundary das deviation rules).

## User Setup Required

None - nenhuma configuração externa manual necessária. `npm install clsx tailwind-merge` já foi executado como parte da Task 2.

## Next Phase Readiness
- `size-grid.tsx` está pronto para ser reaproveitado sem alteração pelo Plan 03-05 (edição) — basta passar `productId` (ativa o modo Server Action do atalho de bulk-esgotar) e `defaultValues.sizes` carregado do produto existente.
- `product-form.tsx` foi deixado com espaço estrutural para a seção Fotos (03-UI-SPEC.md §5) — Plan 03-04 deve estender este componente, inserindo o `photo-uploader.tsx` entre Tamanhos e Descrição.
- `markProductEsgotado` já resolve owner via `getOwnedStore()` e está isolado por RLS — nenhum blocker identificado para 03-04/03-05/03-06.

---
*Phase: 03-crud-de-produtos-e-pipeline-de-m-dia*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: tests/products/availability.test.ts
- FOUND: src/app/(admin)/produtos/size-grid.tsx
- FOUND: src/lib/products/actions.ts
- FOUND: src/lib/validation/product.ts
- FOUND: src/app/(admin)/produtos/product-form.tsx
- FOUND: .planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/03-03-SUMMARY.md
- FOUND: commit 10b2409 (Task 1)
- FOUND: commit ad656b8 (Task 2)
