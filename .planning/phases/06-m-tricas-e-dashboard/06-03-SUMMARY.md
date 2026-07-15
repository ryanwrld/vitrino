---
phase: 06-m-tricas-e-dashboard
plan: 03
subsystem: ui
tags: [nextjs, supabase, dashboard, aggregation, lucide-react]

requires:
  - phase: 06-01
    provides: "migration 0006 (tabela pageviews + views agregadas product_pageview_counts/product_order_click_counts, security_invoker=true) e database.types.ts regenerado"
provides:
  - "src/lib/dashboard/metrics.ts — queryAccessCount/queryTopViewedProducts/queryTopOrderClickProducts"
  - "/dashboard reescrito com 4 stat cards, produtos recentes e 2 listas Top-10 paralelas com dados reais"
affects: ["06-04 (layout de sidebar/(painel), troca de <main> por <div> nesta mesma página)"]

tech-stack:
  added: []
  patterns:
    - "Funções de agregação puras recebendo supabase autenticado (nunca criam client próprio) — mesma disciplina de queryProducts"
    - "Join em memória view->products para resolver nomes, nunca embutido na view (map id->produto)"
    - "limit(10) literal fixo no código, nunca parametrizado por input do usuário (V5/D-10)"

key-files:
  created:
    - src/lib/dashboard/metrics.ts
    - tests/dashboard/metrics-aggregation.test.ts
  modified:
    - src/app/(admin)/dashboard/page.tsx

key-decisions:
  - "Ícone/número das stat cards seguem a granularidade do 06-UI-SPEC.md Component Specifications (Total de produtos e Acessos: ícone #000000; Disponíveis: #0D21A1; Esgotados: #6B6B6B), mais específico que a cor única citada no texto do PLAN.md Task 3"
  - "Botão 'Sair da conta' e link de navegação 'Produtos' do placeholder anterior foram removidos desta página — o PLAN.md Task 3 não pede para preservá-los, e a navegação/logout chega formalmente via AdminSidebar no Plan 06-04"

requirements-completed: [MTR-01, MTR-02]

coverage:
  - id: D1
    description: "queryAccessCount conta só acessos ao grid (product_id null), nunca visualizações de produto (D-01)"
    requirement: "MTR-01"
    verification:
      - kind: integration
        ref: "tests/dashboard/metrics-aggregation.test.ts#queryAccessCount conta só os acessos ao grid (product_id null), nunca visualizações de produto (D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "queryTopViewedProducts/queryTopOrderClickProducts retornam Top-10 ordenado desc, truncado em 10, com nome resolvido via join em memória, ranking independente entre as duas listas"
    requirement: "MTR-01"
    verification:
      - kind: integration
        ref: "tests/dashboard/metrics-aggregation.test.ts#queryTopViewedProducts retorna no máx 10 itens ordenados desc por views, truncando os 2 produtos com menos views"
        status: pass
      - kind: integration
        ref: "tests/dashboard/metrics-aggregation.test.ts#queryTopOrderClickProducts retorna no máx 10 itens ordenados desc por clicks, ranking independente do de views"
        status: pass
    human_judgment: false
  - id: D3
    description: "Isolamento cross-tenant das três funções de agregação mesmo passando explicitamente o storeId de outra loja"
    requirement: "MTR-01"
    verification:
      - kind: integration
        ref: "tests/dashboard/metrics-aggregation.test.ts#isolamento cross-tenant: nenhuma das três funções retorna dado de outra loja mesmo passando o storeId da Loja B"
        status: pass
    human_judgment: false
  - id: D4
    description: "/dashboard exibe 4 stat cards (Total de produtos, Disponíveis, Esgotados, Acessos), sempre numéricos mesmo em loja nova, derivados de queryProducts + queryAccessCount"
    requirement: "MTR-02"
    verification:
      - kind: unit
        ref: "grep automatizado (queryTopViewedProducts/queryTopOrderClickProducts/requireCompletedOnboarding presentes) + npx tsc --noEmit + npm run build"
        status: pass
    human_judgment: true
    rationale: "Renderização visual real dos 4 cards com valores agregados corretos (contagens/cores/empty states) não é coberta por teste automatizado de DOM (projeto sem jsdom/@testing-library, disciplina de checkpoint humano das Fases 3-5) — verificação visual fica para o checkpoint de fim de fase"
  - id: D5
    description: "'Produtos recentes' (5 mais recentes) e as duas listas Top-10 paralelas ('Mais visualizados'/'Cliques no WhatsApp') renderizam com empty states verbatim do 06-UI-SPEC.md"
    requirement: "MTR-01"
    verification:
      - kind: unit
        ref: "grep automatizado ('Mais visualizados'/'Cliques no WhatsApp' presentes) + npx tsc --noEmit + npm run build + tests/ui/dark-mode-contrast.test.ts"
        status: pass
    human_judgment: true
    rationale: "Copy/layout visual e comportamento dos empty states (0 produtos, 0 views, 0 cliques) requerem inspeção humana — mesma disciplina das Fases 3-5, projeto sem jsdom/@testing-library"

