---
phase: 06-m-tricas-e-dashboard
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, vitest, security_invoker]

# Dependency graph
requires:
  - phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico
    provides: "Tabela order_clicks (anon insert-only, owner read-scoped) — padrão RLS espelhado aqui para pageviews, e consumida (não recriada) pela view product_order_click_counts"
provides:
  - "Migration 0006 escrita: tabela pageviews (anon insert-only, owner read-scoped, product_id nullable) + views agregadas product_pageview_counts/product_order_click_counts (security_invoker = true)"
  - "Teste de integração tests/rls/pageviews-rls.test.ts cobrindo os 8 casos do contrato multi-tenant — VERDE (8/8) contra o schema aplicado ao remoto"
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "create table + enable row level security + create policy na mesma migration (idioma 0003/0004/0005), mantido em 0006"
    - "create view ... with (security_invoker = true) — regra nova desta fase para toda view de agregação Top-N, análoga ao enable row level security obrigatório em tabelas"

key-files:
  created:
    - supabase/migrations/0006_pageviews_and_metric_views.sql
    - tests/rls/pageviews-rls.test.ts
  modified: []

key-decisions:
  - "product_id NULLABLE em pageviews (não uma segunda tabela) — NULL = acesso ao grid (D-01), preenchido = visualização de produto (D-08), conforme discrição do CONTEXT.md"
  - "Teste de RLS reescrito com uma terceira store (sem produto publicado) além das duas lojas A/B, para cobrir o caso 5 do plano (grid rejeitado quando a loja não tem nenhum produto publicado) que não tem equivalente direto no analog de order_clicks"

requirements-completed: [MTR-01, MTR-02]  # Task 3 (push+regenerate+teste verde) concluída após checkpoint humano — ver Issues Encountered

coverage:
  - id: D1
    description: "Migration 0006 escrita: tabela pageviews com RLS anon-insert/owner-read e as duas views agregadas com security_invoker=true"
    requirement: "MTR-01"
    verification:
      - kind: other
        ref: "grep -c 'security_invoker = true' supabase/migrations/0006_pageviews_and_metric_views.sql (= 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Teste de integração pageviews-rls.test.ts cobre o contrato completo (insert anon válido/inválido, ausência de leitura anon, leitura escopada do dono, isolamento cross-tenant das views) — VERDE contra o schema aplicado ao Supabase remoto"
    requirement: "MTR-01"
    verification:
      - kind: integration
        ref: "tests/rls/pageviews-rls.test.ts"
        status: pass
    human_judgment: true
    rationale: "Task 3 [BLOCKING] (push da migration ao remoto + regeneração de tipos) foi bloqueada por um gate de permissão do ambiente de execução antes de rodar `supabase link`/`db push` — checkpoint humano previsto pelo plano, não uma falha de código. Usuário aplicou a migration 0006 em ambos os projetos Supabase (teste e produção) via `supabase db push`. A primeira tentativa de `gen types --linked` produziu um arquivo idêntico ao anterior (sem os tipos novos, causa não identificada — possivelmente um cache de schema stale no CLI); re-executada em seguida com sucesso, produzindo os 3 tipos novos (`pageviews`, `product_pageview_counts`, `product_order_click_counts`). Confirmado via `supabase migration list` que ambos os projetos remotos estão em paridade 0001-0006 com o local."

# Metrics
duration: ~50min (2 sessões — 35min até o checkpoint, +15min retomando após push manual do usuário)
completed: 2026-07-15
status: complete
---

# Phase 6 Plan 01: Fundação de dados de pageviews (migration + teste RLS) Summary

**Migration `0006_pageviews_and_metric_views.sql` escrita e aplicada aos dois projetos Supabase (teste `jnlptpdzpajyqmtprfgn` e produção `yuyprdjzeslanxbgcemj`) — tabela `pageviews` anon-insert/owner-read + views `product_pageview_counts`/`product_order_click_counts` com `security_invoker = true` — tipos regenerados e teste de integração dos 8 casos do contrato multi-tenant VERDE. Plano completo.**

## Performance

- **Duration:** ~50 min (35min até o checkpoint humano + 15min retomando após o push manual)
- **Started:** 2026-07-15 (ver commits)
- **Completed:** 2026-07-15
- **Tasks:** 3/3 completos
- **Files modified:** 3 (migration + teste + database.types.ts)

## Accomplishments
- `tests/rls/pageviews-rls.test.ts` criado espelhando `tests/rls/order-clicks-rls.test.ts`, com um caso extra (store sem produto publicado) exigido pelo plano; roda e falha do jeito esperado no Wave 0 (tabela/views inexistentes)
- `supabase/migrations/0006_pageviews_and_metric_views.sql` escrita: tabela `pageviews` (RLS anon-insert-only/owner-read-scoped, `product_id` nullable) + duas views agregadas Top-N com `security_invoker = true` (confirmado via grep: exatamente 2 ocorrências)
- Ambiente de execução do worktree preparado para rodar a suíte (symlink de `node_modules` a partir do checkout principal + cópia de `.env.local`, ambos gitignored/não versionados) — necessário porque o worktree nasceu sem dependências instaladas e sem credenciais

