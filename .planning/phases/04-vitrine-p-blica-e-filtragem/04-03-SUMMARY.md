---
phase: 04-vitrine-p-blica-e-filtragem
plan: 03
subsystem: storefront
tags: [nextjs, searchparams, filters, supabase]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-02 — queryPublicProducts, page.tsx, ProductGrid/ProductCard"
provides:
  - queryPublicProducts multi-select filters (brand/sole/fulfillment) + search (q)
  - ProductFilters component (chips + debounced search, sticky)
  - page.tsx searchParams-driven filtering with two distinct empty states
affects: [04-04, 04-06]

tech-stack:
  added: []
  patterns:
    - "Multi-select filter values validated against fixed lists (constants.ts) before .in() — invalid values silently dropped, never propagated as errors or interpolated raw"
    - "toArray() normalizes Next.js's string | string[] searchParams shape for multi-value query params"

key-files:
  created:
    - src/app/loja/[slug]/product-filters.tsx
  modified:
    - src/lib/products/public-list.ts
    - src/app/loja/[slug]/page.tsx
    - tests/storefront/list-filter-paginate.test.ts

key-decisions:
  - "brand/sole/fulfillment filters always use .in() with a pre-validated array, never .eq() — deliberate divergence from the admin's single-select queryProducts, required by D-02 (multi-select within the same category)"

requirements-completed: [VITR-02]

coverage:
  - id: D1
    description: "Cliente filtra produtos por múltiplas marcas/solados/modalidades simultaneamente (D-02) e busca por nome (D-03), com a URL refletindo e reproduzindo o estado filtrado"
    requirement: "VITR-02"
    verification:
      - kind: integration
        ref: "tests/storefront/list-filter-paginate.test.ts#filtra por marca multi-select (D-02), solado, modalidade, busca por nome, combinados"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit + grep confirming .in() (never .eq) for brand filter, toArray() present in page.tsx"
        status: pass
    human_judgment: true
    rationale: "Sticky positioning while scrolling (D-04) and chip visual active/inactive states are layout/UX behaviors best confirmed visually — scheduled for the phase-end manual checkpoint."

duration: 8min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 03: Filtros e Busca na Vitrine Pública Summary

**Cliente agora filtra a vitrine por múltiplas marcas/solados/modalidades ao mesmo tempo e busca por nome, com chips sticky no topo e a URL como única fonte de verdade — provado por um teste de integração cobrindo cada combinação de filtro e um caso de valor inválido ignorado.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-14T03:14:00Z (approx.)
- **Completed:** 2026-07-14T03:22:13Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `queryPublicProducts` extended with `brand`/`sole`/`fulfillment` (multi-select via `.in()`, each validated against `constants.ts` before use) and `q` (`ilike` partial search) — new integration test covers multi-select, single-category filters, search, combined filters, and silent rejection of an invalid brand value
- `ProductFilters` (new Client Component): chips for brand/sole/fulfillment with `aria-pressed` toggle state, debounced search input (400ms), `sticky top-0` container — never keeps its own filter state, every interaction goes through `router.push`
- `page.tsx` now parses multi-value `searchParams` via `toArray()`, passes filters into `queryPublicProducts`, and renders two distinct empty-state messages depending on whether the store has any published products at all

## Task Commits

Each task was committed atomically:

1. **Task 1: Estender queryPublicProducts com filtros** - `c043c51` (feat)
2. **Task 2: ProductFilters (chips + busca)** - `91364f1` (feat)
3. **Task 3: Wire page.tsx com searchParams multi-valor** - `26a8fb4` (feat)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `src/lib/products/public-list.ts` - added `q`/`brand`/`sole`/`fulfillment` to `QueryPublicProductsParams`
- `src/app/loja/[slug]/product-filters.tsx` - chips + debounced search, sticky
- `src/app/loja/[slug]/page.tsx` - `toArray()`, filter wiring, two empty states
- `tests/storefront/list-filter-paginate.test.ts` - new filter/search test case appended

## Decisions Made
- None beyond what's documented in `key-decisions` — plan executed as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None beyond the already-documented pre-existing Supabase Auth rate limit (see `deferred-items.md`) — not triggered this plan since only the single relevant test file was run (isolated, per the established discipline), and it passed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `queryPublicProducts`'s signature is now stable for the rest of the phase — Plan 04-04 (pagination) calls it unchanged via the new Server Action; Plan 04-06 (visibility rule) adds one more parameter without touching the filter logic here.
- One coverage item (`D1`) is marked `human_judgment: true` for the sticky/visual chip behavior — scheduled for the phase-end manual checkpoint, not a blocker.
- No blockers for Plan 04-04.

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