duration: 12min
completed: 2026-07-15
status: complete
---

# Phase 06 Plan 03: Módulo de Agregação de Métricas + Dashboard Summary

**Módulo `metrics.ts` (contagem de acessos ao grid + duas listas Top-10 via views agregadas com join de nomes em memória) e reescrita completa de `/dashboard` com 4 stat cards, produtos recentes e as duas listas Top-10 paralelas, com dados reais e empty states corretos.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 3 (1 novo módulo, 1 teste novo, 1 página reescrita)

## Accomplishments
- `src/lib/dashboard/metrics.ts` entrega `queryAccessCount` (só `product_id is null`, D-01), `queryTopViewedProducts` e `queryTopOrderClickProducts` (Top-10 via `product_pageview_counts`/`product_order_click_counts`, `limit(10)` fixo, join em memória com `products` para nomes — nunca embutido na view)
- `/dashboard` reescrito do zero: 4 stat cards (Total de produtos/Disponíveis/Esgotados/Acessos, sempre numéricos), lista de 5 produtos recentes (reaproveitando o shell visual de `product-list.tsx`, sem editar/excluir), e duas listas Top-10 SEPARADAS e paralelas (Mais visualizados / Cliques no WhatsApp, D-08/D-09 — nunca fundidas)
- `tests/dashboard/metrics-aggregation.test.ts` prova, contra Supabase real: contagem exata de acessos ao grid, ordenação desc + truncamento em exatamente 10 (seed de 12 produtos com contagens distintas), ranking independente entre views e cliques (ordens invertidas propositalmente), e isolamento cross-tenant das três funções
- `requireCompletedOnboarding()` preservado como primeira linha; raiz continua `<main className="bg-white ...">` — `tests/ui/dark-mode-contrast.test.ts` permanece verde (o layout de sidebar só chega no Plan 06-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: [Wave 0] Teste de agregação de métricas (falhando)** - `2cb6370` (test)
2. **Task 2: Módulo metrics.ts (acessos + Top-10 via views + join de nomes)** - `3e5e7f9` (feat)
3. **Task 3: Reescrever dashboard/page.tsx (cards + recentes + 2 Top-10)** - `1722bd5` (feat)

_Nenhuma task teve commit de refactor separado — não houve limpeza pós-GREEN necessária além do já entregue nos commits feat._

## Files Created/Modified
- `src/lib/dashboard/metrics.ts` - Agregações puras: `queryAccessCount`, `queryTopViewedProducts`, `queryTopOrderClickProducts` (+ tipos `TopViewedProduct`/`TopOrderClickProduct`)
- `tests/dashboard/metrics-aggregation.test.ts` - Teste de integração (Supabase real) cobrindo contagem/ordenação/truncamento/isolamento
- `src/app/(admin)/dashboard/page.tsx` - Reescrito: 4 stat cards, produtos recentes, 2 listas Top-10 paralelas, empty states

## Decisions Made
- Cores de ícone das stat cards seguem a granularidade mais específica do `06-UI-SPEC.md` §Component Specifications (Total de produtos e Acessos usam ícone `#000000`; Disponíveis usa `#0D21A1`; Esgotados usa `#6B6B6B`) em vez da descrição mais solta do texto do Task 3 do PLAN.md — o UI-SPEC é a fonte de verdade mais detalhada para este ponto e não há conflito de intenção entre os dois documentos.
- O botão "Sair da conta" e o link "Produtos" do placeholder anterior de `/dashboard` foram removidos nesta reescrita (o PLAN.md Task 3 não pede para preservá-los, e ambos retornam formalmente via `AdminSidebar` no Plan 06-04, que já está mapeado em `06-PATTERNS.md`).

## Deviations from Plan

None — plano executado exatamente como escrito. Nenhuma issue de Rule 1/2/3/4 foi encontrada nesta fatia (o schema/RLS/views já existiam prontos da Plan 06-01).

## Issues Encountered
- `.env.local` e `node_modules` não existiam neste worktree paralelo (git worktree não copia arquivos ignorados/gitignore) — copiado `.env.local` da raiz do repo (nunca commitado, permanece fora do git) e rodado `npm install` antes de executar qualquer teste. Nenhum impacto no código entregue.
- A chave `TEST_SUPABASE_SERVICE_ROLE_KEY` copiada da raiz do repo retorna "Invalid API key" ao chamar `admin.createUser` (provável rotação/migração para o novo formato `sb_secret_*` no dashboard do Supabase, já que a anon key do mesmo projeto já está no formato novo `sb_publishable_*`). Os testes deste plano (`tests/dashboard/metrics-aggregation.test.ts`) passam normalmente com o fallback de `signUp` público (sem a service role key) — 4/4 testes verdes, sem rate-limit neste volume de contas. Isso é uma variante do blocker já documentado em STATE.md ("Suíte completa `npm test` não fica verde por rate-limit de signup do Supabase Auth") — a suíte completa (`npm test`) segue com falhas pré-existentes e não relacionadas a este plano em `tests/auth/*`, `tests/onboarding/*`, `tests/products/{availability,create-product,edit-delete-product,hide-when-sold-out,photo-upload}.test.ts`, `tests/settings/*` e `tests/storefront/load-more-pagination.test.ts` — todas por "Request rate limit reached" do GoTrue, nenhuma tocando arquivos deste plano. `tests/dashboard/metrics-aggregation.test.ts`, `tests/ui/dark-mode-contrast.test.ts`, `tests/rls/pageviews-rls.test.ts`, `tests/rls/order-clicks-rls.test.ts` e `tests/products/list-filter-sort.test.ts` (as 5 suítes diretamente relevantes a este plano) rodam 26/26 verdes quando executadas isoladamente com a chave de service role desabilitada.

## User Setup Required

None — nenhuma configuração externa nova. A `TEST_SUPABASE_SERVICE_ROLE_KEY` desatualizada em `.env.local` (ver Issues Encountered) é um item de manutenção de ambiente de teste local, não um requisito de setup deste plano.

## Next Phase Readiness
- `/dashboard` está pronto e funcional com dados reais de produtos/métricas; MTR-01 e MTR-02 entregues nesta única página (D-04)
- Plan 06-04 pode prosseguir: vai introduzir `(admin)/(painel)/layout.tsx` + `AdminSidebar`, mover `dashboard/page.tsx` para o grupo aninhado e trocar a raiz `<main>` por `<div>`/`<section>` (repontando `tests/ui/dark-mode-contrast.test.ts` para o novo layout, conforme já mapeado em `06-PATTERNS.md`)
- Recomenda-se, fora do escopo deste plano, atualizar `TEST_SUPABASE_SERVICE_ROLE_KEY` em `.env.local` (projeto de teste) para o novo formato de chave do Supabase — mitigaria o "Request rate limit reached" generalizado na suíte completa

## Self-Check: PASSED

- FOUND: src/lib/dashboard/metrics.ts
- FOUND: tests/dashboard/metrics-aggregation.test.ts
- FOUND: src/app/(admin)/dashboard/page.tsx
- FOUND commit: 2cb6370
- FOUND commit: 3e5e7f9
- FOUND commit: 1722bd5

---
*Phase: 06-m-tricas-e-dashboard*
*Completed: 2026-07-15*
