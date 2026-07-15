# Deferred Items — Phase 02

Out-of-scope issues discovered during execution, not fixed per the executor's
scope boundary (only auto-fix issues directly caused by the current task's
changes).

## Plan 02-02

- **`tests/supabase/server-cookies.test.ts` TypeScript errors** (found during Task 3's `npx tsc --noEmit` verification): two `TS2352` errors casting `SupabaseClient` to a `{ cookies: {...} }` shape. Pre-existing, unrelated to any file this plan touches (`src/lib/slug/*`, `src/lib/hooks/use-debounce.ts`, `src/lib/auth/actions.ts`). Not fixed — out of scope.

## Plan 02-06 (closeout session)

- **`REQUIREMENTS.md` traceability table shows `LOJA-02 | Phase 2 | Pendente`** despite its checkbox (`- [x] LOJA-02`) already marked complete (LOJA-02 was plan 02-05's requirement, not 02-06's). Left untouched — out of scope for this plan's closeout (only LOJA-03/LOJA-04, this plan's own `requirements` frontmatter, were corrected). Flagging for whoever closes out or audits plan 02-05.
