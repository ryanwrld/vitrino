---
phase: 04-vitrine-p-blica-e-filtragem
plan: 02
subsystem: storefront
tags: [nextjs, server-components, supabase, public-route]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-01 — public RLS policies (to anon, published-scoped) on stores/products/product_sizes/product_photos"
provides:
  - queryPublicProducts (src/lib/products/public-list.ts) — paginated read of published products, page 1-based
  - Rewritten /loja/[slug] route resolving store by slug with zero auth
  - StoreHero, ProductGrid, ProductCard, ImageWithFallback components
affects: [04-03, 04-04, 04-05, 04-06]

tech-stack:
  added: []
  patterns:
    - "queryPublicProducts mirrors admin queryProducts's two-query-plus-memory-join shape but status is hardcoded, never accepted from params"
    - "ImageWithFallback (Client Component, onError) reused for both product photos and the store hero logo"

key-files:
  created:
    - src/lib/products/public-list.ts
    - src/app/loja/[slug]/store-hero.tsx
    - src/app/loja/[slug]/product-grid.tsx
    - src/app/loja/[slug]/product-card.tsx
    - src/app/loja/[slug]/image-with-fallback.tsx
    - tests/storefront/list-filter-paginate.test.ts
  modified:
    - src/app/loja/[slug]/page.tsx

key-decisions:
  - "queryPublicProducts fetches PUBLIC_PAGE_SIZE+1 rows and slices to PUBLIC_PAGE_SIZE for hasMore, avoiding a second count(*) query (04-RESEARCH.md Open Question 3)"
  - "page.tsx's own doc comment describing the cache-directive prohibition was rephrased to avoid literally repeating the forbidden directive string in quotes — same self-invalidating-grep class of issue as Plan 04-01's migration comments"
  - "product-card.tsx's reference to the admin analog file path was rephrased (no longer contains the substring the plan's own 'no edit/delete link' grep gate checks for) — same fix pattern"

requirements-completed: [VITR-01, VITR-03, VITR-05]

coverage:
  - id: D1
    description: "Anonymous visitor opens /loja/[slug] and sees the store hero plus a grid of up to 20 published products (photo/fallback, name, brand, price, availability)"
    requirement: "VITR-01"
    verification:
      - kind: integration
        ref: "tests/storefront/list-filter-paginate.test.ts#filtra só status=published, deriva disponibilidade/capa, isola por loja"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (page.tsx + components compile, no auth import, no cache directive, no product counter)"
        status: pass
    human_judgment: true
    rationale: "Visual layout/spacing of the hero and grid (colors, responsiveness across breakpoints) is a UX judgment call not fully provable by a type/unit check — deferred to the phase-end human checkpoint per 04-VALIDATION.md."
  - id: D2
    description: "Draft products never appear on the public storefront, even when the store has them"
    requirement: "VITR-01"
    verification:
      - kind: integration
        ref: "tests/storefront/list-filter-paginate.test.ts#filtra só status=published, deriva disponibilidade/capa, isola por loja"
        status: pass
    human_judgment: false
  - id: D3
    description: "A broken image URL shows the ImageOff placeholder instead of a broken layout"
    requirement: "VITR-05"
    verification: []
    human_judgment: true
    rationale: "Requires a real browser rendering a genuinely broken image URL — not exercisable in a headless Vitest run; scheduled as a manual checkpoint per 04-VALIDATION.md Manual-Only Verifications."

duration: 4min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 02: Vitrine Pública Mínima Summary

**`/loja/[slug]` agora resolve a loja pelo slug sem nenhuma sessão e renderiza hero + grid de produtos publicados reais via `queryPublicProducts`, com fallback de imagem funcionando — primeira capacidade observável da vitrine pública.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-14T02:58:00Z (approx.)
- **Completed:** 2026-07-14T03:01:17Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 1 rewritten, 1 test created)

## Accomplishments
- `queryPublicProducts` (new, `src/lib/products/public-list.ts`) reads only `status='published'` products for a given `storeId`, derives availability/cover the same way the admin's `queryProducts` does, and paginates via the fetch-21-show-20 technique — 2 integration tests green (isolation + pagination boundaries)
- `/loja/[slug]/page.tsx` rewritten: resolves the store via an unauthenticated `createClient()` call (Postgres sees `anon`), calls `notFound()` when the slug doesn't resolve, renders `<StoreHero>` + `<ProductGrid>`
- New leaf components: `StoreHero` (logo/accent color/tagline, tagline conditional per D-13), `ProductGrid`/`ProductCard` (mobile-first responsive grid, no admin-only edit/delete controls), `ImageWithFallback` (Client Component, `onError` swaps to `ImageOff` placeholder — reused for both product photos and the hero logo)

## Task Commits

Each task was committed atomically:

