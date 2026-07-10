# Stack Research

**Domain:** Two-sided micro-SaaS — admin catalog panel + public no-login mobile storefront with WhatsApp checkout handoff (Brazil, imported soccer cleats resale)
**Researched:** 2026-07-10
**Confidence:** MEDIUM overall (HIGH on library/version facts pulled directly from npm/official docs; MEDIUM on ecosystem opinions from web search, cross-checked across multiple independent sources)

## Verdict on the Suggested Stack

The author's suggestion — **Next.js 14 + Tailwind CSS + Supabase (auth/Postgres/storage) + Vercel** — is directionally correct and should be kept as the architecture shape (one framework, one BaaS, one host). Two things need updating before you start:

1. **Next.js 14 is two majors behind.** Current stable is **Next.js 16.2.x** (16 shipped Oct 2025; 16.2.10 is latest on npm as of this research). Starting a greenfield project on 14 in mid-2026 means immediately inheriting deprecated APIs (`middleware.ts`, sync `params`/`cookies()`) that you'd have to migrate within months. Start on 16.
2. **Vercel Hobby (the free tier) is contractually non-commercial.** Vitrino is a revenue-oriented SaaS (freemium, monetization deferred but the product itself is commercial) — this technically requires Vercel **Pro ($20/mo)** for the production deployment per Vercel's own fair-use terms, even with $0 in actual billing today. This changes the "runs at $0/month" assumption in PROJECT.md's Key Decisions and should be flagged to the user explicitly (see What NOT to Use / Confidence Assessment below).

