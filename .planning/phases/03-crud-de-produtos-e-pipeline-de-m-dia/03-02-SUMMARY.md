---
phase: 03-crud-de-produtos-e-pipeline-de-m-dia
plan: 02
subsystem: products
tags: [nextjs, server-actions, zod, react-hook-form, supabase, currency-parsing]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Tabelas products/product_sizes/product_photos com RLS, database.types.ts regenerado"
provides:
  - "parseBRLPrice/formatBRLPrice (src/lib/currency/brl.ts) — parser BRL dedicado, nunca parseFloat cru"
  - "productSchema (Zod) em src/lib/validation/product.ts"
  - "Listas fixas de marca/solado/categoria/modalidade em src/lib/products/constants.ts"
  - "Server Action saveProduct (src/lib/products/actions.ts)"
  - "UI de cadastro (/produtos/novo) e listagem (/produtos) de produtos"
affects: [03-03, 03-04, 03-05, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getOwnedStore() duplicado verbatim em src/lib/products/actions.ts (mesmo padrão de settings/actions.ts)"
    - "Parser dedicado de domínio (parseBRLPrice) em vez de parseFloat/z.number() sobre input com vírgula decimal"
    - "product-form.tsx segue exatamente o padrão de settings-form.tsx (useForm+zodResolver+useTransition+toast)"

key-files:
  created:
    - src/lib/currency/brl.ts
    - src/lib/validation/product.ts
    - src/lib/products/constants.ts
    - src/lib/products/actions.ts
    - src/app/(admin)/produtos/product-form.tsx
    - src/app/(admin)/produtos/novo/page.tsx
    - src/app/(admin)/produtos/page.tsx
    - src/app/(admin)/produtos/product-list.tsx
    - tests/products/create-product.test.ts
  modified:
    - src/app/(admin)/dashboard/page.tsx

key-decisions:
  - "BRANDS removeu Under Armour e Umbro (pedido direto do usuário durante a execução — fora do ICP de revendedor de chuteiras importadas)"
  - "formatBRLPrice normaliza o espaço não-quebrável (U+00A0) que Intl.NumberFormat pt-BR insere, para previsibilidade em comparações de string"
  - "getOwnedStore() duplicado (não extraído para módulo compartilhado) — segue a convenção já estabelecida em settings/actions.ts de duplicar em vez de acoplar módulos"

requirements-completed: [PROD-01, PROD-02, PROD-07]

coverage:
  - id: D1
    description: "saveProduct persiste nome/marca/preço obrigatórios (D-09); demais campos opcionais como null quando vazios; status nasce 'draft'"
    requirement: PROD-01
    verification:
      - kind: integration
        ref: "tests/products/create-product.test.ts (happy path + opcionais)"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseBRLPrice converte '199,90' -> 199.90 e '1.299,90' -> 1299.90 corretamente (nunca truncado por parseFloat)"
    requirement: PROD-02
    verification:
      - kind: integration
        ref: "tests/products/create-product.test.ts (parsing vírgula e milhar)"
        status: pass
    human_judgment: false
  - id: D3
    description: "saveProduct rejeita quando falta name/brand/price, sem persistir nada"
    requirement: PROD-01
    verification:
      - kind: integration
        ref: "tests/products/create-product.test.ts (rejeição de obrigatórios)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Toast de sucesso ('Produto salvo!') / erro em cada save, via saveProduct retornando {error}|{success,id} consumido pelo product-form.tsx"
    requirement: PROD-07
    verification: []
    human_judgment: true
    rationale: "Toast é comportamento DOM/client-only (sonner) — o shape de retorno é coberto por teste de integração, mas a renderização visual do toast requer verificação manual/UAT"
  - id: D5
    description: "/produtos/novo renderiza formulário de tela única (Identificação/Solado&Categoria/Preço/Descrição); /produtos lista produtos com preço formatado; link de navegação a partir do dashboard"
    verification: []
    human_judgment: true
    rationale: "Verificação visual/E2E no navegador (rotas confirmadas via curl retornando 200 após redirect de auth e dev server sem erros de compilação, mas o fluxo completo de preenchimento+submit+redirect requer UAT humano)"

duration: 47min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 2: Cadastro e Listagem Mínima de Produtos Summary

**Fatia end-to-end de cadastro de produto: formulário de tela única (nome/marca/linha/solado/categoria/modalidade/preço/descrição) -> Server Action `saveProduct` -> Postgres, com parser BRL dedicado (`parseBRLPrice`) e listagem em `/produtos`.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-07-13T10:14:00Z
- **Completed:** 2026-07-13T11:01:33Z
- **Tasks:** 3
- **Files modified:** 10 (9 criados, 1 modificado)

## Accomplishments
- Teste de integração real (`tests/products/create-product.test.ts`) cobrindo happy path, parsing de preço BRL (vírgula decimal e separador de milhar), rejeição de campos obrigatórios faltando e persistência de opcionais — começou vermelho (Task 1), ficou verde após a Task 2
- `parseBRLPrice`/`formatBRLPrice` (`src/lib/currency/brl.ts`) — parser dedicado que nunca usa `parseFloat` cru sobre input com vírgula decimal (Pitfall 3 do 03-RESEARCH.md)
- `productSchema` (Zod) com nome/marca/preço obrigatórios, demais campos opcionais (D-09)
- Listas fixas de marca/solado/categoria/modalidade em `src/lib/products/constants.ts`
- Server Action `saveProduct` (`src/lib/products/actions.ts`): Zod parse -> getOwnedStore -> parseBRLPrice -> insert em `products`, status `draft` por padrão
- Formulário de tela única (`product-form.tsx`) com marca "Outra" revelando texto livre, preço com `inputMode="decimal"` (nunca `type="number"`)
- Rotas `/produtos/novo` (cadastro) e `/produtos` (listagem, sem cache) + link "Produtos" no dashboard
- Suíte completa de testes (89 testes, 21 arquivos) permanece verde; `npx tsc --noEmit` sem novos erros; `npm run lint` sem novos erros

## Task Commits

Each task was committed atomically:

1. **Task 1: Teste de integração (RED) — cadastro persiste campos e preço BRL** - `d318d8b` (test)
2. **Task 2: Camada de dados — parser BRL, schema Zod, constants e Server Action saveProduct** - `d11625e` (feat)
3. **Task 3: UI — formulário de tela única + rota nova + listagem base + link de navegação** - `c2d2563` (feat)

**Deviation commit:** `a3149b3` (fix) — remoção de Under Armour/Umbro da lista fixa de marcas

**Plan metadata:** (pending — final docs commit)

_Note: Task 1/2 seguiram o ciclo TDD RED->GREEN (teste criado vermelho, ficou verde após a Task 2 implementar `saveProduct`)._

## Files Created/Modified
- `tests/products/create-product.test.ts` - teste de integração real (signUp+saveOnboarding para seed, chama saveProduct, verifica via client anônimo autenticado)
- `src/lib/currency/brl.ts` - `parseBRLPrice`/`formatBRLPrice`, parser dedicado de preço BRL
- `src/lib/validation/product.ts` - `productSchema` (Zod), `price` como string bruta (parseada no servidor)
- `src/lib/products/constants.ts` - `BRANDS`/`SOLES`/`CATEGORIES`/`FULFILLMENTS`/`DEFAULT_SIZE_RANGE`/`SIZE_GRID`
- `src/lib/products/actions.ts` - `getOwnedStore()` (duplicado de settings/actions.ts) + `saveProduct`
- `src/app/(admin)/produtos/product-form.tsx` - formulário client de tela única (Identificação/Solado&Categoria/Preço/Descrição)
- `src/app/(admin)/produtos/novo/page.tsx` - rota de cadastro, `requireCompletedOnboarding`
- `src/app/(admin)/produtos/page.tsx` - rota de listagem, sem `"use cache"`, empty state
- `src/app/(admin)/produtos/product-list.tsx` - lista com thumbnail placeholder (`ImageOff`), preço formatado, badge de status
- `src/app/(admin)/dashboard/page.tsx` - adicionado link "Produtos" como ponto de entrada

## Decisions Made
- `formatBRLPrice` normaliza o espaço não-quebrável (`U+00A0`) que `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` insere entre "R$" e o valor, para uma string previsível ("R$ 199,90" com espaço comum) em comparações/testes.
- `getOwnedStore()` duplicado verbatim em `src/lib/products/actions.ts` (não extraído para módulo compartilhado) — segue a convenção já documentada em `src/lib/settings/actions.ts` de duplicar em vez de acoplar módulos entre fatias.
- `BRANDS` removeu "Under Armour" e "Umbro" da lista fixa proposta em 03-UI-SPEC.md — ajuste solicitado diretamente pelo usuário durante a execução (ICP de revendedor de chuteiras importadas não trabalha com essas marcas). Ver Deviations.

## Deviations from Plan

### Auto-fixed Issues

Nenhum (as 3 tasks foram executadas conforme especificado, sem bugs/blockers que exigissem correção automática).

### User-directed Adjustment (fora do fluxo padrão de deviation rules — instrução direta do usuário)

**1. Remoção de "Under Armour" e "Umbro" da lista fixa de marcas**
- **Found during:** Task 3 (durante a implementação do `product-form.tsx`, antes do commit)
- **Issue:** 03-UI-SPEC.md §Fixed lists e a Task 2 original listavam 7 marcas (Nike, Adidas, Puma, Mizuno, Under Armour, New Balance, Umbro) + "Outra". O usuário interrompeu a execução para pedir a remoção de Under Armour e Umbro, já que seu ICP (revendedor de chuteiras importadas) não trabalha com essas marcas.
- **Fix:** `src/lib/products/constants.ts` (`BRANDS`) editado para conter apenas Nike, Adidas, Puma, Mizuno, New Balance, Outra. Nenhum teste dependia da lista completa, então não houve impacto em cobertura.
- **Files modified:** `src/lib/products/constants.ts`
- **Verification:** `grep` confirmou ausência de referências a "Under Armour"/"Umbro" em `tests/`/`src/`; suíte completa permanece verde.
- **Committed in:** `a3149b3` (fix, commit dedicado antes de continuar a Task 3)
- **Nota:** `03-UI-SPEC.md` (§Fixed lists) ainda lista as 7 marcas originais — não foi editado por não estar em `files_modified` deste plano; a lista fixa vivente é `src/lib/products/constants.ts`, que é a fonte de verdade consumida pelo form.

---

**Total deviations:** 1 ajuste direcionado pelo usuário (não é um bug/blocker do plano, é uma correção de conteúdo de negócio solicitada em tempo real)
**Impact on plan:** Nenhum impacto nos critérios de aceitação do plano — `BRANDS` continua sendo uma lista fixa + "Outra" (D-05), só com menos itens.

## Issues Encountered
- Nenhum. A suíte de testes já existente (`tests/rls/product-isolation.test.ts` da Wave 1) confirmou que o schema/RLS de `products` já estava pronto para consumo, sem necessidade de ajustes.

## User Setup Required

None - nenhuma configuração externa manual necessária.

## Next Phase Readiness
- Caminho end-to-end mínimo do CRUD de produtos está completo e testado: formulário -> Server Action -> Postgres -> listagem.
- `saveProduct` já resolve `store_id` via `getOwnedStore()` — Plans 03-03 (tamanhos) e 03-04 (fotos) podem estender o mesmo Server Action ou adicionar novas actions que reusam esse padrão.
- `product-form.tsx` foi deixado com espaço estrutural para as seções Tamanhos (4) e Fotos (5) — Plans 03-03/03-04 devem estender este componente, não recriá-lo.
- `product-list.tsx` usa um placeholder `ImageOff` para a thumbnail — Plan 03-04 substitui pelo thumbnail real da foto de capa (posição 1).
- Nenhum blocker identificado para 03-03.

---
*Phase: 03-crud-de-produtos-e-pipeline-de-m-dia*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: tests/products/create-product.test.ts
- FOUND: src/lib/currency/brl.ts
- FOUND: src/lib/validation/product.ts
- FOUND: src/lib/products/constants.ts
- FOUND: src/lib/products/actions.ts
- FOUND: src/app/(admin)/produtos/product-form.tsx
- FOUND: src/app/(admin)/produtos/novo/page.tsx
- FOUND: src/app/(admin)/produtos/page.tsx
- FOUND: src/app/(admin)/produtos/product-list.tsx
- FOUND: src/app/(admin)/dashboard/page.tsx
- FOUND: commit d318d8b (Task 1)
- FOUND: commit d11625e (Task 2)
- FOUND: commit a3149b3 (deviation fix)
- FOUND: commit c2d2563 (Task 3)
