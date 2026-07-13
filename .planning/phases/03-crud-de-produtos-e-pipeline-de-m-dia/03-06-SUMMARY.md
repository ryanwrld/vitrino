---
phase: 03-crud-de-produtos-e-pipeline-de-m-dia
plan: 06
subsystem: api
tags: [nextjs, supabase, server-components, search-params, react]

# Dependency graph
requires:
  - phase: 03-crud-de-produtos-e-pipeline-de-m-dia (Plans 03-01/03-02/03-04/03-05)
    provides: schema products/product_sizes/product_photos + RLS, listagem base (Plan 03-02), pipeline de fotos (Plan 03-04), editar/excluir/publicar (Plan 03-05)
provides:
  - queryProducts (src/lib/products/list.ts) — busca/filtro/ordenação/disponibilidade derivada, testável fora do Server Component
  - /produtos lendo searchParams como fonte de verdade dos filtros (URL compartilhável reproduz a visualização)
  - ProductToolbar (busca debounced + selects de filtro + ordenação)
  - Rollup de disponibilidade e thumbnail de capa na listagem
  - Checkpoint humano final da Fase 3 (fluxo completo de CRUD no mobile) — APROVADO
  - Fix pós-checkpoint: limite de corpo das Server Actions ampliado para 10MB (next.config.ts)
affects: [04-vitrine-publica]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "queryProducts: duas queries separadas (products filtrado/ordenado + product_sizes/product_photos via .in(productIds)) + join em memória, em vez de embed único — mesmo padrão já usado em /produtos/[id]/editar/page.tsx"
    - "Toolbar client component nunca guarda estado de filtro próprio — cada mudança reconstrói a URL a partir de currentParams (prop derivada do searchParams real) via router.push, URL como única fonte de verdade"
    - "experimental.serverActions.bodySizeLimit ampliado para 10mb (next.config.ts) — limite de corpo do Next é separado do limite de 5MB por foto já validado em validatePhotoFile"

key-files:
  created:
    - "src/lib/products/list.ts"
    - "src/app/(admin)/produtos/product-toolbar.tsx"
    - "tests/products/list-filter-sort.test.ts"
  modified:
    - "src/app/(admin)/produtos/page.tsx"
    - "src/app/(admin)/produtos/product-list.tsx"
    - "next.config.ts"

key-decisions:
  - "queryProducts com duas queries separadas + join em memória, não embed do Supabase — tipagem mais simples e consistente com o único precedente do codebase"
  - "Task 2 comita page.tsx sem renderizar <ProductToolbar> ainda (só searchParams->queryProducts funcional via URL); Task 3 adiciona o wiring de fato — mantém Task 2 verde isoladamente em tsc/vitest"
  - "Toolbar não mantém estado de filtro paralelo: cada onChange/debounce reconstrói a URL inteira a partir de currentParams (prop), nunca useSearchParams — evita duplicar a fonte de verdade"
  - "Post-checkpoint: experimental.serverActions.bodySizeLimit ampliado para 10mb (commit 81cf8b5, aplicado pelo orquestrador durante o teste mobile) — poucas fotos comprimidas a ~1MB cada somadas num único saveProduct/updateProduct excediam o teto padrão de 1MB do Next, quebrando o cadastro na prática ('Body exceeded 1 MB limit')"

patterns-established:
  - "Rollup de disponibilidade no nível do produto (dot verde/cinza, sem strikethrough) distinto do pill de tamanho individual (strikethrough) — mesma distinção visual que a Fase 4 (vitrine pública) deve seguir"

requirements-completed: [PROD-06, PROD-07]

