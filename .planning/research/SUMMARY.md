# Project Research Summary

**Project:** Vitrino — Brazilian micro-SaaS catalog/storefront for imported soccer cleat resellers  
**Domain:** Two-sided mobile-first SaaS (admin panel + public no-login storefront) with WhatsApp order handoff  
**Researched:** 2026-07-10  
**Confidence:** MEDIUM (HIGH on technology facts, MEDIUM on features/architecture patterns, MEDIUM-HIGH on pitfalls based on competitive research + UX best practices)

---

## Executive Summary

Vitrino is a marketplace coordination tool for non-technical resellers in Brazil's competitive soccer-cleat resale niche. Success depends entirely on one conversion moment: a customer landing on a storefront link (shared via Instagram/WhatsApp), selecting a size, and tapping "order now" to open WhatsApp with a pre-filled message. Any friction in that flow kills the product — and research confirms three overlapping risks that must drive early phase sequencing: (1) the WhatsApp deep link is surprisingly brittle (phone formatting, encoding, in-app-browser compatibility), (2) multi-tenant isolation via RLS is powerful but silent-when-broken, and (3) the public storefront must never be gated by auth middleware, which is a structural guarantee in Next.js only if enforced at the routing level, not in code.

The recommended stack (Next.js 16 + Supabase + Vercel Pro, **not** the originally suggested v14 + Hobby) is modern, cost-appropriate for the "dezenas" launch scale, and aligns with how mature competitors in this category (Gopage, Vendizap) bootstrap. The feature scope is well-validated against competitors and neither over- nor under-scoped for MVP. The architecture follows proven multi-tenant patterns but imposes strict structural constraints (route isolation, RLS-first data model, client-side link construction) that must be embedded during foundation phases, not retrofitted.

**Bottom line for roadmap:** The dependency chain is deep (auth → RLS data layer → admin CRUD → storefront → WhatsApp link generation → metrics). Each phase must verify specific pitfalls before the next phase begins. Defer nothing about the WhatsApp link flow to "refinement later" — it's the non-negotiable core, and testing it exhaustively (Brazil-specific phone formats, accented product names, Android/iOS/in-app browsers) is a blocker for launch readiness.

---

## Key Findings

### Recommended Stack

Start with **Next.js 16.2.x + React 19.2.x + Tailwind CSS 4.x + Supabase + Vercel Pro ($20/mo)**.

The original spec recommended Next.js 14, which is two majors behind (current stable: 16.2.10 as of this research). Starting on 14 means immediately inheriting deprecated APIs and migrating them within months. More critically: Next 16's **Cache Components** model (opt-in caching via `"use cache"` directive) makes the public storefront dynamic-by-default, which is perfect for the project's critical requirement (stock freshness within seconds, never minutes). With 14, the implicit caching model works against this requirement.

The original spec used Vercel Hobby (free), which violates Vercel's own fair-use terms for commercial products (Vitrino is revenue-oriented even if pre-monetization). This must be flagged: Vercel Pro ($20/mo) is the correct production tier from day one.

**Core technologies with rationale:**

- **Next.js 16.2.x** (App Router) — Full-stack React. Turbopack default (2-5× faster builds). Cache Components model gives stock freshness by default.
- **React 19.2.x** — Required by Next 16; bundled dependency, not a separate decision.
- **Tailwind CSS 4.x** — CSS-first config, mobile-first breakpoints (matches "mobile-first storefront" mandate). Default scaffold from `create-next-app@latest`.
- **Supabase** (@supabase/supabase-js 2.110.x + @supabase/ssr 0.12.x) — Postgres + Auth (email/password) + Storage in one project. Row-Level-Security (RLS) maps cleanly to multi-tenant isolation. Anon-key for public storefront reads avoids auth middleware on that route.
- **Vercel (Pro tier)** — Zero-config Next.js hosting, edge middleware for `/admin` auth checking, image CDN.
- **browser-image-compression (2.0.2)** — Mandatory, not optional. Compress client-side before upload to meet "upload rápido" + 5MB limit requirements. Supabase's server-side Image Transformations are Pro-plan only (not free tier), so client-side is the only MVP-viable approach.
- **Supporting:** zod (validation), react-hook-form (forms), sonner (toast feedback), qrcode (QR generation), clsx/tailwind-merge (conditional styling), lucide-react (icons)

See STACK.md for detailed library versions, installation instructions, and integration patterns.

### Expected Features