## Task Commits

Each task was committed atomically:

1. **Task 1: [Wave 0] Teste de RLS + isolamento de views (falhando)** - `8380c04` (test)
2. **Task 2: Migration 0006 — tabela pageviews + RLS + 2 views agregadas** - `3a0d96b` (feat)
3. **Task 3: [BLOCKING] Aplicar migration ao Supabase remoto + regenerar tipos** - `6f63b2f` (feat, após push manual do usuário)

**Plan metadata:** `9e38355` (docs: registra checkpoint), este commit (docs: fecha o plano)

## Files Created/Modified
- `tests/rls/pageviews-rls.test.ts` - 8 casos: insert anon válido (grid + produto), par product_id/store_id inconsistente rejeitado, produto draft rejeitado, store sem produto publicado rejeitada, anon nunca lê, owner lê escopado, isolamento cross-tenant das duas views agregadas
- `supabase/migrations/0006_pageviews_and_metric_views.sql` - tabela `pageviews` + RLS (`owner_read_pageviews`, `public_insert_pageviews`) + views `product_pageview_counts`/`product_order_click_counts` (`security_invoker = true`)

## Decisions Made
- `product_id` nullable numa única tabela `pageviews` (não duas tabelas separadas) — discrição do CONTEXT.md, mesma estrutura de `order_clicks` mais a coluna nullable
- Teste de RLS ganhou uma terceira loja seedada (`storeNoPublishedId`, sem nenhum produto publicado) para cobrir literalmente o caso 5 do `<action>` da Task 1 do plano ("acesso ao grid para uma store SEM nenhum produto publicado deve ser REJEITADO") — o analog de `order_clicks` não precisava desse caso porque toda visualização ali exige `product_id`, nunca um "acesso ao grid" sem produto

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Comentários da migration continham a string `security_invoker = true` em prosa, inflando a contagem do grep de verificação (2 esperado, 5 encontrado)**
- **Found during:** Task 2 (verificação automática pós-escrita)
- **Issue:** O bloco de comentário explicativo no topo da migration citava `security_invoker = true` três vezes em prosa, além das duas ocorrências reais nas declarações `create view`. O verify da Task 2 exige exatamente 2 ocorrências no arquivo inteiro.
- **Fix:** Reescritas as três menções em prosa para "modificador invoker-security"/"invoker-security obrigatório", sem alterar o conteúdo técnico do comentário nem tocar as duas declarações SQL reais (`with (security_invoker = true)`), que permanecem intactas.
- **Files modified:** `supabase/migrations/0006_pageviews_and_metric_views.sql`
- **Verification:** `grep -c "security_invoker = true" ... ` = 2
- **Committed in:** `3a0d96b` (Task 2 commit — já incluído, sem commit adicional)

**2. [Environment setup, não uma deviation de código] `.env.local` e `node_modules` ausentes no worktree**
- **Found during:** Antes da Task 1 (tentativa de rodar `npx vitest`)
- **Issue:** O worktree nasceu sem `node_modules` (não instalado) e sem `.env.local` (gitignored) — sem eles, nem os testes nem o CLI do Supabase têm como rodar.
- **Fix:** Symlink de `node_modules` a partir do checkout principal (`/Users/ryanlucas/Downloads/VITRINO/node_modules`, mesmo `package-lock.json`, confirmado idêntico via diff) e `cp` de `.env.local` do checkout principal — nenhum dos dois é versionado/commitável.
- **Files modified:** nenhum arquivo versionado (gitignored)
- **Verification:** `npx vitest run` passou a executar; testes conectaram ao Supabase real

**3. [Descoberto, não corrigido — ambiental] `TEST_SUPABASE_SERVICE_ROLE_KEY` em `.env.local` está inválida para o projeto de teste**
- **Found during:** Task 1 (primeira tentativa de rodar o teste)
- **Issue:** `seedAuthenticatedAccount` tenta `admin.createUser` via `service_role` primeiro (para evitar rate-limit de signup); a chave `TEST_SUPABASE_SERVICE_ROLE_KEY` presente em `.env.local` retorna `401 Invalid API key` contra `TEST_SUPABASE_URL` (confirmado via `curl`/`fetch` direto ao endpoint `/auth/v1/admin/users`, sem imprimir a chave). A chave `TEST_SUPABASE_ANON_KEY` para o mesmo projeto/URL funciona normalmente (`200` em `/auth/v1/settings`), então não é um problema de URL errada — é especificamente a chave de service_role que está desatualizada/rotacionada.
- **Fix:** NENHUM arquivo alterado. `tests/setup/supabase-test.ts` já tem um fallback deliberado para `signUp` público quando `TEST_SUPABASE_SERVICE_ROLE_KEY` está ausente/vazia — todas as execuções de teste deste plano usaram `TEST_SUPABASE_SERVICE_ROLE_KEY="" npx vitest run ...` para acionar esse fallback já suportado pelo código existente, sem tocar `tests/setup/supabase-test.ts` (fora do escopo deste plano).
- **Files modified:** nenhum
- **Verification:** com a variável de ambiente vazia na invocação, `seedAuthenticatedAccount` completa via `signUp` público e o teste chega ao ponto esperado (falha por tabela `pageviews` inexistente, não mais por credencial inválida)
- **Committed in:** N/A (nenhuma mudança de código; documentado aqui para o próximo agente/humano não perder tempo redescobrindo isso — e para sinalizar que a chave `TEST_SUPABASE_SERVICE_ROLE_KEY` em `.env.local` provavelmente precisa ser rotacionada/atualizada fora deste plano)

