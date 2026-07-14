---
phase: 5
slug: fluxo-de-pedido-no-whatsapp-cr-tico
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `vitest.config.ts` (environment: `"node"` — no jsdom, no React Testing Library installed) |
| **Quick run command** | `npx vitest run <new test file for the task>` |
| **Full suite command** | `npm test` (== `vitest run`) |
| **Estimated runtime** | ~10-20 seconds (mix of pure-function unit tests + real-Supabase RLS integration tests) |

**Critical framework gap:** no DOM rendering capability exists in this codebase (no jsdom, no `@testing-library/react`). Client-side interaction behavior — shake animation, tooltip, pointer/keyboard guards on the sold-out pill, real click-then-navigate — cannot be automated with current infrastructure. This is why the ROADMAP mandates an exhaustive manual device/browser matrix as this phase's actual closing gate.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <new test file for that task>`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green **and** the mandatory manual device/browser matrix (Android Chrome/Samsung Internet/Firefox, iOS Safari/Chrome, Instagram in-app, WhatsApp in-app) must be completed — this phase cannot close on automated tests alone.
- **Max feedback latency:** ~20 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-xx | 01 | 0/1 | PED-02 (data) | V5 | Detail query only returns/marks sizes with `available=true` | integration | `npx vitest run tests/storefront/product-detail.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-xx | 01 | 0/1 | PED-03 | — | Template interpolation + single-pass `encodeURIComponent`, accents + multi-line | unit | `npx vitest run tests/products/order-message.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-xx | 02 | 1 | D-09/D-10 | V1/V4 | anon insert-only on `order_clicks`; owner reads scoped to own store; mismatched product/store rejected | integration | `npx vitest run tests/rls/order-clicks-rls.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-xx | 02 | 1 | D-01 (store_settings exposure) | V1/V4 | anon can read `whatsapp_e164`/`message_template` only for stores with ≥1 published product | integration | `npx vitest run tests/storefront/store-settings-public-read.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-xx | 01 | 0/1 | PED-04 (logic) | — | Pure decision function: `selectedSize` → `{shouldNavigate, shouldShake}` | unit | `npx vitest run tests/products/order-button-guard.test.ts` (optional) | ❌ W0 | ⬜ pending |
| 05-01-xx | 01 | 1 | Sold-out-hide bypass | — | Detail page query returns nothing for hidden-by-sold-out-rule product, matching grid behavior | integration | `npx vitest run tests/storefront/product-detail.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/products/order-message.test.ts` — template interpolation + `encodeURIComponent` round-trip with accented/special characters (ã, ç, é) and a multi-line template (PED-03)
- [ ] `tests/storefront/product-detail.test.ts` — `queryPublicProductDetail`: published+visible returns data; unpublished/not-found returns null; hidden-by-sold-out-rule returns null (reuses `isVisible()`)
- [ ] `tests/rls/order-clicks-rls.test.ts` — anon insert (valid/invalid payloads), owner read scoping, cross-tenant isolation
- [ ] `tests/storefront/store-settings-public-read.test.ts` — anon read gated on ≥1 published product per store

*No test-runner installation needed — Vitest already configured; jsdom/RTL explicitly not introduced (client interaction stays manual-matrix-verified by design).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Pedir agora" only navigates once a size is selected | PED-01 | Requires real click/DOM interaction; no jsdom in this project | Run the mandatory device/browser matrix (Android Chrome/Samsung Internet/Firefox, iOS Safari/Chrome, Instagram in-app, WhatsApp in-app): select a size, tap "Pedir agora", confirm WhatsApp opens with correct message |
| Sold-out pill click/Enter guard no-ops in a real browser | PED-02 (interaction) | Keyboard/pointer event dispatch, no DOM test runner; `pointer-events: none` alone does not block Enter/Space activation | On each matrix browser: tab to a sold-out size pill, press Enter/Space, confirm no selection/navigation occurs; also try rapid double-click |
| Shake animation + tooltip fire on invalid click, never navigates | PED-04 (interaction) | CSS animation + DOM, no jsdom | On each matrix browser: tap "Pedir agora" with no size selected, confirm shake + "Selecione um tamanho" tooltip appear and WhatsApp does NOT open |
| Copy-message fallback + clipboard write | D-07/D-08 | Clipboard API support varies across in-app webviews | On each matrix browser (especially Instagram/WhatsApp in-app), tap "Copiar mensagem", confirm toast "Mensagem copiada!" and paste target receives full message with photo URL |
| Fire-and-forget click log does not delay/block WhatsApp navigation | D-10 | Requires observing real navigation timing across browsers/in-app webviews, especially same-tab unload behavior | On each matrix browser: click "Pedir agora", confirm WhatsApp opens immediately without a visible delay/spinner; separately confirm a row lands in `order_clicks` |
| Encoding correctness end-to-end (not just the pure-function test) | PED-03 | Must be seen rendered inside the real WhatsApp app/webview, not just asserted in Node | On each matrix browser, use a product with accented name (ã, ç, é) and confirm message renders correctly with no double-encoding or mojibake |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
