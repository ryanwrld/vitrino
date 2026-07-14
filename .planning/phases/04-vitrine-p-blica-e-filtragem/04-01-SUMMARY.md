---
phase: 04-vitrine-p-blica-e-filtragem
plan: 01
subsystem: database
tags: [supabase, rls, postgres, migration, anon]

requires:
  - phase: 03-crud-de-produtos-e-pipeline-de-m-dia
    provides: products/product_sizes/product_photos schema with status column (draft/published gate)
provides:
  - 4 additive RLS policies (to anon, select-only) restricted to status='published'
  - products.hide_when_sold_out (nullable) and stores.hide_sold_out_default (not null default false) columns
  - tests/storefront/public-access-rls.test.ts proving the exact anonymous-read scope
affects: [04-02, 04-03, 04-04, 04-05, 04-06]

tech-stack:
  added: []
  patterns:
    - "Additive RLS policy (to anon, for select only) alongside existing owner_full_access_* policies — never replaces, always OR'd"
    - "Nullable boolean column with no default to represent a three-state 'inherit / explicit true / explicit false' business rule"

key-files:
  created:
    - supabase/migrations/0004_public_storefront_rls_and_visibility.sql
    - tests/storefront/public-access-rls.test.ts
    - .planning/phases/04-vitrine-p-blica-e-filtragem/deferred-items.md
  modified:
    - src/lib/database.types.ts

key-decisions:
  - "hide_when_sold_out is nullable with no default (D-10/D-11) — false would already be a 'configured' value, making the global-default reset (D-11) impossible to distinguish from an explicit choice"
  - "store_settings deliberately excluded from this migration (Pitfall 2) — WhatsApp exposure is Phase 5's decision, not pre-built here"
  - "Rephrased migration header comments to avoid literally echoing the acceptance-criteria grep targets (`to anon`, `for all`) in prose — kept the actual SQL clauses intact, only reworded surrounding explanation so the automated verify command measures real policy clauses, not comment text"

requirements-completed: [VITR-01]

coverage:
  - id: D1
    description: "Anonymous (no-session) client can read a store by slug and a published product's row, sizes, and photos"
    requirement: "VITR-01"
    verification:
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo lê a linha de stores pelo slug (policy public_read_published_stores)"
        status: pass
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo lê o produto published (policy public_read_published_products)"
        status: pass
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo lê product_sizes/product_photos do produto published"
        status: pass
    human_judgment: false
  - id: D2
    description: "Anonymous client never reads draft products/sizes/photos or store_settings, even with the exact row id"
    requirement: "VITR-01"
    verification:
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo NUNCA lê o produto draft (mesmo sabendo o id exato)"
        status: pass
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo NUNCA lê product_sizes/product_photos do produto draft"
        status: pass
      - kind: integration
        ref: "tests/storefront/public-access-rls.test.ts#client anônimo NUNCA lê store_settings (Pitfall 2 — nenhuma policy pública nessa tabela)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 01: Fundação — Acesso Público (RLS to anon) + Colunas de Visibilidade Summary

**Migration 0004 aplicada ao Supabase remoto: 4 policies RLS aditivas `to anon` restritas a `status='published'`, mais as colunas `hide_when_sold_out`/`hide_sold_out_default` para D-09/D-10/D-11 — provado com 6 testes de integração reais contra o projeto remoto.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-14T02:47:00Z (approx.)
- **Completed:** 2026-07-14T02:55:30Z
- **Tasks:** 3
- **Files modified:** 4 (1 new migration, 1 new test, 1 new deferred-items note, 1 regenerated types file)

## Accomplishments
- Migration `0004_public_storefront_rls_and_visibility.sql` written and pushed to the remote Supabase project via `npx supabase db push --linked` — succeeded on first attempt, no interactive auth prompt required
- `database.types.ts` regenerated via `npx supabase gen types typescript --linked`, byte-identical diff confirmed against the manually-applied edit (only the two new fields added, nothing else changed)
- `tests/storefront/public-access-rls.test.ts` proves the exact anonymous-read scope: stores (yes, by slug), published products/sizes/photos (yes), draft products/sizes/photos (no), store_settings (no) — all 6 assertions green on first run

## Task Commits

