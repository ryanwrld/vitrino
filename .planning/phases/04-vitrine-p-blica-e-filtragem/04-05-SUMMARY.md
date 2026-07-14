---
phase: 04-vitrine-p-blica-e-filtragem
plan: 05
subsystem: products
tags: [zod, react-hook-form, supabase, server-actions]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "Plan 04-01 — products.hide_when_sold_out and stores.hide_sold_out_default columns"
provides:
  - hide_when_sold_out field wired through productSchema, parseProductFormData, saveProduct, updateProduct
  - product-form.tsx visibility select (herdar/mostrar/ocultar) + edit-page hydration
  - hide_sold_out_default field wired through onboardingSchema, saveStoreSettings, settings-form.tsx
  - D-11 conditional reset (global default change wipes per-product exceptions, but only on real change)
affects: [04-06]

tech-stack:
  added: []
  patterns:
    - "Three-state visibility field modeled as nullable boolean (never boolean-with-default) to distinguish 'no exception configured' from 'explicitly configured false'"
    - "Change-detection before mutation: fetch current value, compare to next value, only cascade a side-effect (D-11 reset) when they actually differ"

key-files:
  created:
    - tests/products/hide-when-sold-out.test.ts
    - tests/settings/hide-sold-out-default.test.ts
  modified:
    - src/lib/validation/product.ts
    - src/lib/products/actions.ts
    - src/app/(admin)/produtos/product-form.tsx
    - src/app/(admin)/produtos/[id]/editar/page.tsx
    - src/lib/validation/onboarding.ts
    - src/lib/settings/actions.ts
    - src/app/(admin)/configuracoes/settings-form.tsx
    - src/app/(admin)/configuracoes/page.tsx

key-decisions:
  - "hideSoldOutDefault added to the shared onboardingSchema as .optional() so the Phase 1 onboarding wizard (which never sets this field) remains valid without changes"
  - "saveStoreSettings reads stores.hide_sold_out_default BEFORE the update and compares to the submitted value — the D-11 product-reset UPDATE only runs when they differ, so unrelated resubmits (e.g. editing tagline) never wipe per-product exceptions"

requirements-completed: [VITR-03]

coverage:
  - id: D1
    description: "Revendedor configures a per-product sold-out visibility exception (inherit / always show / hide) in product-form.tsx, correctly hydrated when editing an existing product"
    requirement: "VITR-03"
    verification:
      - kind: integration
        ref: "tests/products/hide-when-sold-out.test.ts (4 tests: null default, true, false, update transition back to null)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit + grep for 3-option select and editar/page.tsx hydration mapping"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revendedor configures a store-wide default (show faded vs. hide) in /configuracoes, and changing it resets per-product exceptions — but only on a real change"
    requirement: "VITR-03"
    verification:
      - kind: integration
        ref: "tests/settings/hide-sold-out-default.test.ts#mudar de false para true persiste o novo padrão E reseta exceções por produto já configuradas"
        status: pass
      - kind: integration
        ref: "tests/settings/hide-sold-out-default.test.ts#resubmeter com o MESMO valor de hideSoldOutDefault NÃO reseta exceções configuradas depois"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 05: Configuração de Visibilidade de Esgotado — Admin (Escrita) Summary

**Revendedor agora configura, por produto e globalmente na loja, se produtos esgotados aparecem esmaecidos ou ocultos na vitrine — com a regra D-11 (mudança global reseta exceções) disparando somente quando o valor realmente muda, provado por 6 testes de integração.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-14T03:03:00Z (approx.)
- **Completed:** 2026-07-14T03:08:26Z
- **Tasks:** 3
- **Files modified:** 10 (8 modified, 2 new test files)

## Accomplishments
- `productSchema.hideWhenSoldOut` (three-state enum) wired through `parseProductFormData`/`saveProduct`/`updateProduct` — "" persists `null`, "true"/"false" persist explicit booleans
- `product-form.tsx` gained a "Visibilidade" section (3-option select); `[id]/editar/page.tsx` hydrates the field correctly from the stored `boolean | null`
- `saveStoreSettings` now persists `stores.hide_sold_out_default` and — only on a genuine change — resets every product's `hide_when_sold_out` to `null` in the same store (D-11), verified by two tests: one proving the reset fires on change, one proving it does NOT fire on an unrelated resubmit

## Task Commits

Each task was committed atomically:

1. **Task 1: Campo hide_when_sold_out (schema + Server Action)** - `92514fd` (feat)
2. **Task 2: UI do campo + hidratação em editar** - `6f09b01` (feat)
3. **Task 3: Preferência global + reset condicional D-11** - `bb7558f` (feat)

**Plan metadata:** committed together with this SUMMARY (see git log for hash)

## Files Created/Modified
- `src/lib/validation/product.ts` - `hideWhenSoldOut` enum field
- `src/lib/products/actions.ts` - parse/persist `hide_when_sold_out` in `saveProduct`/`updateProduct`
- `src/app/(admin)/produtos/product-form.tsx` - visibility select UI
- `src/app/(admin)/produtos/[id]/editar/page.tsx` - hydrates `hideWhenSoldOut` from stored value
- `src/lib/validation/onboarding.ts` - `hideSoldOutDefault` optional enum
- `src/lib/settings/actions.ts` - `saveStoreSettings` persists default + D-11 conditional reset
- `src/app/(admin)/configuracoes/settings-form.tsx` - store-wide default select UI
- `src/app/(admin)/configuracoes/page.tsx` - selects/passes `hide_sold_out_default`
- `tests/products/hide-when-sold-out.test.ts` - 4 tests covering all 3 states + update transition
- `tests/settings/hide-sold-out-default.test.ts` - 2 tests covering D-11 change-detection

## Decisions Made
- None beyond what's already documented in `key-decisions` above — plan executed as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Regression checks (`tests/products/create-product.test.ts`, `tests/settings/store-settings-update.test.ts`) both remained green after the schema/action changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The write side of D-09/D-10/D-11 is fully in place and tested — Plan 04-06 can now implement the read side (applying `effectiveHide = product.hide_when_sold_out ?? store.hide_sold_out_default` inside `queryPublicProducts`) with real data to test against, including the D-11 reset scenario end-to-end.
- No blockers. This plan's files are entirely disjoint from Plan 04-02/04-03/04-04's files (`src/app/loja/[slug]/*`, `src/lib/products/public-list.ts`, `src/lib/products/public-actions.ts`), so it required no coordination with that parallel work.

---
*Phase: 04-vitrine-p-blica-e-filtragem*
*Completed: 2026-07-14*