Features are well-scoped and validated against three overlapping reference categories: BR catalog-tools (Gopage, Vendizap, Vou Pedir), global social-commerce tools (Catlog, WhatsApp Business Catalog), and link-in-bio tools (Linktree, Beacons). Competitor analysis confirms the niche has converged on "catalog + WhatsApp button, no payment, no cart" at the entry tier — exactly where Vitrino's MVP sits.

**Table stakes (users expect these — missing any kills product viability):**

- Product CRUD with photos, price, sizes/variants
- Size selection before order action
- One-tap "order now" opening WhatsApp pre-filled
- Out-of-stock indication per variant
- Shareable link + basic branding
- Mobile-first responsive storefront
- Filters (brand, sole type, modality)
- Custom slug for sharing
- QR code for link
- Basic visit/click metrics
- Simple email/password signup (no OAuth)

**Should have (differentiators — competitive advantage once MVP validates):**

- Niche-specific taxonomy (sole type, modality, brand as first-class fields)
- Portuguese-first, BRL-native UX
- Yupoo import assist (highest-leverage niche-specific feature)
- Duplicate product for variant creation
- Multiple catalogs (pronta entrega vs sob encomenda)

**Defer entirely (v2+ or never):**

- Payment gateway/checkout — actively counter to value prop
- Full order CRM — duplicates WhatsApp itself
- Real-time inventory sync — Yupoo has no API
- Multi-vendor/team accounts — target is solo reseller
- AI product descriptions — short, formulaic here
- WhatsApp Business API integration — disproportionate for MVP

See FEATURES.md for detailed dependency chain and competitor analysis.

### Architecture Approach

Use shared-schema multi-tenancy with RLS-enforced isolation (one Postgres schema, multiple resellers, row-level policies prevent cross-tenant reads/writes). This is simpler than schema-per-tenant at "dezenas" scale and cheaper on Supabase free tier.

Two authentication domains run in the same codebase but are strictly separated: (1) `/admin/**` routes are authenticated (reseller login) and protected by Next.js middleware, (2) `/loja/[slug]` is public (no auth check ever) and served via Supabase anon key. The middleware matcher must be scoped to `/admin/:path*` only — a broad matcher with an allowlist of public exceptions is a footgun that regresses silently.

Three architectural patterns matter: (1) Shared-schema RLS with owner isolation, (2) Slug-resolved public rendering using anon-key client, (3) Mutation-triggered freshness (no cache on storefront).

**Major components:**

1. Admin auth — Supabase email/password + Next.js middleware scoped to `/admin`
2. Data model — Supabase Postgres + RLS enforcing multi-tenant boundaries
3. Product CRUD — Server Actions, authenticated client
4. Media pipeline — Client-side compression → Supabase Storage → next/image
5. Store config — WhatsApp number + template, branding
6. Public storefront — Server Component, anon-key client, no-cache fetch
7. WhatsApp link generator — Pure client-side function, no server round-trip
8. Metrics/events — Lightweight fire-and-forget insert

See ARCHITECTURE.md for detailed patterns and anti-patterns.

### Critical Pitfalls

Research validated all 10 original pitfalls and identified 9 additional critical ones. Top priorities:

1. **`wa.me` phone number formatting is stricter than "validate it"** — Raw input produces broken links. Normalize to E.164 format (digits-only, country code, no spaces) at save-time. Show confirmation to user. Unit-test against all malformed cases.

2. **`encodeURIComponent` alone doesn't guarantee working message** — Double-encoding produces garbled output. Build full plain-text string once, then encode exactly once. Test with Portuguese accents + real line breaks on device.

3. **Public storefront route accidentally gated by auth middleware** — Broad middleware matcher silently starts requiring auth. Fix: middleware matcher is `/admin/:path*` only (whitelist protected routes). Add automated smoke test on every deploy.

4. **Supabase RLS misconfiguration is silent, not loud** — Missing RLS enables full data leak. Forgetting policies returns empty results (looks like frontend bug). Enable RLS on every table at creation. Test isolation with two seeded accounts.

5. **Sold-out size pills need more than CSS `pointer-events: none`** — Stale state leaves pill appearing available. Disable at data layer, re-validate at click-time. Combine multiple CSS properties (belt and suspenders).

Additional critical pitfalls: slug uniqueness race (DB constraint required), image upload size/EXIF (client + server normalization), in-app-browser compatibility, silent auth token expiry (draft persistence).

See PITFALLS.md for detailed prevention strategies.

---

## Implications for Roadmap