coverage:
  - id: D1
    description: "queryProducts filtra por nome (ilike parcial case-insensitive), status, marca e solado; ordena por recente/nome/preço (fallback recente); deriva disponibilidade via EXISTS sobre product_sizes.available; isola por store_id (T-03-13)"
    requirement: "PROD-06"
    verification:
      - kind: integration
        ref: "tests/products/list-filter-sort.test.ts#filtra por nome/status/marca/solado, ordena, deriva disponibilidade e isola por loja"
        status: pass
    human_judgment: false
  - id: D2
    description: "page.tsx lê searchParams (q/status/brand/sole/sort) como fonte de verdade e distingue os dois empty states (nenhum produto vs. filtro sem resultado) via contagem total separada"
    requirement: "PROD-06"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (0 erros novos)"
        status: pass
    human_judgment: true
    rationale: "A renderização condicional dos dois empty states e a persistência efetiva na URL dependem de navegação real no navegador — verificado estaticamente (tsc) mas o comportamento visual/interativo foi confirmado no checkpoint humano final (Task 4)."
  - id: D3
    description: "ProductToolbar: busca debounced (400ms, useDebouncedValue), selects de status/marca/solado e ordenação, cada mudança reconstrói a URL via router.push preservando os demais params; mobile em flex-wrap gap-2"
    requirement: "PROD-06"
    verification: []
    human_judgment: true
    rationale: "Interação de UI (debounce, navegação client-side, layout mobile) exige checagem humana — coberta pelo checkpoint final da Fase 3 (Task 4), aprovado pelo usuário no dispositivo móvel real."
  - id: D4
    description: "Thumbnail de capa (coverUrl via next/image, fallback ImageOff) e indicador de disponibilidade derivada (dot verde 'Disponível' / dot cinza 'Esgotado') na listagem"
    requirement: "PROD-06"
    verification: []
    human_judgment: true
    rationale: "Renderização visual (imagem, cores, dots) exige checagem humana — coberta pelo checkpoint final aprovado."
  - id: D5
    description: "Checkpoint humano final da Fase 3: fluxo completo de CRUD no mobile (cadastrar Nike/Mercurial/FG com foto+tamanhos, publicar/despublicar, buscar/filtrar/ordenar com URL persistente, editar, excluir, dois empty states) — sem layout quebrado"
    verification:
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 4 — aprovado pelo usuário ('funcionou certinho')"
        status: pass
    human_judgment: true
    rationale: "Gate bloqueante explícito do plano (gate=\"blocking\") — encerra a Fase 3 inteira; exige confirmação humana em dispositivo real, não automatizável."

# Metrics
duration: 57min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 06: Buscar/Filtrar/Ordenar + Checkpoint Final da Fase Summary

**queryProducts (busca por nome/status/marca/solado + ordenação recente/nome/preço + disponibilidade derivada) lido via searchParams em /produtos, toolbar debounced com URL como fonte de verdade, e checkpoint humano final da Fase 3 aprovado no mobile (caso de teste Nike/Mercurial/FG).**

## Performance

- **Duration:** 57 min (incluindo a pausa do checkpoint humano para teste real no celular)
- **Started:** 2026-07-13T14:27:29-04:00
- **Completed:** 2026-07-13T15:24:36-04:00
- **Tasks:** 4 (3 automáticas + 1 checkpoint humano bloqueante)
- **Files modified:** 6 (3 criados, 3 modificados) + `next.config.ts` (fix pós-checkpoint)

## Accomplishments
- `queryProducts` (`src/lib/products/list.ts`): função pura server-side que filtra por nome (ilike parcial case-insensitive), status, marca e solado; ordena por recente/nome/preço (fallback recente); deriva disponibilidade via `EXISTS` sobre `product_sizes.available=true` (cobre de graça o rascunho sem tamanhos, D-10); resolve a capa via a foto de menor `position`. Testável diretamente, fora do Server Component.
- `/produtos` (`page.tsx`) refatorado para ler `searchParams` (q/status/brand/sole/sort) como única fonte de verdade dos filtros — abrir a URL filtrada reproduz exatamente a mesma visualização. Dois empty states distintos: "Nenhum produto cadastrado ainda" (loja vazia) vs. "Nenhum produto encontrado" (filtro sem resultado), decididos via uma contagem total separada da lista filtrada.
- `ProductToolbar` (novo): busca por nome com debounce de 400ms (`useDebouncedValue`, reusado sem reimplementação), selects de status/marca/solado e dropdown de ordenação — cada mudança reconstrói a URL inteira via `router.push`, nunca mantendo estado de filtro paralelo.
- `product-list.tsx` estendido: thumbnail de capa via `next/image` (fallback `ImageOff` sem foto) e indicador de disponibilidade derivada no nível do produto (dot verde "Disponível" / dot cinza "Esgotado", sem strikethrough — reservado para os pills de tamanho individual do formulário).
- **Checkpoint humano final da Fase 3 (Task 4) — APROVADO pelo usuário**: fluxo completo de CRUD testado em dispositivo móvel real (cadastrar Nike/Mercurial/FG com foto e tamanhos, marcar disponibilidade, publicar/despublicar, buscar/filtrar/ordenar com persistência via URL, editar, excluir, dois empty states, sem layout quebrado no mobile). Resultado do usuário: "funcionou certinho".
- **Fix pós-checkpoint (commit `81cf8b5`, aplicado diretamente pelo orquestrador durante o teste mobile)**: o limite de corpo padrão de 1MB das Server Actions do Next.js (separado do limite de 5MB por foto já validado em `validatePhotoFile`) estourava na prática ao somar poucas fotos comprimidas a ~1MB cada num único `saveProduct`/`updateProduct`, quebrando o cadastro real com "Body exceeded 1 MB limit." — corrigido ampliando `experimental.serverActions.bodySizeLimit` para `"10mb"` em `next.config.ts`. Encontrado e corrigido fora do fluxo normal de tasks, mas como parte do trabalho de fechamento desta wave/fase (Regra 3 — bug bloqueante para o próprio fluxo que o checkpoint estava validando).