Everything else in the suggestion (Tailwind, Supabase for auth+DB+storage, single hosting provider) holds up well against 2026 alternatives and is confirmed below.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | **16.2.x** (App Router) | Full-stack React framework — admin panel + public storefront in one codebase | Current stable major (superseded 14 in Oct 2025). Turbopack is now the default bundler (2-5x faster builds, up to 10x faster refresh — matters for a solo/small team iterating fast). Most importantly: Next 16's **Cache Components** model flips caching from opt-out to **opt-in** (`"use cache"` directive) — every route is dynamic by default unless you explicitly cache it. This is a direct win for this project: the public storefront's stock state (`critical alert #4` in PROJECT.md — delay must be seconds, never minutes) is correct by default with zero extra sync plumbing, because you simply never add `"use cache"` to that route. |
| React | **19.2.x** | UI library (bundled dependency of Next 16) | Required by Next 16 (uses React Canary/19.2 features — View Transitions, `useEffectEvent`, `Activity`). Not a separate decision — comes with the Next.js choice. |
| Tailwind CSS | **4.x** (currently 4.3.x) | Styling, mobile-first responsive design | Tailwind v4 is a rewrite (Oxide engine, CSS-first config via `@theme` in `globals.css`, no `tailwind.config.js` needed by default). `create-next-app@latest` now scaffolds Tailwind v4 out of the box — treat v3 as legacy for a greenfield project. The utility-first, mobile-first breakpoint model (`sm:`/`md:`/`lg:` prefixes = min-width) maps directly onto the "mobile-first, not secondary" mandate for the public storefront. |
| Supabase (`@supabase/supabase-js` 2.110.x + `@supabase/ssr` 0.12.x) | Postgres + Auth (GoTrue) + Storage, bundled | Backend-as-a-service: database, reseller login, and product photo storage in one project | Confirmed still the strongest 2026 default for a small full-stack SaaS that needs auth+relational-DB+file-storage together without stitching multiple vendors. Row-Level-Security maps cleanly onto the multi-tenant model (each reseller only sees/edits their own products) and, critically, lets the public storefront route read data **without any auth middleware** (PROJECT.md's hard requirement) via a public/anon RLS policy scoped to published products only. `@supabase/ssr` (not the deprecated `auth-helpers-nextjs`) is the current correct package for Next.js App Router cookie-based session handling. |
| Vercel | Hobby for dev/preview, **Pro ($20/mo) for production** | Hosting, deploy pipeline, image CDN | Still the reference host for Next.js (built by the same team; zero-config; preview URLs per PR are useful for a non-technical stakeholder to review UI). See verdict above on Hobby's non-commercial restriction — budget Pro from day one of production traffic, not as a "scale later" cost. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `browser-image-compression` | 2.0.2 | Client-side image compression/resize in a Web Worker before upload | Always, on every product photo upload in the admin panel. This is the mechanism that satisfies PROJECT.md's "upload rápido e confiável" + "5MB limit with warning before hard error" requirements — compress to target (e.g. `maxSizeMB: 1`, `maxWidthOrHeight: 1600-1920`) client-side before the file ever leaves the reseller's phone. See dedicated section below. |
| `sharp` | 0.35.x | Optional server-side re-encode/thumbnailing | Only if you want a defense-in-depth second pass (e.g. a Vercel Route Handler that re-compresses on upload as a safety net for resellers who bypass client compression, or generates a fixed-size thumbnail for the catalog grid). Not required for MVP if client-side compression is enforced — adding it is a deliberate scope decision, not a default. Already a transitive dependency of `next/image`'s built-in optimizer, so no extra infra needed to add it as a Route Handler dependency. |
| `zod` | 4.4.x | Runtime validation — product form, WhatsApp number format, slug format | Validate reseller-entered data (price as BRL, WhatsApp number in `55DDXXXXXXXXX` format, unique slug pattern) on both client (admin form) and server (Server Action) boundary. |
| `react-hook-form` + `@hookform/resolvers` | 7.81.x / 5.4.x | Admin form state (product CRUD, store config, WhatsApp config) | Standard pairing with Zod for a non-technical user's forms — gives inline validation feedback (a PROJECT.md requirement: "ações do painel sem feedback visual imediato" is a listed bug to avoid). |
| `sonner` | 2.0.x | Toast notifications | Directly addresses the "salvar/excluir/marcar esgotado sem feedback visual" bug called out in PROJECT.md. Lightweight, Tailwind-friendly, works well with Server Actions' `useTransition` pending states. |
| `qrcode` | 1.5.4 | Generate downloadable QR code for the storefront link | Satisfies the "Link personalizável + QR Code para download" requirement — generate client-side or in a tiny Route Handler, no external API/service needed. |
| `clsx` + `tailwind-merge` | 2.1.x / 3.6.x | Conditional className composition | Needed once you have conditional states (sold-out pill styling, active filter chips, button disabled states) — avoids className string concatenation bugs. |
| `lucide-react` | latest (1.24.x) | Icon set | Common pairing with Tailwind/shadcn-style UI; consistent stroke-based icons fit the clean admin-panel aesthetic described in PROJECT.md's visual identity section. |
| `next-themes` | 0.4.x | Only if dark mode is ever needed | Not required by current PROJECT.md scope (fixed brand palette) — list only as a known-good option if a future milestone asks for it. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | Type safety across admin/storefront/Server Actions | `create-next-app@latest` defaults to TypeScript-first config in Next 16's simplified scaffold — accept the default. |
| ESLint (flat config) | Linting | Next 16 removed `next lint`; use ESLint directly (or Biome). `@next/eslint-plugin-next` now defaults to flat config, matching upcoming ESLint v10. Run `npx @next/codemod@canary next-lint-to-eslint-cli .` if you ever migrate an existing 14/15 project. |
| Supabase CLI | Local dev, migrations, type generation (`supabase gen types typescript`) | Generates typed DB schema for use with `@supabase/supabase-js` — removes a whole class of "field renamed, forgot to update the client" bugs given the non-technical target user has zero tolerance for broken flows. |
| Vercel CLI / GitHub integration | Preview deployments per PR/branch | Use preview URLs to get non-technical stakeholder sign-off on UI before merging to production. |

## Installation

```bash
# Scaffold (Next 16 default: App Router, TS, Tailwind v4, ESLint flat config)
npx create-next-app@latest vitrino --typescript --tailwind --eslint --app

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# UI/UX polish
npm install sonner clsx tailwind-merge lucide-react qrcode

# Image compression (client-side, primary compression strategy)
npm install browser-image-compression

# Dev dependencies
npm install -D sharp   # only if adding server-side re-encode as a second pass
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Supabase (bundled auth+DB+storage) | Neon (pure Postgres) + Clerk (auth) + Vercel Blob (storage) | If you specifically want best-in-class serverless Postgres branching (scale-to-zero, instant DB branches per PR) and are willing to integrate 2-3 vendors instead of one. Adds integration surface area with no MVP benefit here — reject for this project. |
| Supabase | Firebase | Only if this were a NoSQL-friendly, mobile-native app. Vitrino's data (products, sizes, prices, slugs, RLS-scoped multi-tenant catalogs) is inherently relational — Firestore's document model is a worse fit and would fight you on filtering/joins for the storefront's brand/sole/modality filters. |
| Vercel | Netlify / Cloudflare Pages | Only if the Hobby-tier commercial-use restriction is a hard blocker and the user wants to stay at literal $0 for longer — Cloudflare Pages' free tier has a more permissive commercial-use policy, at the cost of losing Vercel's zero-config Next.js integration (ISR, ISR ergonomics need extra adapter work outside Vercel). Not recommended as default; only revisit if budget is truly $0 non-negotiable. |
| `browser-image-compression` client-side compression | Supabase Storage image transformations (server-side) | Only once on Supabase Pro ($25/mo) — the transform/Smart CDN feature is **not included in Supabase's free tier** (100 free origin images, then metered). Don't design the MVP assuming this is available. |
| Dynamic (uncached) storefront rendering for stock freshness | Supabase Realtime (Postgres Changes websockets) | Add later as a progressive enhancement if you want stock pills to update live on a tab a customer already has open for minutes. Not needed to satisfy the "seconds, never minutes" requirement, which a plain dynamic render on each page load/navigation already satisfies with far less code. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Next.js 14 as the starting version | Two majors behind; you'd inherit `middleware.ts` (deprecated), sync `params`/`cookies()` (removed in 16), and the old implicit-caching model that actively works against the "stock must be fresh" requirement. Migrating mid-build costs more than starting current. | Next.js 16.2.x |
| Vercel Hobby for the **production** deployment | Per Vercel's own fair-use guidelines, Hobby is restricted to non-commercial personal use; a freemium SaaS with paying resellers (even if $0 is charged in MVP) falls outside those terms. | Vercel Pro ($20/mo) for production; Hobby is fine for personal dev/preview projects only |
| `next/legacy/image` or `images.domains` config | Deprecated in Next 16 in favor of `next/image` + `images.remotePatterns` (needed anyway to whitelist your Supabase Storage public URL host) | `next/image` with `images.remotePatterns` |
| Relying on Supabase's paid image transform API for MVP compression | Not part of the free tier; designing the upload flow around a feature you haven't budgeted for will silently break once traffic/usage triggers metering | `browser-image-compression` client-side (free, works today) |
| Programmatic `window.open()` for the WhatsApp CTA | In-app browsers (Instagram/Facebook webviews — the exact channels PROJECT.md names as primary traffic sources) can block or mishandle JS-triggered popups; Instagram's in-app browser had a specific bug failing to hand off `wa.me` links to the native app (fixed as of Instagram v354, Oct 2024, but older client versions remain in the wild in Brazil) | A real `<a href="https://wa.me/...">` anchor tag — always test explicitly from inside Instagram Stories/bio-link webviews before shipping, not just in a regular mobile browser |
| `whatsapp://send` or `intent://` URL schemes for the primary CTA | Reserved for in-app deep-linking scenarios (native app calling another native app); unreliable when the click originates from a web page opened inside another app's webview | `https://wa.me/<digits>?text=<encodeURIComponent(message)>` — works uniformly across iOS, Android, desktop, and WhatsApp Web |
| Building the freemium billing/gateway integration now | Explicitly out of scope for this milestone per PROJECT.md | Nothing — defer entirely, don't pre-build a Stripe/gateway abstraction "just in case" |

## Stack Patterns by Variant

**If the public storefront route (`/loja/[slug]`) needs to survive a traffic spike (e.g. a reseller goes viral on a story):**
- Keep it fully dynamic per this doc's default recommendation (no `"use cache"`), but add Vercel's Data Cache / CDN caching selectively only for the truly static parts (store logo, brand colors) via a short, explicit `cacheLife` profile — never cache the stock-bearing product list.
- Because caching in Next 16 is opt-in per Cache Components, this is a targeted addition later, not a rearchitecture.

**If you later add the "sold-out live update on an open tab" nice-to-have:**
- Layer in Supabase Realtime Postgres Changes scoped with `select` column filtering (only `status`/`quantity` columns, not full rows) to keep payload/connection overhead low — this is additive, not a replacement for the default dynamic-render approach.

**If budget must be literal $0 (no Vercel Pro) for the initial validation phase:**
- Explicitly surface this tradeoff to the user rather than silently defaulting to Hobby — either accept the ToS risk short-term with "dezenas" of users (low visibility, arguably tolerable for a soft launch) and plan to upgrade before any real marketing push, or move hosting to Cloudflare Pages and accept extra Next.js adapter friction. Do not silently plan around Hobby without the user acknowledging the tradeoff.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| next@16.2.x | react@19.2.x, react-dom@19.2.x | Next 16 requires these; `create-next-app@latest` pins them automatically. |
| next@16.2.x | Node.js 20.9+ | Node 18 is no longer supported by Next 16 — check Vercel project settings / local `.nvmrc` before scaffolding. |
| tailwindcss@4.x | next@16.2.x (via `create-next-app --tailwind`) | v4's CSS-first config (`@theme` in `globals.css`) is what `create-next-app` wires up by default now — don't manually add a `tailwind.config.js` expecting v3 semantics. |
| @supabase/ssr@0.12.x | next@16.2.x (App Router, Server Actions/Route Handlers) | This is the current, non-deprecated package for cookie-based session handling in the App Router; do not use the old `@supabase/auth-helpers-nextjs` (deprecated). |
| browser-image-compression@2.0.2 | Any bundler (webpack or Turbopack) | Runs in a Web Worker by default (`useWebWorker: true`); no Turbopack-specific issues found. |

## Image Upload / Compression Strategy (detailed, per downstream consumer request)

1. **Client-side compression is the primary and mandatory step**, not an optimization nice-to-have — it directly implements PROJECT.md's "upload rápido e confiável" and 5MB-with-early-warning requirements, and it's the only free option since Supabase's server-side image transform is a paid feature.
   - Library: `browser-image-compression` (Web Worker-based, doesn't block the UI thread on a mid-range Android phone).
   - Target: `maxSizeMB: 1`, `maxWidthOrHeight: 1600`–`1920`, keep aspect ratio, output JPEG/WebP.
   - Show compression progress + resulting file size in the UI (toast/inline) before the actual network upload starts, so the reseller isn't staring at a frozen "Salvar" button.
   - Enforce the 5MB **original file** limit before even attempting compression (reject with a clear message, per the "bug catalog" item #6 in PROJECT.md), so a 40MB raw phone photo doesn't hang the Web Worker.
2. **Upload target:** Supabase Storage bucket, RLS-scoped so a reseller can only write into their own folder path (`{reseller_id}/{product_id}/...`), served via Supabase's public bucket URL.
3. **Display-side optimization:** `next/image` with `images.remotePatterns` pointed at the Supabase Storage public host — this gives responsive `srcset`, AVIF/WebP negotiation, and lazy loading on the storefront grid for free, independent of whether Supabase's paid transform API is enabled.
4. **Optional second pass (not MVP-required):** a Vercel Route Handler using `sharp` to re-encode/normalize on the server as a safety net against resellers who somehow bypass client compression (e.g. API misuse) — treat as a stretch goal, not a blocker.
5. **Fallback image requirement:** PROJECT.md explicitly calls out "imagem sem fallback visual quando a URL quebra" as a known bug to avoid — use `next/image`'s `onError` (client component wrapper) to swap in a placeholder, since a broken photo on a catalog card kills trust in a purchase-intent moment.

## WhatsApp Link Construction (detailed, per downstream consumer request)

```ts
// Server-side or client-side helper — pure function, easy to unit test
function buildWhatsAppLink(phoneE164Digits: string, message: string): string {
  // phoneE164Digits: digits only, country code included, no "+", no spaces — e.g. "5511999999999"
  const encodedMessage = encodeURIComponent(message); // NOT encodeURI — must escape reserved chars too
  return `https://wa.me/${phoneE164Digits}?text=${encodedMessage}`;
}
```

- **Format:** `https://wa.me/<digits>?text=<encoded>` is the canonical, cross-platform format (iOS, Android, desktop, WhatsApp Web) — this is what PROJECT.md's constraint "toda mensagem do WhatsApp precisa passar por `encodeURIComponent`" already anticipates; keep that as a hard rule, not a suggestion.
- **Phone normalization:** validate/normalize the reseller's stored WhatsApp number to strict `55DDXXXXXXXXX` digits-only E.164-style format *once*, at save-time in the store-config form (this is PROJECT.md bug-catalog item #7) — don't re-derive/strip formatting at click-time in the storefront, since that's the last place you want a silent bug.
- **Rendering:** always a real `<a href={waLink}>` element, not a JS `onClick` handler calling `window.open` or `router.push` — this is the single highest-leverage reliability fix for the in-app-browser cases PROJECT.md flags as the traffic source (Instagram Stories/bio links, WhatsApp-shared links).
- **Testing matrix:** Android Chrome, Android Samsung Internet, iOS Safari, iOS Instagram in-app browser, iOS WhatsApp in-app browser (when the storefront link itself was shared inside WhatsApp) — with and without the country code / with accented product names (ã, ç, é) in the message — this matches PROJECT.md's own "testar exaustivamente" alert almost verbatim.
- **Never build the message string with the size/price interpolated *before* encoding one field but not another** — construct the full template string first, then run `encodeURIComponent` once over the whole message, to avoid double-encoding or partially-encoded output.

## Stock Sync Strategy (detailed, per downstream consumer request)

- **Default/MVP approach:** render the public storefront as a fully dynamic (uncached) Server Component reading straight from Supabase on every request/navigation. Next.js 16's Cache Components make this the *default* behavior (you'd have to opt in to caching with `"use cache"` to break it) — so this requires no special sync mechanism, just discipline not to cache that route. This satisfies "delay máximo de segundos, nunca minutos" trivially, since there's no cache to go stale in the first place.
- **Do not reach for Supabase Realtime/websockets by default** — it solves a problem this MVP doesn't have yet (live-updating a tab a customer already has open) at the cost of publication config, subscription lifecycle management, and reconnection handling that a non-technical solo builder doesn't need to carry for a "dezenas de revendedores" launch.
- **Add Realtime later, scoped narrowly** (subscribe only to `status`/`quantity` columns via `select` filtering) if user feedback shows customers leaving a storefront tab open and hitting stale "available" pills.

## Sources

- npm registry (direct `npm view`, HIGH confidence — live package metadata): `next@16.2.10`, `react@19.2.7`, `tailwindcss@4.3.2`, `@supabase/supabase-js@2.110.2`, `@supabase/ssr@0.12.0`, `browser-image-compression@2.0.2`, `sharp@0.35.3`, `qrcode@1.5.4`, `zod@4.4.3`, `react-hook-form@7.81.0`, `@hookform/resolvers@5.4.0`, `lucide-react@1.24.0`, `clsx@2.1.1`, `tailwind-merge@3.6.0`, `next-themes@0.4.6`, `sonner@2.0.7`, `zustand@5.0.14`
- [Next.js 16 blog announcement](https://nextjs.org/blog/next-16) — official, fetched directly; caching model, Turbopack default, breaking changes, version requirements (MEDIUM confidence per source-hierarchy rules, cross-checked against npm registry version)
- [Vercel Hobby Plan docs](https://vercel.com/docs/plans/hobby) — official, fetched directly; confirms Hobby's non-commercial restriction and free-tier limits (MEDIUM confidence, cross-checked against web search results)
- Web search (multiple independent results cross-checked, MEDIUM confidence): Supabase vs Neon vs Firebase 2026 comparisons; Supabase free-tier storage/image-transformation pricing; client-side image compression best practices; wa.me link construction and encoding guidance; Supabase Realtime Postgres Changes docs; Instagram in-app-browser wa.me handoff bug and fix date

---
*Stack research for: Vitrino — Brazilian reseller catalog/storefront micro-SaaS*
*Researched: 2026-07-10*
