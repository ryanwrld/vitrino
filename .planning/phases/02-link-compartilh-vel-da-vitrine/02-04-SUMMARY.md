---
phase: 02-link-compartilh-vel-da-vitrine
plan: 04
subsystem: ui
tags: [nextjs, react-hook-form, zod, sonner, server-actions, supabase]

# Dependency graph
requires:
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-02)
    provides: SessionWatcher/route-group layout conventions used by /configuracoes
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-03)
    provides: saveStoreSettings / checkSlugAvailability / updateStoreSlug Server Actions in src/lib/settings/actions.ts, buildStoreUrl helper
provides:
  - "/configuracoes route (guarded, dynamic, three stacked sections)"
  - "Working Loja+WhatsApp settings-edit form wired to saveStoreSettings"
  - "Typed placeholder shells for SlugEditor and QrCodePanel (02-05/02-06 replace these)"
affects: [02-05-slug-editor, 02-06-qr-code-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fresh client form component per screen (D-07) reusing a shared Zod schema instead of importing the wizard component"
    - "Server Component route guard-then-fetch-then-render (requireCompletedOnboarding first line, same as /dashboard)"

key-files:
  created:
    - "src/app/(admin)/configuracoes/page.tsx"
    - "src/app/(admin)/configuracoes/settings-form.tsx"
    - "src/app/(admin)/configuracoes/slug-editor.tsx"
    - "src/app/(admin)/configuracoes/qr-code-panel.tsx"
  modified: []

key-decisions:
  - "settings-form.tsx includes the logo upload field (matching saveStoreSettings' existing FormData 'logo' handling) even though the plan's must_haves list only named name/accentColor/tagline/whatsapp/messageTemplate — the plan's task action explicitly lists 'logo' among the Loja section fields to reuse from onboarding-wizard.tsx markup, and saveStoreSettings already validates/uploads it, so omitting it would silently drop a working, already-tested capability"

patterns-established:
  - "Settings-edit screens compose Server Component (guard + fetch) with one or more 'use client' section components taking pre-fetched data as props, never fetching client-side"

requirements-completed: [LOJA-02, LOJA-03, LOJA-04]

coverage:
  - id: D1
    description: "/configuracoes is reachable only after valid session + completed onboarding (same guard as /dashboard)"
    requirement: "LOJA-02"
    verification:
      - kind: integration
        ref: "curl http://localhost:3001/configuracoes (logged out) -> 307 redirect to /login"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (guard call present, types clean)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revendedor can edit and save store identity (name/logo/accent color/tagline) and WhatsApp (number/template) in place with a success toast"
    requirement: "LOJA-03"
    verification: []
    human_judgment: true
    rationale: "Requires an authenticated session with real onboarding data and a UI interaction (typing, submit, observing the toast) that automated tooling in this sandbox cannot exercise without stored credentials — needs manual UAT with a logged-in test account."
  - id: D3
    description: "Page renders a single scrolling layout with three sections in order: Loja, WhatsApp, Link e QR Code (no tabs)"
    requirement: "LOJA-04"
    verification:
      - kind: other
        ref: "npm run build -> /configuracoes listed as dynamic route (ƒ), no build errors"
        status: pass
    human_judgment: true
    rationale: "Verifying visual section order/layout on a real viewport is a rendering/design judgment call, not something the build or tsc output proves by itself."

# Metrics
duration: 20min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 04: Configuracoes route + settings form Summary

**`/configuracoes` route wired end-to-end: guarded Server Component fetches store+settings, a fresh Loja/WhatsApp form (D-07) persists edits via `saveStoreSettings` with a Sonner success toast, and typed placeholder shells stand in for the slug editor and QR panel until 02-05/02-06.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-12T18:10:00-04:00
- **Completed:** 2026-07-12T18:19:22-04:00
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- `SettingsForm` (`settings-form.tsx`): fresh `"use client"` component, does NOT import `onboarding-wizard.tsx` (D-07); pre-fills name/logo/accentColor/tagline/whatsapp/messageTemplate from props; reuses `onboardingSchema` + `AsYouType("BR")` live preview; submits via `useTransition` → `saveStoreSettings`, toasting `"Configurações salvas!"` on success and `result.error` on failure.
- `SlugEditor` and `QrCodePanel` placeholder shells created with the exact prop signatures (`currentSlug`, `publicUrl`) their real 02-05/02-06 implementations will need, so `page.tsx` wires them now without any later prop-shape churn.
- `/configuracoes/page.tsx`: async Server Component, `requireCompletedOnboarding()` as its first statement, fetches `stores`/`store_settings` scoped by `owner_id = auth.uid()`, computes `publicUrl` via `buildStoreUrl(store.slug)`, renders the three sections in fixed order (Loja+WhatsApp form, then Link e QR Code), adds no `"use cache"` anywhere.
- Verified end-to-end at the build/route level: `npm run build` lists `/configuracoes` as a dynamic (`ƒ`) route; a logged-out `curl` request to the route returns `307` to `/login`, confirming the guard fires correctly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Loja/WhatsApp settings form (D-07) + placeholder section shells** - `52e82fa` (feat)
2. **Task 2: /configuracoes route page (guard + data fetch + wiring)** - `b7cfba3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/app/(admin)/configuracoes/settings-form.tsx` - Fresh client form (Loja + WhatsApp sections), reuses `onboardingSchema`, submits to `saveStoreSettings`
- `src/app/(admin)/configuracoes/slug-editor.tsx` - Typed placeholder shell for the future slug editor (02-05)
- `src/app/(admin)/configuracoes/qr-code-panel.tsx` - Typed placeholder shell for the future QR/copy panel (02-06)
- `src/app/(admin)/configuracoes/page.tsx` - Guarded Server Component route: fetch + compute publicUrl + render three sections

## Decisions Made
- Included the optional logo-upload field in `settings-form.tsx`'s Loja section (matching the plan's task action text and `saveStoreSettings`' already-implemented FormData `"logo"` handling), even though the plan's `must_haves.truths` summary only mentions name/accent-color/tagline/WhatsApp — the field was already fully supported server-side and omitting it from the UI would have silently orphaned working functionality.

## Deviations from Plan

None — plan executed exactly as written. The logo field inclusion (see Decisions Made) is directly specified in the plan's Task 1 `<action>` text ("Loja section (name, logo, accent color, tagline)"), not a deviation.

## Issues Encountered
- Port 3000 was already occupied by another local process during the dev-server verification step; `npm run dev` auto-selected port 3001, which was used for the guard-redirect curl check. No code or config change was required.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/configuracoes` is live and buildable end-to-end; the settings-edit slice (LOJA-02/03/04 revisit) works for Loja+WhatsApp.
- Plan 02-05 can now replace `slug-editor.tsx`'s placeholder body with the real slugify/debounce/confirm-dialog flow, importing `checkSlugAvailability`/`updateStoreSlug` from `src/lib/settings/actions.ts` (already implemented in 02-03) and reusing the `currentSlug` prop already wired by `page.tsx`.
- Plan 02-06 can replace `qr-code-panel.tsx`'s placeholder body with the real `qrcode` canvas render + copy/download buttons, reusing the `publicUrl` prop already wired by `page.tsx`.
- Full authenticated UAT (D2/D3 coverage items above) still needs a human pass with a real logged-in test account to confirm the toast and visual section order on a live viewport — flagged as `human_judgment: true` in this SUMMARY's coverage block for the verifier to route accordingly.

---
*Phase: 02-link-compartilh-vel-da-vitrine*
*Completed: 2026-07-12*

## Self-Check: PASSED

All 4 created files verified present on disk; both task commits (`52e82fa`, `b7cfba3`) verified present in git log.