## Task Commits

Each task was committed atomically:

1. **Task 1: Teste de integração (RED) — busca, filtro e ordenação** - `4a68880` (test)
2. **Task 2: queryProducts (server-side testável) + page.tsx lê searchParams** - `fec0de9` (feat)
3. **Task 3: Toolbar de busca/filtro/ordenação + rollup de disponibilidade na lista** - `1aeae2d` (feat)
4. **Task 4: [CHECKPOINT] Verificação humana do fluxo completo de CRUD no mobile** - APROVADO pelo usuário ("funcionou certinho")

**Pós-checkpoint (achado durante o teste mobile, aplicado diretamente pelo orquestrador):** `81cf8b5` (fix) — aumenta `bodySizeLimit` das Server Actions para 10MB.

**Docs/suporte:** `50b2892` (docs) — registra em `deferred-items.md` que a suíte completa `npm test` não fica verde no ambiente atual por rate-limit de signup do Supabase Auth (ver Deviations abaixo).

_Nenhuma task era TDD por task; a Task 1 seguiu o ciclo RED->GREEN explícito do plano (RED na Task 1, GREEN confirmado ao final da Task 2)._

## Files Created/Modified
- `src/lib/products/list.ts` - `queryProducts(supabase, storeId, params)`: filtro/ordenação/disponibilidade derivada/capa
- `tests/products/list-filter-sort.test.ts` - Teste de integração cobrindo busca/filtro/ordenação/disponibilidade/isolamento cross-tenant
- `src/app/(admin)/produtos/page.tsx` - Lê `searchParams`, chama `queryProducts`, distingue os dois empty states, renderiza `<ProductToolbar>`
- `src/app/(admin)/produtos/product-toolbar.tsx` - Busca debounced + selects de filtro + ordenação, URL como fonte de verdade
- `src/app/(admin)/produtos/product-list.tsx` - Thumbnail de capa (`next/image`) + indicador de disponibilidade derivada
- `next.config.ts` - `experimental.serverActions.bodySizeLimit: "10mb"` (fix pós-checkpoint, `81cf8b5`)

