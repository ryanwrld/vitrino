# Deferred Items — Phase 02

Out-of-scope issues discovered during execution, not fixed per the executor's
scope boundary (only auto-fix issues directly caused by the current task's
changes).

## Plan 02-02

- **`tests/supabase/server-cookies.test.ts` TypeScript errors** (found during Task 3's `npx tsc --noEmit` verification): two `TS2352` errors casting `SupabaseClient` to a `{ cookies: {...} }` shape. Pre-existing, unrelated to any file this plan touches (`src/lib/slug/*`, `src/lib/hooks/use-debounce.ts`, `src/lib/auth/actions.ts`). Not fixed — out of scope.