1. **Task 1: queryPublicProducts** - `44007c9` (feat)
2. **Task 2: Rota /loja/[slug]** - `c74b4d1` (feat)
3. **Task 3: StoreHero/ProductGrid/ProductCard/ImageWithFallback** - `80bd166` (feat)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `src/lib/products/public-list.ts` - `queryPublicProducts`, paginated public read
- `src/app/loja/[slug]/page.tsx` - resolves store by slug, renders hero + grid, no auth
- `src/app/loja/[slug]/store-hero.tsx` - logo/accent color/tagline hero (D-12/D-13)
- `src/app/loja/[slug]/product-grid.tsx` - responsive grid wrapper
- `src/app/loja/[slug]/product-card.tsx` - product display card, no admin controls
- `src/app/loja/[slug]/image-with-fallback.tsx` - `onError` image fallback (VITR-05)
- `tests/storefront/list-filter-paginate.test.ts` - isolation + pagination coverage (extended in Plan 04-03)

## Decisions Made
- Implemented Task 3's components before finishing Task 2's page.tsx (see Deviations) rather than leaving `page.tsx` in a temporarily-broken state — both were still committed as two separate atomic commits matching the plan's stated file split.
- `page.tsx` does not yet read `page`/filter `searchParams` — this plan intentionally renders only the first page (page 1 fixed); adaptive pagination controls and filters are added in Plans 04-03/04-04 without needing to touch `queryPublicProducts`'s core shape again.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2 and Task 3 had an inverted dependency — resolved by implementing together, committing separately**
- **Found during:** Task 2 (writing `page.tsx`), before running its `npx tsc --noEmit` verify
- **Issue:** The plan's Task 2 action requires `page.tsx` to import `<StoreHero>` and `<ProductGrid>`, but those components are created in Task 3 — Task 2's own compile-based verify command would fail if executed strictly in isolation before Task 3's files exist.
- **Fix:** Wrote Task 3's four components first (so the imports resolve), then wrote Task 2's `page.tsx`, ran `npx tsc --noEmit` once (passing), then staged and committed each task's files separately in the plan's original order (Task 2's `page.tsx` alone in `c74b4d1`, Task 3's four components in `80bd166`) — preserving per-task commit granularity and traceability despite the write-order needing to be reversed.
- **Files modified:** `src/app/loja/[slug]/page.tsx`, `store-hero.tsx`, `product-grid.tsx`, `product-card.tsx`, `image-with-fallback.tsx`
- **Verification:** `npx tsc --noEmit` passes (only the pre-existing unrelated `server-cookies.test.ts` error remains); all Task 2 and Task 3 acceptance criteria re-verified individually after the fact
- **Committed in:** `c74b4d1` (Task 2), `80bd166` (Task 3)

**2. [Rule 1 - Bug] Comment-text self-invalidated two acceptance-criteria greps**
- **Found during:** Task 2 and Task 3 acceptance-criteria verification
- **Issue:** `page.tsx`'s doc comment literally quoted the forbidden cache directive string (`"use cache"`) while explaining why it must never be added, inflating the "no cache directive" grep from 0 to 1. Separately, `product-card.tsx`'s doc comment referenced the admin analog file by its path (containing the substring `produtos/`), inflating the "no edit/delete link" grep from 0 to 1.
- **Fix:** Rephrased both comments to describe the same information without literally repeating the grep-gated substrings (e.g., "a diretiva de cache do App Router" instead of quoting the directive; "o card de listagem do painel admin (Fase 3)" instead of the literal file path) — zero change to actual component behavior.
- **Files modified:** `src/app/loja/[slug]/page.tsx`, `src/app/loja/[slug]/product-card.tsx`
- **Verification:** Re-ran both acceptance-criteria greps — both now return 0 as expected
- **Committed in:** `c74b4d1` (page.tsx fix), `80bd166` (product-card.tsx fix) — folded into the same task commits since these were fixed before the initial commit of each task's files

---

**Total deviations:** 2 auto-fixed (1 blocking — task ordering, 1 bug — self-invalidating comment text)
**Impact on plan:** No scope or behavior changes; both fixes are structural/cosmetic corrections that make the plan's own verification commands trustworthy. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `queryPublicProducts` is the single source of truth for public product reads — Plan 04-03 extends its `params` type (never creates a second query function), Plan 04-04 wires pagination controls around the same function, Plan 04-06 adds the sold-out visibility rule to it.
- Two coverage items in this plan are marked `human_judgment: true` (hero/grid visual layout, image-fallback rendering in a real browser) — both scheduled for the phase-end manual checkpoint per `04-VALIDATION.md`, not blockers for the next plan.
- No blockers for Plan 04-03 (filters) or Plan 04-05 (already in progress independently in Wave 2).

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