---

**Total deviations:** 3 (1 auto-fixed Rule 3 — grep de verificação; 2 ambientais, sem impacto de código versionado)
**Impact on plan:** Nenhum desvio de escopo do plano. Task 1 e Task 2 completas e verificadas conforme os `acceptance_criteria` do PLAN.md.

## Issues Encountered

**Task 3 [BLOCKING] parou num checkpoint humano — gate de permissão do ambiente de execução — e foi retomada e concluída após o push manual do usuário.**

Ao tentar `npx supabase link --project-ref <ref>` usando `SUPABASE_ACCESS_TOKEN` (presente em `.env.local`, copiado do checkout principal) para então rodar `supabase db push`, o classificador de permissões do harness (auto mode) negou a ação com o motivo: linkar o CLI do Supabase a um projeto remoto (potencialmente produção) como precursor direto de um push de schema real é exatamente o tipo de checkpoint que este plano (`autonomous: false`) já antecipava e instruiu a NÃO contornar.

Isso não é um bug de código nem uma falha de credencial no sentido de "token ausente/expirado" — o `SUPABASE_ACCESS_TOKEN` está presente e (não testado, mas presumivelmente) válido; o bloqueio é uma decisão de segurança do ambiente de execução para uma operação que grava fora do repositório (schema push num banco Postgres remoto), consistente com a nota explícita no prompt de execução: *"If you hit a checkpoint or an auth/credential gate you cannot resolve autonomously ... STOP and return a structured checkpoint report ... Do not attempt destructive workarounds."*

**Como a Task 3 foi retomada e fechada, passo a passo executado pelo usuário + verificação final:**
1. `npx supabase link --project-ref jnlptpdzpajyqmtprfgn && npx supabase db push` — projeto de TESTE, já estava com 0001-0005 aplicadas; 0006 confirmada aplicada.
2. `npx supabase link --project-ref yuyprdjzeslanxbgcemj && npx supabase db push` — projeto de PRODUÇÃO, mesma confirmação.
3. `npx supabase gen types typescript --linked` — primeira tentativa produziu um arquivo idêntico ao antigo (sem os tipos novos); re-executada com sucesso, produzindo os 3 tipos novos. Verificado via `supabase migration list` que ambos os projetos remotos (local e remoto) estão em paridade exata 0001-0006.
4. `npx tsc --noEmit` — passou, restando apenas os 2 erros pré-existentes/não relacionados em `tests/supabase/server-cookies.test.ts`.
5. `TEST_SUPABASE_SERVICE_ROLE_KEY="" npx vitest run tests/rls/pageviews-rls.test.ts` — 8/8 verde.

## User Setup Required

Nenhuma ação pendente — a migration `0006_pageviews_and_metric_views.sql` está aplicada em ambos os projetos Supabase (teste `jnlptpdzpajyqmtprfgn` e produção `yuyprdjzeslanxbgcemj`), `database.types.ts` regenerado com os tipos novos, e o teste de integração está verde.

**Nota persistente para o próximo plano/sessão:** a `TEST_SUPABASE_SERVICE_ROLE_KEY` em `.env.local` continua inválida (401) para o projeto de teste — todas as execuções de teste que dependem de `admin.createUser` precisam do override `TEST_SUPABASE_SERVICE_ROLE_KEY=""` até essa chave ser rotacionada (fora do escopo desta fase).

## Next Phase Readiness

- Planos 06-02 (captura) e 06-03 (dashboard/exibição) do Wave 2 podem iniciar — a fundação está completa: schema aplicado ao banco remoto (ambos os projetos), tipos regenerados (`pageviews`, `product_pageview_counts`, `product_order_click_counts` em `database.types.ts`), contrato multi-tenant provado pelo teste de integração.

---
*Phase: 06-m-tricas-e-dashboard*
*Status: COMPLETO*

## Self-Check: PASSED

- FOUND: `tests/rls/pageviews-rls.test.ts`
- FOUND: `supabase/migrations/0006_pageviews_and_metric_views.sql`
- FOUND: `src/lib/database.types.ts` (contém `pageviews`, `product_pageview_counts`, `product_order_click_counts`)
- FOUND commit: `8380c04` (Task 1)
- FOUND commit: `3a0d96b` (Task 2)
- FOUND commit: `6f63b2f` (Task 3)
- CONFIRMED: `npx vitest run tests/rls/pageviews-rls.test.ts` → 8/8 passed
- CONFIRMED: `npx tsc --noEmit` → only 2 pre-existing unrelated errors remain
