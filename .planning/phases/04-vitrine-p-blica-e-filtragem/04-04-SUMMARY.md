---
phase: 04-vitrine-p-blica-e-filtragem
plan: 04
subsystem: storefront
tags: [nextjs, server-actions, pagination, css]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-03 — queryPublicProducts with filters, stable QueryPublicProductsParams shape"
provides:
  - fetchNextPage Server Action (src/lib/products/public-actions.ts) — public, slug-resolved, coverUrl-resolved
  - LoadMoreButton (mobile primary control)
  - PaginationNumbered (desktop secondary control)
  - page.tsx adaptive pagination wiring (CSS-only device split, 1-based page parsing)
affects: [04-06]

tech-stack:
  added: []
  patterns:
    - "Public Server Actions live in a dedicated module (public-actions.ts) separate from owner-scoped actions.ts, to prevent accidental getOwnedStore() reuse in an unauthenticated code path"
    - "coverPath -> coverUrl resolution happens server-side wherever a new page of products is produced (page.tsx and fetchNextPage both do it identically) — a Client Component cannot call supabase.storage.getPublicUrl"

key-files:
  created:
    - src/lib/products/public-actions.ts
    - src/app/loja/[slug]/load-more-button.tsx
    - src/app/loja/[slug]/pagination-numbered.tsx
    - tests/storefront/load-more-pagination.test.ts
  modified:
    - src/app/loja/[slug]/page.tsx

key-decisions:
  - "fetchNextPage placed in a new src/lib/products/public-actions.ts instead of the admin's src/lib/products/actions.ts (04-PATTERNS.md's suggested location) — deliberate security-separation decision documented inline"
  - "fetchNextPage resolves coverUrl before returning (not just coverPath) since the calling Client Component has no access to the Supabase Storage client"

requirements-completed: [VITR-04]

coverage:
  - id: D1
    description: "No mobile, o cliente clica 'Carregar mais' e vê mais produtos aparecerem sem reload completo da página"
    requirement: "VITR-04"
    verification:
      - kind: integration
        ref: "tests/storefront/load-more-pagination.test.ts#retorna a mesma página/hasMore que queryPublicProducts para a mesma loja/filtros"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit + grep confirming setItems accumulates (never replaces), button only renders when hasMore"
        status: pass
    human_judgment: true
    rationale: "Actual no-reload behavior and CSS breakpoint switching between mobile/desktop controls requires a real browser at different viewport widths — scheduled for the phase-end manual checkpoint."
  - id: D2
    description: "No desktop, o cliente navega por paginação numerada (anterior/próxima), preservando os filtros ativos"
    requirement: "VITR-04"
    verification: []
    human_judgment: true
    rationale: "PaginationNumbered is a stateless Server Component whose only behavior is link generation — correctness of the generated href is implicit in page.tsx's own filter-preservation logic (already covered by Plan 04-03's tests), but the actual click-through navigation experience is a manual/visual check."

duration: 5min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 04: Paginação Adaptativa Summary

**Cliente navega o catálogo completo através de "Carregar mais" (mobile, Server Action `fetchNextPage`) ou paginação numerada (desktop, Links estáticos) — ambos consumindo a mesma `queryPublicProducts`, decisão de qual controle aparece 100% via CSS.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-14T03:24:00Z (approx.)
- **Completed:** 2026-07-14T03:26:29Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `fetchNextPage` (new `src/lib/products/public-actions.ts`) resolves the store by slug only (never accepts a `storeId` directly), delegates entirely to `queryPublicProducts`, and resolves `coverUrl` server-side before returning — verified to return byte-identical product IDs/`hasMore` as a direct `queryPublicProducts` call for the same page
- `LoadMoreButton` (mobile): accumulates fetched pages via `setItems(prev => [...prev, ...new])`, never replaces the server-rendered first page; button disappears once `hasMore` is false
- `PaginationNumbered` (desktop): stateless Server Component, `<Link>`-based prev/next preserving the active filter query string
- `page.tsx`: parses `page` 1-based from `searchParams`, renders both controls unconditionally with `hidden md:flex`/`flex md:hidden` — zero JS device detection anywhere in the `loja/[slug]` tree (grep-verified)

## Task Commits

Each task was committed atomically:

1. **Task 1: fetchNextPage Server Action** - `19629e9` (feat)
2. **Task 2: LoadMoreButton** - `2de51eb` (feat)
3. **Task 3: PaginationNumbered + wire page.tsx** - `9ca67f8` (feat)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `src/lib/products/public-actions.ts` - `fetchNextPage`, public Server Action module
- `src/app/loja/[slug]/load-more-button.tsx` - mobile "Carregar mais" control
- `src/app/loja/[slug]/pagination-numbered.tsx` - desktop numbered control
- `src/app/loja/[slug]/page.tsx` - adaptive wiring, 1-based page parsing, hasMore threaded through
- `tests/storefront/load-more-pagination.test.ts` - parity test + invalid-slug error path

## Decisions Made
- Documented in `key-decisions` above — both already flagged in the plan itself as deliberate executor decisions, not new deviations.

## Deviations from Plan

None - plan executed exactly as written (the `fetchNextPage` public-actions.ts location and coverUrl-resolution decisions were already anticipated and specified in the plan text itself, not discovered mid-execution).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The full pagination pipeline (initial page via Server Component, subsequent pages via Server Action) is stable — Plan 04-06 only needs to add one more parameter to `queryPublicProducts` (the store's `hide_sold_out_default`) and thread it through both `page.tsx` and `fetchNextPage` identically.
- Two coverage items remain `human_judgment: true` (visual no-reload confirmation, desktop click-through) — both scheduled for the phase-end manual checkpoint, not blockers.
- No blockers for Plan 04-05 (already complete) or Plan 04-06.

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