Phase ordering is driven by: (1) dependency chain from FEATURES.md, (2) pitfall prevention (each phase must ship with specific validations). Critical path: foundation → admin CRUD → storefront rendering → WhatsApp link generation. Exhaustive WhatsApp testing is a blocker for MVP launch.

### Phase 1: Foundation & Multi-Tenant Data Layer

**Rationale:** Auth and RLS isolation are foundational. RLS misconfiguration is silent, so early validation is critical.

**Delivers:**
- Supabase project setup (schema, Auth, Storage)
- RLS policies for all tables
- Middleware scoped to `/admin/:path*` only (structural guarantee for public route)
- Slug uniqueness DB constraint

**Avoids:** RLS misconfiguration, public route gating, slug race conditions

**Acceptance criteria:**
- [ ] RLS enabled on every table; two-tenant isolation test passes
- [ ] Middleware matcher is `/admin/:path*` only; smoke test (curl `/loja/test-slug` without auth) passes
- [ ] Slug has UNIQUE constraint
- [ ] Local Supabase CLI environment working

---

### Phase 2: Admin Panel & Store Configuration

**Rationale:** Once auth/RLS work, establish store configuration surface. Surfaces the highest-risk input: WhatsApp phone number.

**Delivers:**
- Store settings (WhatsApp number, message template, branding)
- Admin dashboard shell (authenticated, reseller-only)
- Phone number normalization (Brazil-specific: E.164, digits-only, country code)
- Store slug setup with validation
- Toast notifications on save/delete

**Avoids:** Phone number formatting, missing feedback

**Acceptance criteria:**
- [ ] Unit tests for phone normalization (all malformed cases)
- [ ] Manual device test: real WhatsApp number, link preview, confirmed correct
- [ ] Duplicate slug rejected with friendly message
- [ ] Toast feedback on every admin action

---

### Phase 3: Product CRUD & Media Pipeline

**Rationale:** With auth/config in place, build the primary admin tool. Establish image upload pattern (client-side compression mandatory, EXIF normalization).

**Delivers:**
- Product CRUD (create, edit, delete)
- Size/variant management
- Photo upload with client-side compression (browser-image-compression)
- Server-side EXIF normalization
- next/image integration with Supabase Storage
- Product dashboard

**Avoids:** Unrestricted upload size, EXIF rotation, broken images

**Acceptance criteria:**
- [ ] Upload real phone-camera photo; verify final stored size is compressed and displays upright
- [ ] Compression progress shown before upload
- [ ] 5MB hard limit enforced before compression
- [ ] Broken image URL shows fallback placeholder

---

### Phase 4: Public Storefront & Filtering

**Rationale:** With products in DB, render catalog. Establishes patterns for public-route data access and filtering (URL query params, shareable links).

**Delivers:**
- Public storefront (`/loja/[slug]`)
- Product grid with responsive images
- Filters persisted in URL query params (shareable)
- Pagination (~20 products per load)
- Loading skeleton

**Avoids:** Filters not in URL, unfiltered rendering, broken images

**Acceptance criteria:**
- [ ] Filtered URL loaded fresh reproduces same view
- [ ] Filters work across browsers/devices
- [ ] Pagination loads next 20 without full reload
- [ ] Images load progressively

---

### Phase 5: Size Selection & WhatsApp Order Flow

**Rationale:** CRITICAL PHASE. Single most important moment. Everything converges here. Hard blocker for MVP launch.

**Delivers:**
- Size selection UI (pills for available sizes, sold-out distinct + unselectable)
- Re-validation at click-time
- WhatsApp link generation (normalize phone + encode message exactly once)
- WhatsApp click tracking (fire-and-forget)
- Fallback message/number copy

**Avoids:** All WhatsApp formatting pitfalls, sold-out selectability, in-app-browser failures

**Mandatory test matrix (before sign-off):**
- Android: Chrome, Samsung Internet, Firefox
- iOS: Safari, Chrome
- iOS/Android: Instagram in-app browser, WhatsApp in-app browser
- Test with: real BR WhatsApp numbers, accented names, multi-line template

**Acceptance criteria:**
- [ ] WhatsApp opens with pre-filled message on every test combination
- [ ] Accented characters display correctly (not garbled)
- [ ] No double-encoding or percent artifacts
- [ ] Sold-out cannot be selected (rapid click, keyboard Enter)
- [ ] Click tracking logged (fire-and-forget)
- [ ] Fallback copy-to-clipboard works if link fails
- [ ] Dashboard shows WhatsApp click metrics correctly

