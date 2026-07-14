---
phase: 04-vitrine-p-blica-e-filtragem
plan: 06
subsystem: storefront
tags: [supabase, business-rule, visibility]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-04 — public-actions.ts/fetchNextPage, page.tsx pagination wiring"
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-05 — hide_when_sold_out/hide_sold_out_default write side, D-11 reset logic"
provides:
  - queryPublicProducts applies the full D-09/D-10/D-11 visibility rule (4th param storeHideSoldOutDefault)
  - page.tsx and fetchNextPage both thread the store's hide_sold_out_default through identically
affects: []

tech-stack:
  added: []
  patterns:
    - "Visibility rule resolved once inside queryPublicProducts, filtered on raw rows before mapping to the public-facing shape — the field driving the rule (hide_when_sold_out) never reaches any UI component"

key-files:
  modified:
    - src/lib/products/public-list.ts
    - src/app/loja/[slug]/page.tsx
    - src/lib/products/public-actions.ts

key-decisions:
  - "queryPublicProducts's signature grew a 4th parameter (storeHideSoldOutDefault: boolean) rather than a second internal query to stores — the caller (page.tsx/fetchNextPage) already has this value loaded from its own store lookup, avoiding a redundant round-trip"
  - "Accepted a known, documented trade-off: because the visibility filter runs after the range()-based pagination fetch, a single page can return fewer than PUBLIC_PAGE_SIZE visible items when hidden-sold-out products fall in that batch — hasMore stays correct relative to the underlying published set and no product is ever duplicated or permanently lost across subsequent loads"

requirements-completed: [VITR-03]

coverage:
  - id: D1
    description: "Produto esgotado com exceção 'ocultar' (por produto ou herdada do padrão global) nunca aparece na vitrine pública, mesmo estando publicado"
    requirement: "VITR-03"
    verification:
      - kind: integration
        ref: "tests/storefront/sold-out-visibility.test.ts (5 cases: available-always-shows, null+false, null+true, override-hide, override-show)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mudar o padrão global da loja reflete imediatamente nos produtos que não têm exceção própria configurada, sem delay perceptível"
    requirement: "VITR-03"
    verification:
      - kind: integration
        ref: "tests/settings/hide-sold-out-default.test.ts (Plan 04-05, D-11 write side) + tests/storefront/sold-out-visibility.test.ts (Plan 04-06, read side) together prove the end-to-end contract"
        status: pass
      - kind: other
        ref: "page.tsx/public-list.ts never use a cache directive (grep-verified across the phase) — freshness is structural, not tested per-request"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 06: Aplicar Regra de Visibilidade na Consulta Pública Summary

**A vitrine pública agora respeita ponta a ponta a configuração de esgotado (por produto e padrão global da loja) — `queryPublicProducts` centraliza a regra, `page.tsx` e `fetchNextPage` a alimentam de forma idêntica, provado pela matriz completa de 5 casos de D-09/D-10/D-11.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-14T03:29:00Z (approx.)
- **Completed:** 2026-07-14T03:32:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `queryPublicProducts` gained a 4th parameter `storeHideSoldOutDefault: boolean`; filters raw fetched rows (`disponivel || !(hide_when_sold_out ?? storeHideSoldOutDefault)`) before mapping to the public product shape — `hide_when_sold_out` never leaks into any UI component
- `page.tsx` and `fetchNextPage` both extended their `stores` select to include `hide_sold_out_default` and pass it through identically — no divergence between the initial Server Component render and subsequent "load more" pages
- `tests/storefront/sold-out-visibility.test.ts` proves the full 5-case matrix: available always shows regardless of hide flags; null exception inherits the store default (both directions); an explicit per-product override always wins over the store default (both directions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Aplicar a regra hide_when_sold_out/hide_sold_out_default** - `7a2652f` (feat)
2. **Task 2: Wire page.tsx + fetchNextPage** - `46d58f0` (feat)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `src/lib/products/public-list.ts` - `isVisible()`, filters before mapping, new 4th param
- `src/app/loja/[slug]/page.tsx` - selects/passes `hide_sold_out_default`
- `src/lib/products/public-actions.ts` - same extension in `fetchNextPage`
- `tests/storefront/sold-out-visibility.test.ts` - new, 5-case matrix
- `tests/storefront/list-filter-paginate.test.ts`, `tests/storefront/load-more-pagination.test.ts` - existing call sites updated for the new signature (necessary consequence of Task 1, all still green)

## Decisions Made
- Both key decisions are documented above in `key-decisions` — anticipated in the plan text itself, not new discoveries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extending queryPublicProducts's signature broke existing call sites — fixed immediately**
- **Found during:** Task 1, running `npx tsc --noEmit` right after adding the 4th parameter
- **Issue:** `page.tsx`, `public-actions.ts`, and every direct `queryPublicProducts(...)` call in `tests/storefront/list-filter-paginate.test.ts`/`load-more-pagination.test.ts` (9 call sites total) failed to compile with `Expected 4 arguments, but got 3`
- **Fix:** Updated all 9 test call sites to pass `false` explicitly (preserving each test's original semantics — none of them were testing the visibility rule, so the neutral/never-hide default is correct), and updated `page.tsx`/`public-actions.ts` as Task 2 already required
- **Files modified:** `tests/storefront/list-filter-paginate.test.ts`, `tests/storefront/load-more-pagination.test.ts`, `src/app/loja/[slug]/page.tsx`, `src/lib/products/public-actions.ts`
- **Verification:** `npx tsc --noEmit` clean (only the pre-existing unrelated error remains); re-ran `list-filter-paginate.test.ts` (3/3), `load-more-pagination.test.ts` (2/2), `public-access-rls.test.ts` (6/6) — all still green after the signature change
- **Committed in:** `7a2652f` (test file fixes, part of Task 1's commit since they were a direct consequence of that signature change)

---

**Total deviations:** 1 auto-fixed (1 blocking — signature-change ripple through existing call sites)
**Impact on plan:** No behavior change to any existing test's intent; purely mechanical signature updates. No scope creep.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **This is the final plan of Phase 4.** All 6 plans complete: RLS foundation (04-01), minimal storefront (04-02), filters/search (04-03), adaptive pagination (04-04), admin visibility config (04-05), and the visibility rule's read side (04-06).
- A final coherence sweep across all 6 Phase-4 test files together (`tests/storefront/`, `tests/products/hide-when-sold-out.test.ts`, `tests/settings/hide-sold-out-default.test.ts`) passed 22/22 — every plan's automated coverage holds simultaneously, not just in isolation.
- Remaining `human_judgment: true` coverage items across the phase (hero/grid visual layout, image-fallback rendering, adaptive pagination device-split, chip sticky behavior) are all scheduled for the phase-end manual checkpoint per `04-VALIDATION.md` — none block phase completion from an automated-verification standpoint.
- Phase 4 is ready for `/gsd-verify-work` / the phase verification step.

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
