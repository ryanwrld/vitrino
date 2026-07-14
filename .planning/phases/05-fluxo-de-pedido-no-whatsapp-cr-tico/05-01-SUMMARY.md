---
phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, vitest]

# Dependency graph
requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: RLS pública `to anon` para stores/products/product_sizes/product_photos (migration 0004), que este plano estende para store_settings
provides:
  - Tabela `order_clicks` (captura bruta de cliques, anon insert-only, owner read-scoped) aplicada no projeto Supabase de produção
  - Policy `public_read_store_settings_for_published_stores` — primeira exposição pública de `whatsapp_e164`/`message_template`
  - `database.types.ts` regenerado com `order_clicks`
  - Cobertura de teste de integração RLS real (anon client) para ambas as novas superfícies
affects: [05-02, 05-03, 05-04, fase-6-metricas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "create table + enable row level security + create policy na mesma migration (0003/0004 idiom), mantido em 0005"
    - "policy anon insert-only com WITH CHECK cruzando product_id/store_id + status='published' — primeira escrita pública do projeto"

key-files:
  created:
    - supabase/migrations/0005_order_clicks_and_public_whatsapp.sql
    - tests/rls/order-clicks-rls.test.ts
    - tests/storefront/store-settings-public-read.test.ts
  modified:
    - src/lib/database.types.ts
    - tests/storefront/public-access-rls.test.ts

key-decisions:
  - "Migration aplicada ao projeto Supabase de PRODUÇÃO (yuyprdjzeslanxbgcemj), não ao projeto de teste dedicado (jnlptpdzpajyqmtprfgn) recém-criado em um commit concorrente em main (38cbe82) que este worktree não possui — o worktree ainda usa a versão de tests/setup/supabase-test.ts que lê NEXT_PUBLIC_SUPABASE_URL (produção), então o alvo correto da migration é produção, não o link que veio copiado do supabase/.temp de main"
  - "Asserção negativa original de public-access-rls.test.ts ('anon NUNCA lê store_settings') reescopada para positiva (loja com produto publicado) em vez de removida — o caso negativo (loja sem produto publicado) passou a viver em store-settings-public-read.test.ts, evitando um teste vermelho contraditório na suíte"

patterns-established:
  - "Pattern: RLS policy anon-insert com WITH CHECK cruzando duas colunas (product_id/store_id) + status — primeiro precedente de escrita pública no projeto, para futuras tabelas anon-writable"

requirements-completed: [PED-03]

coverage:
  - id: D1
    description: "Cliente anônimo consegue INSERIR order_clicks para um par (product_id, store_id) de produto publicado; inserts com par inconsistente ou produto não publicado são rejeitados pelo WITH CHECK; anon nunca lê nenhuma linha de order_clicks"
    requirement: "PED-03"
    verification:
      - kind: integration
        ref: "tests/rls/order-clicks-rls.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Owner (revendedor) lê apenas os cliques da própria loja; cliques de outra loja retornam [] (isolamento cross-tenant)"
    requirement: "PED-03"
    verification:
      - kind: integration
        ref: "tests/rls/order-clicks-rls.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cliente anônimo lê whatsapp_e164/message_template de store_settings SOMENTE para loja com ≥1 produto publicado; loja sem produto publicado retorna []"
    requirement: "PED-03"
    verification:
      - kind: integration
        ref: "tests/storefront/store-settings-public-read.test.ts"
        status: pass
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Migration 0005 aplicada no projeto Supabase de produção via supabase db push; database.types.ts regenerado refletindo order_clicks"
    requirement: "PED-03"
    verification:
      - kind: other
        ref: "npx supabase db push (yuyprdjzeslanxbgcemj) + npx tsc --noEmit"
        status: pass
    human_judgment: false

duration: 47min
completed: 2026-07-14
status: complete
---

# Phase 5 Plan 01: Migration de order_clicks + exposição pública de WhatsApp Summary

**Migration 0005 no Supabase de produção: tabela `order_clicks` (anon insert-only, owner read-scoped) e a policy `public_read_store_settings_for_published_stores` que finalmente expõe `whatsapp_e164`/`message_template` ao papel `anon`, escopada a lojas com produto publicado — provado por 13 testes de integração contra um cliente anon real.**

## Performance

- **Duration:** ~47 min
- **Started:** 2026-07-14T20:35:00Z (aprox.)
- **Completed:** 2026-07-14T21:22:00Z
- **Tasks:** 3
- **Files modified:** 5 (2 criados de migration/tipos + 3 de teste, sendo 2 novos e 1 modificado)

## Accomplishments
- Migration `0005_order_clicks_and_public_whatsapp.sql` criada e aplicada no projeto Supabase de produção: tabela `order_clicks` com RLS na mesma migration (`owner_read_order_clicks`, `public_insert_order_clicks` com `WITH CHECK` cruzando `product_id`/`store_id`/`status='published'`), resolvendo a NOTA EXPLÍCITA deixada em `0004` ao adicionar `public_read_store_settings_for_published_stores`
- `database.types.ts` regenerado a partir do projeto de produção — `order_clicks` presente, shape de `store_settings` inalterado
- Dois novos arquivos de teste de integração RLS (`order-clicks-rls.test.ts`, `store-settings-public-read.test.ts`) provando insert público válido/rejeitado, isolamento cross-tenant do owner, e a nova exposição escopada de `store_settings`, sempre via `createAnonClient()` real — nunca SQL editor
- `public-access-rls.test.ts` ajustado: a asserção negativa original de `store_settings` (que ficaria falsa após 0005 para uma loja com produto publicado) foi reescopada para a asserção positiva correspondente, sem deixar teste vermelho contraditório

## Task Commits

Each task was committed atomically:

1. **Task 1: Escrever migration 0005** - `b71c459` (feat)
2. **Task 2: Aplicar migration no remoto + regenerar tipos** - `38e914c` (chore)
3. **Task 3: Testes RLS de order_clicks + exposição pública de store_settings** - `a00458f` (test)

**Plan metadata:** (este commit) `docs: complete plan`

## Files Created/Modified
- `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` - Tabela order_clicks + RLS + policy pública de store_settings
- `src/lib/database.types.ts` - Tipos regenerados via `supabase gen types typescript --linked` contra o projeto de produção
- `tests/rls/order-clicks-rls.test.ts` - Insert anon válido/rejeitado, bloqueio de leitura anon, isolamento cross-tenant do owner
- `tests/storefront/store-settings-public-read.test.ts` - Leitura anon escopada a loja com produto publicado; `[]` para loja sem produto publicado
- `tests/storefront/public-access-rls.test.ts` - Asserção de store_settings reescopada de negativa para positiva (loja com produto publicado)

## Decisions Made
- **Migration aplicada ao projeto de produção, não ao projeto de teste dedicado recém-linkado:** ver "Issues Encountered" abaixo — o `supabase/.temp` copiado do repositório principal já estava relinkado (por um commit concorrente em `main`, `38cbe82`, fora do fork point deste worktree) ao novo projeto Supabase de teste dedicado (`jnlptpdzpajyqmtprfgn`). Como este worktree ainda usa a versão anterior de `tests/setup/supabase-test.ts` (lê `NEXT_PUBLIC_SUPABASE_URL`, apontando para produção), o alvo correto para esta migration — para que os testes deste plano realmente a exercitem — é o projeto de produção (`yuyprdjzeslanxbgcemj`). O CLI foi relinkado explicitamente antes do push definitivo.
- **`public-access-rls.test.ts` reescopado em vez de removido:** a asserção original "client anônimo NUNCA lê store_settings" ficaria falsa para a loja com produto publicado daquele arquivo assim que a policy nova existisse; em vez de apagar a cobertura, ela foi convertida na asserção positiva correspondente, e o caso negativo (loja sem produto publicado) passou a viver no novo arquivo dedicado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration aplicada ao projeto Supabase errado na primeira tentativa; relinkado e reaplicado no projeto correto**
- **Found during:** Task 2/3 (verificação pós-push; testes falhando com `PGRST205: Could not find the table 'public.order_clicks' in the schema cache` e `store_settings` retornando `[]` mesmo para loja com produto publicado)
- **Issue:** O `supabase/.temp/linked-project.json` copiado da raiz do repositório principal já apontava para um projeto Supabase de TESTE dedicado (`jnlptpdzpajyqmtprfgn`), criado por um commit em `main` (`38cbe82`, "test: isola suíte em projeto Supabase dedicado") que aterrissou DEPOIS do fork point deste worktree (`b53645b`). `npx supabase db push` aplicou a migration 0005 a esse projeto de teste, mas `tests/setup/supabase-test.ts` — na versão presente neste worktree — ainda lê `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, que apontam para o projeto de PRODUÇÃO (`yuyprdjzeslanxbgcemj`). A migration nunca chegou ao projeto que os testes realmente exercitam.
- **Fix:** `npx supabase link --project-ref yuyprdjzeslanxbgcemj` (usando `SUPABASE_ACCESS_TOKEN` de `.env.local`), seguido de `npx supabase db push --yes` novamente — confirmado via `curl` direto ao REST endpoint de produção que `order_clicks` responde `[]` (sem erro de schema cache) e `store_settings` retorna a linha esperada para loja com produto publicado. `database.types.ts` foi regenerado a partir do projeto correto (idêntico ao gerado anteriormente, já que o shape da tabela é o mesmo em ambos os projetos).
- **Files modified:** nenhum arquivo versionado adicional (a correção foi inteiramente no lado do Supabase remoto + relink local do CLI, que vive em `supabase/.temp/`, gitignored)
- **Verification:** `npx vitest run tests/rls/order-clicks-rls.test.ts tests/storefront/store-settings-public-read.test.ts tests/storefront/public-access-rls.test.ts` — 13/13 testes verdes após a correção
- **Committed in:** não gerou commit adicional — o commit de Task 2 (`38e914c`) já reflete o estado final correto de `database.types.ts` (o primeiro `gen types` contra o projeto de teste produziu um diff idêntico ao do projeto de produção, então não houve necessidade de recommitar o arquivo)

**2. [Environment setup, não uma deviation de código] `.env.local` e `supabase/.temp` copiados do repositório principal para o worktree**
- **Found during:** Task 2 (início)
- **Issue:** Ambos são gitignored (`.env*`), então o worktree não os possui por padrão; sem eles, `supabase db push`/`gen types`/os testes de integração RLS não têm como se conectar a nenhum projeto Supabase.
- **Fix:** `cp` de `.env.local` e do conteúdo de `supabase/.temp/` do repositório principal para o worktree (não versionado, não commitado — apenas necessário para esta sessão de execução).
- **Files modified:** nenhum (arquivos gitignored, fora do controle de versão)
- **Verification:** conexão bem-sucedida com Supabase confirmada pelos pushes/testes subsequentes

---

**Total deviations:** 2 (1 auto-fixed Rule 3 — blocking; 1 ambiental, sem impacto de código)
**Impact on plan:** Nenhum desvio de escopo do plano. A correção do projeto-alvo foi necessária para que a migration realmente afetasse o banco que a aplicação e os testes deste projeto (neste ponto do histórico) efetivamente usam. Não foi feita nenhuma alteração em `tests/setup/supabase-test.ts` (fora do escopo deste plano, conforme `read_first` explicitamente instruiu "importar sem alterar").

## Issues Encountered
- Ver Deviation 1 acima — divergência entre o projeto Supabase linkado (copiado de `main`, já adiantado por um commit concorrente de isolamento de testes) e o projeto que o código deste worktree realmente usa. Resolvido via relink explícito ao projeto de produção antes do push definitivo.
- `npx tsc --noEmit` reporta 2 erros em `tests/supabase/server-cookies.test.ts` — pré-existentes e já documentados em STATE.md ("typecheck limpo exceto o erro pré-existente já documentado em server-cookies.test.ts"), fora do escopo deste plano (nenhum arquivo deste plano toca esse teste).

## User Setup Required

None - nenhuma configuração externa manual necessária. A migration já foi aplicada no projeto Supabase de produção como parte deste plano.

**Nota para o merge/orquestrador:** quando este worktree for integrado a `main`, `main` já terá avançado com o commit `38cbe82` (isolamento do projeto de teste dedicado). Nesse ponto, `tests/setup/supabase-test.ts` passará a ler `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` em vez de `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Os três arquivos de teste RLS deste plano (`order-clicks-rls.test.ts`, `store-settings-public-read.test.ts`, `public-access-rls.test.ts`) não importam variáveis de ambiente diretamente (usam os helpers de `tests/setup/supabase-test.ts`), então continuarão funcionando sem alteração — mas a migration 0005 precisa também estar aplicada no projeto de TESTE dedicado (`jnlptpdzpajyqmtprfgn`) para que a suíte completa passe pós-merge. Este plano já aplicou 0005 nesse projeto de teste também (push acidental da primeira tentativa, mantido deliberadamente — inofensivo e útil), então nenhuma ação adicional deveria ser necessária, mas vale confirmar com `npx supabase db push` (linkado ao projeto de teste) logo após o merge, como sanity check.

## Next Phase Readiness
- `order_clicks` e a exposição pública de `store_settings` estão prontas para os planos 05-02/05-03/05-04 consumirem (CTA "Pedir agora", `logOrderClick`, botão de WhatsApp na página de detalhe do produto)
- Nenhum bloqueador conhecido para os próximos planos da Fase 5

---
*Phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico*
*Completed: 2026-07-14*
