---
phase: 2
slug: link-compartilh-vel-da-vitrine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (confirmed in `package.json`/`vitest.config.ts`) |
| **Config file** | `vitest.config.ts` (environment: node, include: `tests/**/*.test.ts`, `@/` alias to `src/`) |
| **Quick run command** | `npx vitest run <specific-file>` |
| **Full suite command** | `npm test` (runs `vitest run`) |
| **Estimated runtime** | ~30 seconds (in line with existing 35-test suite from Phase 1) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <relevant-file>`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-0X-XX | TBD | 0 | LOJA-02 | — | Slug format validation rejects <3 or >30 chars, invalid charset | unit | `npx vitest run tests/slug/validation.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | LOJA-02 | — | Slugify correctly folds diacritics (`café` → `cafe`) | unit | `npx vitest run tests/slug/slugify.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | LOJA-02 | V4 | `checkSlugAvailability` returns `available: false` for a slug owned by a different store (RLS cross-tenant regression guard) | integration | `npx vitest run tests/settings/slug-availability.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | LOJA-02 | V5 | `updateStoreSlug` surfaces a friendly error on `unique_violation` (23505), not a raw DB error | integration | `npx vitest run tests/settings/update-slug.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | LOJA-03 | — | QR code component renders and produces a downloadable PNG data URL for a given public URL | unit | `npx vitest run tests/settings/qr-code.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | LOJA-04 | — | Copy button writes the exact public URL string to clipboard | unit (mock `navigator.clipboard`) | `npx vitest run tests/settings/copy-link.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-XX | TBD | 0 | Onboarding revisit (LOJA-01/WPP-01/WPP-02) | — | `saveStoreSettings` persists edited name/color/tagline/whatsapp/template, scoped by `owner_id` | integration | `npx vitest run tests/settings/store-settings-update.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are TBD — the planner fills these in once PLAN.md files are written; this table's requirement/test mapping is locked from RESEARCH.md and must not be dropped.*

---

## Wave 0 Requirements

- [ ] `supabase/migrations/0002_slug_availability_rpc.sql` — new migration: `SECURITY DEFINER` RPC `is_slug_available`, pinned `search_path`, granted only to `authenticated`, returns boolean only (never row data) — required before any integration test below can run against a real Supabase test project
- [ ] `tests/slug/slugify.test.ts` — stubs for LOJA-02 diacritic-folding correctness (new shared `slugify()` utility, extracted from/aligned with `generateStoreSlug`)
- [ ] `tests/slug/validation.test.ts` — stubs for LOJA-02 format validation (Zod schema, 3–30 chars, `[a-z0-9-]`, no leading/trailing hyphen)
- [ ] `tests/settings/slug-availability.test.ts` — stubs for LOJA-02's most critical regression: cross-tenant RLS isolation on the new RPC (mirror `tests/rls/isolation.test.ts` structure/fixtures)
- [ ] `tests/settings/update-slug.test.ts` — stubs for LOJA-02 race-condition/unique_violation handling
- [ ] `tests/settings/qr-code.test.ts` — stubs for LOJA-03
- [ ] `tests/settings/copy-link.test.ts` — stubs for LOJA-04
- [ ] `tests/settings/store-settings-update.test.ts` — stubs for onboarding-data-revisit requirement (adapt fixtures from `tests/onboarding/store-settings.test.ts`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual confirmation of QR Code scan (a real phone camera reads the downloaded PNG and opens the correct vitrine URL) | LOJA-03 | Scanning behavior with a real camera/QR reader app is not automatable | Baixar o PNG gerado na tela `/configuracoes`, escanear com a câmera de um celular real, confirmar que abre a URL correta da vitrine |
| Confirmation dialog UX (native `<dialog>` + `showModal()`) reads clearly to a non-technical user and blocks accidental slug changes | LOJA-02 (D-04/D-08) | Subjective copy/UX judgment, not a pass/fail assertion | Trocar o slug na tela de configurações, confirmar que o diálogo nativo aparece, texto é compreensível, e cancelar não altera nada |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