Each task was committed atomically:

1. **Task 1: Escrever a migration 0004** - `0f7b6c9` (feat)
2. **Task 2: [BLOCKING] Aplicar a migration + regenerar tipos** - `165c921` (feat)
3. **Task 3: Teste de acesso público anônimo** - `9865bdf` (test)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `supabase/migrations/0004_public_storefront_rls_and_visibility.sql` - 4 additive RLS policies (to anon, select-only, published-scoped) + 2 new visibility columns
- `src/lib/database.types.ts` - regenerated to include `hide_when_sold_out`/`hide_sold_out_default`
- `tests/storefront/public-access-rls.test.ts` - 6 integration tests against the real remote Supabase project (anon client, no signIn)
- `.planning/phases/04-vitrine-p-blica-e-filtragem/deferred-items.md` - logs a pre-existing, unrelated `tsc` error

## Decisions Made
- `hide_when_sold_out` stays `boolean` nullable with no default (never `not null default false`) — this is the only way to distinguish "revendedor never configured an exception" (null, inherits store default) from "revendedor explicitly chose false" (D-11's reset-on-global-change would otherwise be impossible to implement correctly)
- `store_settings` was deliberately left out of this migration's public policies — WhatsApp data stays owner-only until Phase 5 decides how it's consumed
- Rephrased three comment blocks in the migration file to avoid literally repeating the acceptance-criteria's grep targets (`to anon`, `for all`) in prose — the SQL itself was never touched, only the surrounding explanatory comments, so the automated verify command counts real policy clauses instead of being inflated by comment text

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment-text self-invalidated the Task 1 acceptance-criteria grep**
- **Found during:** Task 1 (writing the migration) — running the plan's own `<verify><automated>` command against the freshly-written file
- **Issue:** The migration's header comments explained the policies using the literal substrings `to anon` and `for all` in prose (e.g., "nunca `for all`"), which inflated `grep -c "to anon"` from the expected 4 (real SQL clauses) to 6, failing the acceptance criterion
- **Fix:** Rephrased the three affected comment blocks to describe the same rules without literally repeating the grep targets (e.g., "restritas ao papel anônimo" instead of "to anon", "limitadas à operação de leitura" instead of "for all") — zero change to actual SQL behavior
- **Files modified:** `supabase/migrations/0004_public_storefront_rls_and_visibility.sql`
- **Verification:** Re-ran the plan's literal verify command — `grep -c "to anon" | grep -q "^4$"` now passes; `for all` count is 0
- **Committed in:** `0f7b6c9` (Task 1 commit, before first push)

---

**Total deviations:** 1 auto-fixed (1 bug — self-invalidating verification command)
**Impact on plan:** Cosmetic-only fix to comment prose; the SQL security behavior was correct from the first draft. No scope creep.

## Issues Encountered
- `tsc --noEmit` surfaces 2 pre-existing errors in `tests/supabase/server-cookies.test.ts` (unrelated `SupabaseClient` mock-casting issue). Confirmed via `git stash` that these errors exist identically without this plan's `database.types.ts` changes — this is the third time this exact issue has been reconfirmed as pre-existing (also logged in Phase 3's `deferred-items.md`). Logged again in this phase's `deferred-items.md`, not fixed (out of scope for this plan).
- `supabase db push` printed a Docker-daemon warning about failing to cache the migrations catalog — non-blocking, purely a local-dev caching optimization; the actual push to the remote database completed successfully regardless (same behavior seen in Phases 1-3).

## User Setup Required
None - no external service configuration required (Supabase CLI was already linked to the project from prior phases; `npx supabase db push --linked` completed non-interactively).

## Next Phase Readiness
- The public-read foundation is live on the remote database — every remaining plan in this phase (04-02 through 04-06) can now safely build `queryPublicProducts`/`page.tsx`/`product-form.tsx`/`settings-form.tsx` against real anonymous reads, verified end-to-end rather than assumed.
- `hide_when_sold_out`/`hide_sold_out_default` columns exist and are typed — Plan 04-05 (admin write side) and Plan 04-06 (public read side) can proceed without any further schema work.
- No blockers for Wave 2 (Plans 04-02 and 04-05, which can now both start).

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
