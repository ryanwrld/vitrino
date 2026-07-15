---
phase: 06-m-tricas-e-dashboard
plan: 02
subsystem: analytics
tags: [nextjs, react, supabase, server-actions, client-component]

# Dependency graph
requires:
  - phase: 06-01
    provides: "tabela pageviews + RLS (anon insert-only) + database.types.ts regenerado"
provides:
  - "logPageview(storeId, productId) — Server Action fire-and-forget que grava pageviews"
  - "PageviewTracker — Client Component invisível, usePathname-driven, monta 1x por navegação real"
  - "src/app/loja/[slug]/layout.tsx — resolve store_id pelo slug, monta o tracker sobre grid e detalhe"
affects: [06-03, dashboard, m-tricas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tracker client invisível montado em layout.tsx (não page.tsx) para sobreviver a mudança de searchParams"
    - "Server Action pública fire-and-forget: insert bare (sem select/single encadeado), try/catch só logando"

key-files:
  created:
    - src/lib/products/pageview-actions.ts
    - src/app/loja/[slug]/pageview-tracker.tsx
    - src/app/loja/[slug]/layout.tsx
  modified: []

key-decisions:
  - "Comentários de cabeçalho evitam a substring literal '.select(' e 'use cache' (mesmo quando descrevendo o que NÃO fazer) para não colidir com os greps de verify do próprio plano"

patterns-established:
  - "Pattern: captura de evento client-side em useEffect dentro de layout.tsx, nunca no corpo de um Server Component — protege contra inflação por crawlers de unfurling (WhatsApp/Facebook) que não executam JS"

requirements-completed: [MTR-01]

coverage:
  - id: D1
    description: "logPageview insere pageview (product_id null no grid, product_id no detalhe) de forma fire-and-forget, insert bare, nunca lança"
    requirement: "MTR-01"
    verification:
      - kind: unit
        ref: "grep automatizado (ausência de .select() encadeado, presença de \"use server\") + npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "PageviewTracker monta em layout.tsx (não page.tsx), reage a usePathname (não searchParams) — troca de filtro não gera novo pageview (D-02)"
    requirement: "MTR-01"
    verification:
      - kind: other
        ref: "npm run build (rota /loja/[slug] e /loja/[slug]/[produto] permanecem dinâmicas ƒ, sem cache)"
        status: pass
    human_judgment: true
    rationale: "Confirmação end-to-end de que trocar filtro não duplica o registro requer inspecionar o banco após navegação real — sem jsdom no projeto, não é automatizável nesta plan; registrado para o checkpoint manual de fim de fase (06-VERIFICATION.md)."
  - id: D3
    description: "Rota /loja/[slug] permanece pública, sem middleware/gate de auth, mesmo após introduzir layout.tsx"
    requirement: "MTR-01"
    verification:
      - kind: other
        ref: "grep (ausência de getUser()/redirect no layout) + npm run build (rota segue ƒ dinâmica sem proteção)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-15
status: complete
---

# Phase 06 Plan 02: Captura de Pageview na Vitrine Summary

**Server Action `logPageview` fire-and-forget + Client Component `PageviewTracker` (usePathname-driven) montado em `src/app/loja/[slug]/layout.tsx`, fechando a metade "coleta" de MTR-01**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-15T19:52:00Z
- **Completed:** 2026-07-15T19:53:35Z
- **Tasks:** 2
- **Files modified:** 3 (todos criados)

## Accomplishments
- `logPageview(storeId, productId)` grava uma linha em `pageviews` a cada carregamento real de rota da vitrine — `product_id` null no grid, preenchido no detalhe — sem nunca lançar exceção (contrato fire-and-forget, insert bare, mesma disciplina de `logOrderClick`)
- `PageviewTracker` (Client Component invisível) dispara o registro dentro de `useEffect` reagindo só a `usePathname()` — imune a crawlers de unfurling (que não executam JS) e a trocas de filtro/busca (que não mudam o pathname)
- Novo `src/app/loja/[slug]/layout.tsx` resolve `store_id` pelo slug uma única vez e monta o tracker sobre grid e detalhe, sem introduzir nenhum gate de auth/redirect — a vitrine pública continua inteiramente sem middleware

## Task Commits

Each task was committed atomically:

1. **Task 1: Server Action logPageview (fire-and-forget, anon insert)** - `5cab5e4` (feat)
2. **Task 2: PageviewTracker (client) + loja/[slug]/layout.tsx montando o tracker** - `f92c992` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/products/pageview-actions.ts` - Server Action `logPageview`, insert bare fire-and-forget em `pageviews`
- `src/app/loja/[slug]/pageview-tracker.tsx` - Client Component invisível, `useEffect` sobre `usePathname()`, deriva `productId` do pathname
- `src/app/loja/[slug]/layout.tsx` (novo) - Server Component que resolve `store_id` pelo slug e monta `<PageviewTracker>`

## Decisions Made
- Comentários de cabeçalho de ambos os arquivos evitam usar a substring literal `.select(` e `use cache` mesmo em prosa descritiva ("o que NÃO fazer"), porque os comandos `<verify><automated>` do próprio plano fazem grep textual ingênuo sobre o arquivo inteiro (incluindo comentários) — reformulado para "sem encadear select ou single" / "diretiva de cache do App Router" para não colidir com os greps sem perder a explicação do contrato.

## Deviations from Plan

None - plan executado exatamente como escrito. As duas tasks seguiram o `<action>` do plano ponto a ponto (mesma assinatura de função, mesmo formato de comentário de cabeçalho, mesma derivação de `productId` a partir do pathname); o único ajuste foi de fraseado em comentários (ver Decisões Feitas acima), não de comportamento.

## Issues Encountered
- `npx tsc --noEmit` reporta 2 erros pré-existentes em `tests/supabase/server-cookies.test.ts` (documentados em STATE.md/04 SUMMARY como não relacionados a nenhum plano específico) — confirmado que nenhum erro novo foi introduzido por este plano (checagem isolando os arquivos deste plano ficou limpa).
- `npm test` completo tem 25/37 arquivos falhando por ausência de `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` neste worktree (env não configurado) — bloqueador de infraestrutura pré-existente (variação do blocker já registrado em STATE.md sobre a suíte de testes/Supabase), fora do escopo deste plano; os 56 testes que conseguiram rodar (12 arquivos) passaram 100%.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- A metade "coleta" de MTR-01 está pronta: toda visita real à vitrine grava uma linha em `pageviews`. O Plan 06-03 (dashboard) pode consumir essas linhas via as views de agregação de 06-01 (`product_pageview_counts`) sem trabalho adicional de captura.
- Verificação manual de D-02 (trocar filtro não duplica o registro) fica registrada para o checkpoint de fim de fase (06-VERIFICATION.md), já que o projeto não tem jsdom para automatizar esse cenário de navegação client-side.

---
*Phase: 06-m-tricas-e-dashboard*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created files found on disk; both task commits (5cab5e4, f92c992) verified present in git log.