---

### Phase 6: Metrics Dashboard & Admin Analytics

**Rationale:** Aggregate tracked events into simple dashboard for reseller. Keep minimal (basic counters, top products) — advanced analytics is v2+.

**Delivers:**
- Events dashboard (pageviews, top products, WhatsApp click count)
- Most-viewed products list
- Recent products summary
- Simple time-series

---

### Phase 7: QR Code & Shareable Link Features

**Rationale:** Low-cost QR generation. Resellers use QR in physical contexts (fairs, packaging).

**Delivers:**
- QR code generation from slug URL
- Downloadable QR image
- QR display in admin settings + storefront footer

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Technology versions verified against npm registry, Next.js blog, official docs. Vercel Hobby/Pro distinction confirmed. One flag: Next 16's Cache Components are new (Oct 2025) — no real-world MVP experience yet. |
| **Features** | **MEDIUM-HIGH** | Competitors analyzed publicly. Features cross-checked against category norms. No direct user interviews, so validated against competitors, not customers. Table stakes unlikely wrong; differentiators inferred from pain points. |
| **Architecture** | **MEDIUM** | Patterns are standard/well-documented. Specific plan solid for "dezenas" scale. Uncertainty: how far to leverage Cache Components for performance. Scaling assumptions for "100k+ views/day" are speculative. |
| **Pitfalls** | **MEDIUM** | All pitfalls validated against research sources. Technical mechanics (RLS, middleware) are HIGH-confidence. UX pitfalls are MEDIUM (best practices + observation, not user testing). LOWEST: in-app browser compatibility — must be validated by manual testing. |
| **Overall** | **MEDIUM** | Stack is HIGH. Features well-researched. Patterns are standard but tight dependency chain focuses risk. Execution risk is in details (RLS correctness, WhatsApp testing, mobile compatibility). |

### Gaps to Address

1. **WhatsApp in-app browser compatibility** — LOW-confidence (no official spec, behavior varies per app version). Must validate during Phase 5 via real devices or cloud device lab.

2. **Phone number edge cases beyond Brazil** — Normalization is BR-focused. Confirm it works for "55DDXXXXXXXXX" format only. Future: validate for other regions if product expands.

3. **Supabase free-tier scaling limits** — Assumes "dezenas" resellers. If adoption exceeds expectations, have Supabase Pro upgrade path ready (monitor Phase 6-7).

4. **Image storage cost projections** — Client-side compression reduces risk, but validate cost during Phase 3 at realistic product counts.

5. **Yupoo import differentiator** — Deferred to v1.x, identified as highest-leverage niche-specific. During v1.x planning: investigate Yupoo API availability, gallery selection UX, scraping ToS implications.

6. **Vercel Pro cost transparency** — STACK.md identifies Vercel Pro ($20/mo) as mandatory. Verify this cost assumption with user before shipping; if "$0" is hard constraint, Cloudflare Pages is alternative (at cost of losing zero-config integration).

---

## Sources

### Primary (HIGH confidence)

- **npm registry** — Stack technologies verified: Next.js 16.2.10, React 19.2.7, Tailwind 4.3.2, Supabase packages, browser-image-compression, sharp
- **Next.js 16 official blog** — Cache Components model, Turbopack, breaking changes, version requirements
- **Vercel documentation** — Hobby Plan commercial restriction, Pro tier requirements
- **Supabase official docs** — RLS, Auth (@supabase/ssr), Storage, Image Transformations pro-plan gating
- **WhatsApp Help Center** — Business Catalog features, 500-item limit, chat-only model
- **STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md** — This project's research outputs

### Secondary (MEDIUM confidence)

- **Competitor analysis** — Gopage, Vendizap, Vou Pedir, Catlog public websites
- **Web search (multiple sources)** — WhatsApp deep-links, phone normalization, RLS patterns, image compression, in-app browser compatibility
- **Baymard Institute** — ecommerce UX best practices
- **Next.js multi-tenant guide** — Architecture patterns
- **Supabase RLS best practices** — Policy templates, common mistakes

### Tertiary (LOW/ANECDOTAL confidence)

- **In-app browser (Instagram WebView) wa.me compatibility** — No official spec; behavior reports vary. Needs validation during Phase 5.
- **EXIF orientation handling** — Implementation varies across browsers; plan to normalize server-side.

---

*Research completed: 2026-07-10*  
*Synthesized by: gsd-synthesizer agent*  
*Ready for roadmap creation: YES*
