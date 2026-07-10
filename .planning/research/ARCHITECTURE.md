# Architecture Research

**Domain:** Multi-tenant catalog/storefront micro-SaaS (Next.js + Supabase), reseller admin panel + public no-auth storefront
**Researched:** 2026-07-10
**Confidence:** MEDIUM (patterns are standard/well-documented; specific plan-tier limits verified against current Supabase docs)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         BROWSER (2 audiences)                         │
│  ┌───────────────────┐             ┌────────────────────────────┐     │
│  │  Reseller (admin)  │             │  Cliente final (público)   │     │
│  │  authenticated     │             │  no auth, mobile-first     │     │
│  └─────────┬──────────┘             └──────────────┬─────────────┘    │
├────────────┼─────────────────────────────────────────┼────────────────┤
│            ▼            NEXT.JS APP ROUTER            ▼               │
│  ┌────────────────────┐               ┌─────────────────────────┐    │
│  │ /admin/**           │               │ /loja/[slug]/**         │    │
│  │ (route group,       │               │ (route group,           │    │
│  │  protected)         │               │  PUBLIC — no middleware │    │
│  │ - middleware checks │               │  auth check ever)       │    │
│  │   Supabase session  │               │ - server-rendered       │    │
│  │ - Server Actions for│               │ - filters via URL       │    │
│  │   CRUD writes       │               │   query params          │    │
│  └──────────┬──────────┘               └────────────┬─────────────┘  │
├─────────────┼───────────────────────────────────────┼────────────────┤
│             ▼              SUPABASE (single project)  ▼               │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Postgres (RLS enforced on every table)                        │   │
│  │  stores | products | product_sizes | store_settings | events   │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  Auth (email/senha only — reseller identities)                 │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  Storage (bucket: product-images, public read, owner write)    │   │
│  └───────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  WhatsApp (wa.me deep link) — client-side only, no server round-trip│
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Admin Auth | Reseller signup/login, session, gate `/admin/**` | Supabase Auth (email/password), Next.js middleware scoped ONLY to `/admin` path prefix |
| Data Model (Postgres + RLS) | Single source of truth for stores, products, sizes/stock, settings, events; enforces per-reseller isolation | Supabase Postgres, one shared schema, `store_id`/`owner_id` FK on every tenant table, RLS policy per table |
| Product CRUD | Create/edit/delete products, mark sizes sold-out, manage photos | Next.js Server Actions writing via Supabase client (authenticated, RLS-scoped to `auth.uid()`) |
| Media Pipeline | Accept uploads, compress, store, serve fast | Client-side compression (browser-image-compression or canvas resize) before upload → Supabase Storage bucket → `next/image` with remote loader |
| Store Config | WhatsApp number, message template, branding (logo, cor, frase) | Single `store_settings` row per store, same RLS pattern as products |
| Public Storefront Renderer | Resolve slug → render products, filters, pagination, no auth | Server Component, fetch with **no-store** (see Data Flow), Supabase **anon key** + public SELECT policy |
| WhatsApp Deep Link Generator | Build `wa.me`/`api.whatsapp.com` URL with encoded, templated message | Pure client-side function, runs on button click, no backend call needed |
| Metrics/Events | Track pageviews, product views, WhatsApp clicks | Lightweight `events` table, fire-and-forget insert (client → Supabase anon insert policy, or a thin API route) |
| Slug + QR | Unique slug per store, QR code for the public URL | Slug uniqueness check as a Postgres unique constraint + realtime-ish validation on save; QR generated client-side (`qrcode` lib) from the resolved URL |

## Recommended Project Structure

```
src/
├── app/
│   ├── (admin)/                # authenticated tree — middleware matcher targets this only
│   │   ├── layout.tsx          # session check, redirect to /login if none
│   │   ├── dashboard/page.tsx
│   │   ├── produtos/           # CRUD screens
│   │   ├── loja/page.tsx       # store settings (branding, WhatsApp)
│   │   └── login/page.tsx      # NOT behind middleware (public entry to admin)
│   ├── loja/
│   │   └── [slug]/
│   │       ├── page.tsx        # public storefront — NEVER touched by admin middleware
│   │       └── loading.tsx     # skeleton loader (per PITFALLS: skeleton before content)
│   └── api/
│       └── events/route.ts     # optional thin endpoint for metrics insert
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # server client (cookies-based, respects RLS as authed user)
│   │   ├── admin-actions.ts    # server actions for product/store CRUD
│   │   └── public-client.ts    # anon-key client for storefront reads (no cookies needed)
│   ├── whatsapp/
│   │   └── build-link.ts       # template substitution + encodeURIComponent, unit-testable
│   └── slug/
│       └── validate.ts         # slug format + uniqueness check
├── components/
│   ├── admin/                  # CRUD forms, image uploader, toasts
│   └── storefront/             # ProductCard, SizePicker, FilterBar, OrderButton
└── middleware.ts                # matcher: only /admin/:path* — explicit exclusion of /loja
```

### Structure Rationale

- **`(admin)` route group:** isolates every authenticated screen under one middleware matcher. This makes the "public route must never see auth middleware" constraint a structural guarantee, not a runtime check that can be forgotten in one file.
- **`loja/[slug]` outside any protected group:** the public storefront literally cannot be caught by the admin middleware's matcher pattern, closing off the single most catastrophic failure mode named in the project's own alerts (auth middleware intercepting the public route).
- **Separate `public-client.ts` vs `server.ts` for Supabase:** the storefront should never construct a client that carries the admin session/cookies — using the anon key explicitly for public reads keeps the two trust boundaries structurally distinct, not just policy-distinct.
- **`lib/whatsapp/build-link.ts` as a pure, isolated function:** this is the single highest-value function in the whole product (per PROJECT.md's "Core Value" and alert #1). Isolating it lets it be unit-tested directly against the accents/special-character/encoding requirements without spinning up a browser.

## Architectural Patterns

### Pattern 1: Shared-schema multi-tenancy with RLS-enforced isolation

**What:** One Postgres schema, one set of tables (`stores`, `products`, `product_sizes`, `store_settings`, `events`), every tenant-owned table carries `store_id`. RLS policies do the isolation, not application code.
**When to use:** Always, at this scale (dozens to low-hundreds of resellers). Schema-per-tenant or database-per-tenant is a scaling pattern for very large, isolation-sensitive tenants (e.g. enterprise compliance) — irrelevant here.
**Trade-offs:** Simpler migrations, simpler admin dashboard queries, cheaper on Supabase's free tier. Cost: every query and every new table needs its RLS policy reviewed — a missed policy is a data leak, not just a bug.

**Example (conceptual policy shape):**
```sql
-- Admin write/read: owner only
create policy "owner_full_access" on products
  for all using (store_id in (select id from stores where owner_id = auth.uid()));

-- Public read: only published stores, only active products
create policy "public_read_active_products" on products
  for select to anon
  using (
    status = 'active'
    and store_id in (select id from stores where status = 'published')
  );
```

### Pattern 2: Slug-resolved public rendering, no session in the loop

**What:** The public storefront resolves `[slug]` → `store_id` via a single indexed lookup, then queries products scoped to that `store_id` using the Supabase **anon key** (not the admin's session). No cookies, no auth check, no redirect logic on this path at all.
**When to use:** Any route explicitly required to work for anonymous users, especially one reached via shared links where auth friction directly kills conversion (this project's stated Core Value).
**Trade-offs:** Requires discipline to keep this route's data access strictly to the public RLS policy (never accidentally import the authenticated admin Supabase client into a component reachable from `/loja/[slug]`).

### Pattern 3: Mutation-triggered freshness instead of background polling

**What:** Rather than a cache-expiry timer or a websocket subscription, the admin write itself (server action that flips a size to "esgotado") is the trigger for freshness. Two viable implementations, in order of recommendation for this project's scale:
1. **No cache on the public route at all** (`fetch(..., { cache: 'no-store' })` / route segment `export const dynamic = 'force-dynamic'`). Every storefront page view queries Postgres directly. At tens of stores and realistic public traffic (shared links opened by individual customers, not sustained load), this is trivially within Supabase free-tier limits and gives true real-time freshness with zero extra plumbing.
2. **On-demand `revalidateTag`/`revalidatePath`** called at the end of every stock-affecting server action, with the storefront page tagged accordingly. Adds a caching layer back in (useful once traffic grows enough that DB read volume matters) but reintroduces a class of bugs (forgetting to tag a mutation path) that pattern 1 avoids entirely.
**When to use:** Start with (1). Move to (2) only when Supabase read volume/latency becomes a measured problem — not preemptively.
**Trade-offs:** Supabase Realtime (websocket subscriptions pushing Postgres changes to open browser tabs) was considered and rejected for MVP: it solves a problem this product doesn't have (a customer staring at an already-open tab waiting for stock to change), while adding connection lifecycle management, reconnect handling, and a new class of client-side bugs. Revisit only if a future feature needs live multi-viewer presence (e.g. "3 pessoas vendo agora").

## Data Flow

### Admin write → public read (the critical path for the stock-sync requirement)

```
Reseller marks size "esgotado" in /admin/produtos
    ↓ (Server Action, authenticated Supabase client, RLS: owner_id = auth.uid())
UPDATE product_sizes SET status = 'esgotado' WHERE id = ...
    ↓
Postgres commit (single source of truth)
    ↓
Toast confirms save (per PITFALLS #9: immediate visual feedback, never silent)
    ↓
[No cache layer — see Pattern 3]
    ↓
Next request to /loja/[slug] (anywhere, anyone) queries Postgres directly
    ↓ (anon key, RLS: public_read_active_products policy)
Storefront re-renders with correct, current stock state
```

This satisfies "delay of seconds, never minutes" by construction — there is no intermediate cache to go stale, because there is no cache. If read load ever requires introducing one, it must be paired with `revalidateTag` fired from the exact same server action, not decoupled.

### Order flow (the actual conversion — no backend round-trip)

```
Cliente seleciona tamanho disponível (client-side state only)
    ↓
Clica "Pedir agora"
    ↓
lib/whatsapp/build-link.ts:
  - substitutes {modelo}/{solado}/{tamanho}/{preço} into store's message template
  - encodeURIComponent(message)
  - builds https://wa.me/<numero>?text=<encoded>
    ↓
window.location / <a href> opens WhatsApp (app or web)
    ↓ (fire-and-forget, non-blocking)
POST /api/events { type: 'whatsapp_click', store_id, product_id }
```

Deliberately no server dependency between "size selected" and "WhatsApp opens" — this is a pure client computation. This matters because the reseller may be offline and the customer's network may be poor; the one flow the product cannot fail on must not depend on a round-trip succeeding.

### Key Data Flows

1. **Admin CRUD → Storage:** Image upload compresses client-side first (respects the 5MB pre-upload guidance in PROJECT.md), then goes to Supabase Storage bucket `product-images` (public-read, owner-write via RLS-equivalent Storage policies). Product row stores the resulting public URL(s); `next/image` handles responsive serving.
2. **Metrics:** Storefront pageviews and WhatsApp clicks insert into an `events` table via a public-insert-only RLS policy (or a thin `/api/events` route if you want to keep insert logic server-side and validated). Admin dashboard aggregates this table with owner-scoped RLS reads — no separate analytics service needed at this scale.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k storefront views/day (this project's actual near-term target: dozens of resellers) | No-cache SSR on `/loja/[slug]` (Pattern 3, option 1). Supabase free tier. Single shared schema. No queue, no background jobs. |
| 1k-100k views/day | Introduce `revalidateTag` + short `s-maxage` at the CDN edge for the storefront page; keep RLS/schema unchanged. Add pagination cursor (not offset) once product counts and viewer counts both grow. Consider Supabase compute add-on if row counts grow into the millions. |
| 100k+ views/day | Not a realistic near-term concern (product's own success metric is "first WhatsApp order," not scale) — defer. If it happens, look at edge caching per-store (each store's storefront is independently cacheable) before considering read replicas. |

### Scaling Priorities

1. **First bottleneck (realistic for this product):** Supabase Storage egress/image transformation costs if photo-heavy stores get popular — mitigated by client-side compression at upload time (already required by PROJECT.md) rather than relying on Supabase's server-side Image Transformations, which are gated to the **Pro plan and above**, not available on the free tier this project is targeting for $0/month at launch.
2. **Second bottleneck:** Product catalog pagination — PROJECT.md already flags "vitrine renderizando todos os produtos de uma vez" as a known bug to avoid; ~20 products per load via cursor-based pagination or infinite scroll from day one, not retrofitted later.

## Anti-Patterns

### Anti-Pattern 1: Auth middleware with a matcher broad enough to catch the public route

**What people do:** Write `middleware.ts` with `matcher: ['/((?!_next|static).*)']` (catch-all) and add an allowlist check inside for public paths.
**Why it's wrong:** This is exactly the failure mode PROJECT.md calls out as critical (alert #5) — one missed condition in the allowlist and the public storefront 404s or redirects to login for every customer clicking a shared link. An allowlist is a runtime check that can regress silently on any future middleware edit.
**Do this instead:** Scope the middleware `matcher` itself to `/admin/:path*` only. The public route is then unreachable by the middleware by construction — there is no condition to forget.

### Anti-Pattern 2: Reaching for Supabase Realtime / websockets to hit the "seconds not minutes" requirement

**What people do:** See "near-real-time" and jump straight to Postgres Changes subscriptions pushed over websockets to the storefront.
**Why it's wrong:** Adds connection lifecycle management (reconnect on network drop — relevant given the project's own mobile-network-flakiness concerns), a new dependency surface, and doesn't actually improve the experience: a customer loading a fresh page already gets current data. Realtime only matters if the *same open tab* needs to update without a reload, which isn't a stated requirement.
**Do this instead:** No-cache SSR fetch per page load (Pattern 3). It is simpler, has fewer failure modes, and meets the actual requirement (delay measured in seconds between an admin edit and the *next* page load, not live-updating an already-open tab).

### Anti-Pattern 3: Building the WhatsApp link server-side

**What people do:** Add an API route that takes product/size/store IDs and returns the constructed `wa.me` URL, calling it on button click.
**Why it's wrong:** Introduces a network round-trip and a failure mode (API down, slow, or the customer's connection drops) directly in the one flow the product cannot fail on (PROJECT.md's Core Value statement is explicit about this). It also adds latency to what should feel instantaneous.
**Do this instead:** Fetch the store's settings (WhatsApp number + template) once when the storefront page renders (already needed for display), and do the link construction (including `encodeURIComponent`) entirely client-side on click.

### Anti-Pattern 4: Schema-per-tenant or database-per-tenant

**What people do:** For "true" multi-tenant isolation, provision a separate schema or Supabase project per reseller.
**Why it's wrong:** Massive operational overhead (migrations run N times, connection pooling complexity) for a product explicitly targeting "dezenas" of resellers pre-monetization. Solves an isolation problem RLS already solves at the row level.
**Do this instead:** Shared schema, `store_id` FK everywhere, RLS policies as the isolation boundary (Pattern 1).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | Email/password only, session via cookies (Next.js server client helpers) | No OAuth per PROJECT.md scope decision — reduces surface area, one less integration to get wrong |
| Supabase Postgres | RLS-enforced shared schema, accessed via `@supabase/ssr` server client (admin) and anon client (public) | Never use the `service_role` key from any code path reachable by the browser |
| Supabase Storage | `product-images` bucket, public read, owner-scoped write policy, bucket-level max file size set to match the 5MB upload limit | Server-side Image Transformations require Pro plan — do client-side compression instead for MVP |
| WhatsApp (`wa.me`) | Pure client-side deep link, no WhatsApp Business API integration needed | Test across Android/iOS × Chrome/Safari/Samsung Internet per PROJECT.md alert #1; verify both with-DDI and without-DDI number formats |
| Vercel | Hosting for Next.js, edge middleware for the `/admin` matcher | Free tier sufficient at target scale; revisit only if function execution or bandwidth limits are approached |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Admin panel ↔ Postgres | Server Actions using the authenticated (cookie-based) Supabase client | RLS is the actual enforcement; Server Actions are the interface, not the security boundary |
| Public storefront ↔ Postgres | Server Component fetch using the **anon key** client, no cookies | Must never import or share the authenticated admin client module |
| Storefront ↔ WhatsApp | Client-side function call only, no network hop to your own backend | See Anti-Pattern 3 |
| Storefront/Admin ↔ Metrics | Fire-and-forget insert, does not block or gate any user-facing action | A failed metrics insert must never break the WhatsApp flow or the product view |

## Sources

- [Next.js — Guides: Multi-tenant](https://nextjs.org/docs/app/guides/multi-tenant) — HIGH (official docs)
- [Next.js — revalidateTag reference](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) — HIGH (official docs)
- [Next.js — Getting Started: Revalidating](https://nextjs.org/docs/app/getting-started/revalidating) — HIGH (official docs)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH (official docs)
- [Supabase — Using Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs) — HIGH (official docs)
- [Supabase — Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) — HIGH (official docs; confirms Pro-plan gating)
- [Supabase — Storage v2: Image resizing and Smart CDN (blog)](https://supabase.com/blog/storage-image-resizing-smart-cdn) — MEDIUM (official blog)
- [Supabase — Storage Optimizations](https://supabase.com/docs/guides/storage/production/scaling) — HIGH (official docs)
- [MakerKit — Supabase RLS Best Practices: Production Patterns for Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — MEDIUM (community, cross-checked against official docs)
- [peal.dev — Multi-Tenant Subdomain Routing in Next.js: The Complete Pattern](https://www.peal.dev/blog/multi-tenant-subdomain-routing-nextjs-patterns) — MEDIUM (community, cross-checked against official multi-tenant guide)
- Project-specific constraints and known-bug catalog: `.planning/PROJECT.md` (this repo)

---
*Architecture research for: Multi-tenant reseller catalog/storefront (Vitrino)*
*Researched: 2026-07-10*