## Decisions Made
- **`queryProducts` com duas queries separadas + join em memória** (não um único embed do Supabase) — mesma abordagem já estabelecida em `/produtos/[id]/editar/page.tsx`, escolhida por tipagem mais simples/segura do client Supabase tipado.
- **Task 2 comitou `page.tsx` sem renderizar `<ProductToolbar>` ainda** (só `searchParams -> queryProducts` funcional via URL manual), para manter a Task 2 verde isoladamente em `tsc`/`vitest` antes de a Task 3 criar o componente; a Task 3 então adicionou o import/render em `page.tsx` além dos dois arquivos listados em seus `files` — ajuste conectivo mínimo, não arquitetural.
- **Toolbar sem estado de filtro paralelo**: cada `onChange`/debounce reconstrói a URL inteira a partir de `currentParams` (prop derivada do `searchParams` real), nunca `useSearchParams()` — a URL é sempre a única fonte de verdade, satisfazendo o must_have "reabrir a URL filtrada reproduz a mesma visualização".
- **Fix pós-checkpoint do limite de corpo das Server Actions** (`81cf8b5`, aplicado pelo orquestrador): decisão de infraestrutura mínima e não-arquitetural (config do Next, não mudança de schema/fluxo) para destravar o próprio fluxo que o checkpoint estava validando no mobile.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, aplicado pelo orquestrador pós-checkpoint] Limite de corpo das Server Actions (1MB padrão) quebrava o cadastro real com fotos**
- **Found during:** Task 4 (checkpoint humano — teste real no mobile)
- **Issue:** O limite padrão de 1MB de corpo de Server Actions do Next.js é separado do limite de 5MB por foto já validado em `validatePhotoFile`; poucas fotos comprimidas a ~1MB cada somadas num único `saveProduct`/`updateProduct` excediam esse teto, falhando com "Body exceeded 1 MB limit."
- **Fix:** `experimental.serverActions.bodySizeLimit: "10mb"` adicionado a `next.config.ts`
- **Files modified:** `next.config.ts`
- **Commit:** `81cf8b5`

---

**Total deviations:** 1 auto-fixado (Rule 3, aplicado pelo orquestrador durante a pausa do checkpoint — não refeito nem revertido, conforme instrução)
**Impact on plan:** Correção essencial de infraestrutura para o próprio fluxo de cadastro com fotos funcionar na prática; sem mudança de escopo/produto.

## Issues Encountered

**Suíte completa `npm test` não fica verde no ambiente atual — bloqueador de infraestrutura pré-existente, não regressão desta wave.** Ao rodar a suíte inteira (108 testes/25 arquivos) para o gate do checkpoint, praticamente todo teste que faz `signUp` real falhou com `"Request rate limit reached"` — não só em `tests/products/`, mas em `tests/auth/`, `tests/onboarding/`, `tests/settings/`, `tests/rls/` também, confirmando que é puramente o rate-limit de signup do projeto Supabase remoto de teste (sem emulador local de Auth), já documentado desde o Plan 03-04. `tests/products/list-filter-sort.test.ts` (o arquivo desta plan) passa 1/1 de forma consistente quando rodado isolado, tanto logo após as Tasks 1-3 quanto em reruns posteriores. Tentativas de mitigação (aguardar o reset da cota + `--no-file-parallelism`) reduziram mas não eliminaram o problema para a suíte inteira — o volume total de `signUp`s da suíte completa excede a cota de burst do projeto de teste independente de paralelismo. Por instrução explícita do orquestrador, não foi tentado novamente após o checkpoint; documentado em `deferred-items.md` (commit `50b2892`) como bloqueador de infraestrutura recorrente (3ª vez nesta fase) — reforça a necessidade de um emulador local de Supabase Auth (ou seed via `service_role`) para a suíte de testes antes da próxima fase.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- **Fase 3 (CRUD de Produtos e Pipeline de Mídia) está completa** — todos os 6 plans executados e o checkpoint final (fluxo completo de CRUD no mobile) aprovado pelo usuário.
- `queryProducts` e o padrão de `searchParams` como fonte de verdade em `/produtos` são reutilizáveis como referência direta para a Fase 4 (vitrine pública, `VITR-02` — filtros por marca/solado/modalidade persistidos em query params), que consome o mesmo `status='published'` já estabelecido no Plan 03-05.
- Bloqueador de infraestrutura de testes (rate-limit de signup do Supabase Auth) permanece não resolvido — recomendado priorizar um emulador local de Auth (ou seed via `service_role`) antes que a suíte cresça mais nas próximas fases.
- Nenhum bloqueador de produto identificado para a Fase 4.

---
*Phase: 03-crud-de-produtos-e-pipeline-de-m-dia*
*Completed: 2026-07-13*

## Self-Check: PASSED

Todos os 6 arquivos criados/modificados confirmados em disco (`src/lib/products/list.ts`, `tests/products/list-filter-sort.test.ts`, `src/app/(admin)/produtos/page.tsx`, `src/app/(admin)/produtos/product-toolbar.tsx`, `src/app/(admin)/produtos/product-list.tsx`, `next.config.ts`); todos os commits (`4a68880`, `fec0de9`, `1aeae2d`, `50b2892`, `81cf8b5`) confirmados em `git log --oneline --all`.
