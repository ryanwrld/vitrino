# Phase 6: Métricas e Dashboard - Pattern Map

**Mapped:** 2026-07-15
**Files analyzed:** 13
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/0006_pageviews_and_metric_views.sql` | migration | event-driven | `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` | exact |
| `src/lib/products/pageview-actions.ts` | service (Server Action) | event-driven | `src/lib/products/order-clicks-actions.ts` | exact |
| `src/app/loja/[slug]/pageview-tracker.tsx` | component (client tracker) | event-driven | `src/components/session-watcher.tsx` | exact (useEffect+return null shape) |
| `src/app/loja/[slug]/layout.tsx` (new) | route/layout | request-response | `src/app/(admin)/layout.tsx` | role-match (Server Component layout resolving data + mounting client watcher) |
| `src/lib/dashboard/metrics.ts` | service | CRUD/aggregation | `src/lib/products/list.ts` (`queryProducts`) | exact (2-query + in-memory join pattern) |
| `src/app/(admin)/(painel)/layout.tsx` (new) | route/layout | request-response | `src/app/(admin)/layout.tsx` | role-match |
| `src/components/admin-sidebar.tsx` | component | request-response | `src/app/loja/[slug]/page.tsx` (`hidden md:flex`/`flex md:hidden` pattern) + `src/lib/auth/actions.ts` (`signOutAction` reuse) | role-match |
| `src/app/(admin)/(painel)/dashboard/page.tsx` (moved+rewritten) | route (page) | request-response | `src/app/(admin)/dashboard/page.tsx` (current placeholder, being replaced) | exact (same file, rewritten) |
| `src/app/(admin)/(painel)/produtos/**` (moved, no content change) | route | CRUD | itself (pure move) | exact |
| `src/app/(admin)/(painel)/configuracoes/page.tsx` (moved, no content change) | route | CRUD | itself (pure move) | exact |
| `tests/rls/pageviews-rls.test.ts` | test | integration | `tests/rls/order-clicks-rls.test.ts` | exact |
| `tests/dashboard/metrics-aggregation.test.ts` | test | integration | `tests/rls/order-clicks-rls.test.ts` (seed helpers) + `tests/products/list-filter-sort.test.ts` (query assertions style) | role-match |
| `tests/ui/dark-mode-contrast.test.ts` (updated) | test | transform (static file assertions) | itself (existing file, one entry repointed) | exact |

## Pattern Assignments

### `supabase/migrations/0006_pageviews_and_metric_views.sql` (migration, event-driven)

**Analog:** `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql`

**Non-negotiable rule** (comment at top of 0005, lines 1-17): every `create table` is immediately followed by `enable row level security` + `create policy` in the *same* migration — never deferred. This phase adds a parallel non-negotiable: every `create view` for aggregation MUST include `with (security_invoker = true)` in the same statement (Common Pitfall #6 in RESEARCH.md), since views default to running with the creator's privileges and bypass RLS otherwise.

**Table pattern** (mirrors `order_clicks`, lines 20-49 of 0005):
```sql
create table pageviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid references products(id) on delete cascade, -- NULL = grid access (D-01)
  created_at timestamptz not null default now()
);

create index pageviews_store_id_idx on pageviews (store_id);
create index pageviews_product_id_idx on pageviews (product_id) where product_id is not null;

alter table pageviews enable row level security;

create policy "owner_read_pageviews" on pageviews
  for select
  using (store_id in (select id from stores where owner_id = auth.uid()));

create policy "public_insert_pageviews" on pageviews
  for insert
  to anon
  with check (
    (
      product_id is null
      and store_id in (select store_id from products where status = 'published')
    )
    or
    (
      product_id in (
        select id from products where store_id = pageviews.store_id and status = 'published'
      )
    )
  );
```

**Aggregation views (new pattern, no prior analog in this codebase — first `create view` usage)**:
```sql
create view product_pageview_counts
  with (security_invoker = true) as
select store_id, product_id, count(*) as views
from pageviews
where product_id is not null
group by store_id, product_id;

create view product_order_click_counts
  with (security_invoker = true) as
select store_id, product_id, count(*) as clicks
from order_clicks
group by store_id, product_id;
```

**Comment-block convention:** every migration opens with a prose comment explaining rationale/what-changed/non-negotiables (see lines 1-17 of 0005) — follow this for 0006, referencing D-01/D-08/D-09 and the `security_invoker` rule.

---

### `src/lib/products/pageview-actions.ts` (service/Server Action, event-driven)

**Analog:** `src/lib/products/order-clicks-actions.ts` (full file read — 32 lines)

Copy verbatim structure, changing table/args:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function logPageview(storeId: string, productId: string | null): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("pageviews").insert({ store_id: storeId, product_id: productId });

    if (error) {
      console.error("logPageview: insert falhou", error);
    }
  } catch (err) {
    console.error("logPageview: erro inesperado", err);
  }
}
```

**Key conventions to preserve from analog:**
- File is deliberately SEPARATE from any owner-scoped file — never import `getOwnedStore()` here (comment lines 4-9 of analog).
- Bare `insert()` with NO `.select()`/`.single()` chained — `anon` role has no SELECT policy, so chaining select would make a successful insert look like a failure (documented in analog comment, lines 18-22).
- try/catch that only `console.error`s, never throws — fire-and-forget contract for the caller.

**Caller pattern** (fire-and-forget via `startTransition`, from `src/app/loja/[slug]/[produto]/product-order-panel.tsx` lines 170-176):
```typescript
startTransition(() => {
  logOrderClick(storeId, productId, selectedSize).catch(() => {});
});
```
Apply the same shape inside `pageview-tracker.tsx`'s `useEffect`.

---

### `src/app/loja/[slug]/pageview-tracker.tsx` (component, event-driven)

**Analog:** `src/components/session-watcher.tsx` (full file read — 33 lines): `"use client"` + `useEffect` + `return null` shape, no visible UI, cleanup/dependency discipline.

```typescript
"use client";

import { startTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageview } from "@/lib/products/pageview-actions";

export function PageviewTracker({ storeId }: { storeId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean); // ["loja", slug, produto?]
    const productId = segments.length >= 3 ? segments[2] : null;

    startTransition(() => {
      logPageview(storeId, productId).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
```

**Critical placement rule (Pitfall #3 in RESEARCH.md):** must be mounted in `layout.tsx`, never `page.tsx` — `page.tsx` receives `searchParams` and remounts on filter changes, which would violate D-02. `layout.tsx` only receives `params`, so it survives searchParams changes.

---

### `src/app/loja/[slug]/layout.tsx` (new route layout, request-response)

**Analog:** `src/app/(admin)/layout.tsx` (full file read — 33 lines): Server Component resolving auth/session data then mounting a client watcher alongside `{children}`.

```typescript
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageviewTracker } from "./pageview-tracker";

export default async function LojaLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase.from("stores").select("id").eq("slug", slug).single();

  return (
    <>
      {store && <PageviewTracker storeId={store.id} />}
      {children}
    </>
  );
}
```

**Constraint reminder (CLAUDE.md):** this layout must NEVER add an auth gate — `/loja/[slug]` is a public route with zero middleware/session requirement, mirroring the existing `(admin)/layout.tsx` discipline of resolving data without redirecting.

---

### `src/lib/dashboard/metrics.ts` (service, CRUD/aggregation)

**Analog:** `src/lib/products/list.ts` (`queryProducts`, full file read — 116 lines)

**Core pattern to copy — pure function taking an already-authenticated `supabase` client, never creating its own client** (matches disciplined signature style, lines 62-67 of analog):
```typescript
export async function queryProducts(
  supabase: SupabaseClient<Database>,
  storeId: string,
  params: QueryProductsParams
): Promise<QueriedProduct[]> { ... }
```

**Two-query + in-memory join pattern** (lines 91-115 of analog) — reuse directly for Top-10 name joins:
```typescript
const { data: topViews } = await supabase
  .from("product_pageview_counts")
  .select("product_id, views")
  .eq("store_id", storeId)
  .order("views", { ascending: false })
  .limit(10);

const { data: products } = await supabase
  .from("products")
  .select("id, name, brand, brand_other")
  .in("id", (topViews ?? []).map((r) => r.product_id));
```

**Simple count pattern** (from `src/app/loja/[slug]/page.tsx` line 93-95, `totalPublished`):
```typescript
const { count: acessos } = await supabase
  .from("pageviews")
  .select("id", { count: "exact", head: true })
  .eq("store_id", storeId)
  .is("product_id", null);
```

**Don't hand-roll:** total/disponível/esgotado/recentes should call `queryProducts(supabase, storeId, {})` directly and derive counts/slice in memory — do not write new SQL for these (RESEARCH.md "Don't Hand-Roll" table).

---

### `src/app/(admin)/(painel)/layout.tsx` (new route layout, request-response)

**Analog:** `src/app/(admin)/layout.tsx` (structure: minimal wrapper composing a client component + children)

```typescript
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="min-h-dvh flex-1 bg-white">{children}</main>
    </div>
  );
}
```

**Critical scoping rule (Pitfall #4):** never edit `(admin)/layout.tsx` directly to add the sidebar — it is shared with public auth pages (`/login`, `/cadastro`, `/onboarding`, `/esqueci-senha`, `/redefinir-senha`, confirmed via comment in `login/page.tsx`). The nested route group `(painel)` isolates the sidebar to protected pages only, with zero URL impact.

**Critical `<main>` rule (Pitfall #5):** this is the ONLY `<main>` element for pages under `(painel)`. Each moved page (`dashboard/page.tsx`, `produtos/*`, `configuracoes/page.tsx`) must have its root element changed from `<main>` to `<div>`/`<section>` (keeping `bg-white` etc.) to avoid duplicate `<main>` landmarks. This is what breaks `tests/ui/dark-mode-contrast.test.ts` — see that file's entry below.

---

### `src/components/admin-sidebar.tsx` (component, request-response)

**Analog (desktop/mobile toggle technique):** `src/app/loja/[slug]/page.tsx` — `hidden md:flex` / `flex md:hidden` pairs, both always in the DOM, CSS controls visibility (grep confirms this pattern already used for `PaginationNumbered`/`LoadMoreButton`).

**Analog (logout action reuse):** `src/lib/auth/actions.ts` (`signOutAction`) — reused verbatim, never recreated, same `<form action={signOutAction}>` shape already used in placeholder `dashboard/page.tsx` (lines 27-34):
```typescript
<form action={signOutAction}>
  <button type="submit" ...>Sair da conta</button>
</form>
```

**Full component code** (from RESEARCH.md Pattern 5, `<dialog>` native modal — no new dependency, uses `.showModal()` not the `open` attribute, `backdrop:` Tailwind variant native since 3.1):
```typescript
"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/produtos", label: "Produtos" },
  { href: "/configuracoes", label: "Configurações" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // ... NavLinks() helper, <aside className="hidden ... md:flex">,
  // hamburger <button className="... md:hidden">, <dialog ref={dialogRef}>
  // — full example in 06-RESEARCH.md Pattern 5.
}
```

---

### `src/app/(admin)/(painel)/dashboard/page.tsx` (route, request-response)

**Analog:** current `src/app/(admin)/dashboard/page.tsx` placeholder (full file read — 36 lines) — being rewritten in place (moved to nested group).

**Preserve:** the `requireCompletedOnboarding()` gate call at the top (line 15 of current file) — this must remain, unchanged, in the rewritten version.

**Change:** root element from `<main className="bg-white ...">` to `<div>`/`<section>` (Pitfall #5 — `<main>` now lives in `(painel)/layout.tsx`).

**New content:** consumes `queryProducts` (via `metrics.ts`) for total/disponível/esgotado/recentes, plus the two Top-10 view queries and the `acessos` count — see `metrics.ts` analog section above for exact query shapes.

---

## Shared Patterns

### Fire-and-forget public write (anon insert)
**Source:** `src/lib/products/order-clicks-actions.ts` (full file)
**Apply to:** `pageview-actions.ts`
- Bare `.insert()`, no `.select()` chained
- try/catch → `console.error` only, never throw
- Caller wraps in `startTransition(() => fn().catch(() => {}))`

### RLS "anon insert-only, owner read-scoped" table pattern
**Source:** `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` lines 20-49
**Apply to:** `pageviews` table in migration 0006
- `create table` + `enable row level security` + `create policy` always in the same migration, never split
- Owner SELECT policy: `store_id in (select id from stores where owner_id = auth.uid())`
- `anon` gets INSERT-only policy with `WITH CHECK` validating `product_id`/`store_id` consistency against `products.status = 'published'` — no SELECT policy for `anon` at all

### security_invoker on aggregation views (NEW non-negotiable rule this phase introduces)
**Source:** RESEARCH.md Pattern 2, Common Pitfall #6 (no prior analog in codebase — first views in project)
**Apply to:** `product_pageview_counts`, `product_order_click_counts`
- `create view ... with (security_invoker = true) as select ...` — omitting this leaks cross-tenant aggregate data to any authenticated session (views default to creator's privileges, bypassing RLS)

### Two-query + in-memory join (never embed/nest select)
**Source:** `src/lib/products/list.ts` (`queryProducts`) lines 91-115
**Apply to:** `metrics.ts` Top-10 lookups (join view results back to `products` for names)

### Server Component layout resolving data + mounting a client watcher
**Source:** `src/app/(admin)/layout.tsx` (`SessionWatcher`)
**Apply to:** `src/app/loja/[slug]/layout.tsx` (`PageviewTracker`), `(admin)/(painel)/layout.tsx` (`AdminSidebar`)

### Desktop/mobile mutually-exclusive rendering via Tailwind classes only
**Source:** `src/app/loja/[slug]/page.tsx` (`hidden md:flex` / `flex md:hidden`)
**Apply to:** `admin-sidebar.tsx` (desktop `<aside>` vs. mobile hamburger + `<dialog>`)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `create view ...` SQL statements | migration (view definition) | aggregation | No prior view exists in any of the 5 existing migrations — this is genuinely new SQL shape in the project. Use RESEARCH.md Pattern 2 (Code Examples) directly as the template instead of a codebase analog. |
| `<dialog>` native modal usage | component | UI | No existing `<dialog>` element usage found in codebase (confirmed no Radix/Headless UI/vaul installed). Use RESEARCH.md Pattern 5 code example directly. |

## Metadata

**Analog search scope:** `src/lib/products/`, `src/app/(admin)/`, `src/app/loja/[slug]/`, `src/components/`, `supabase/migrations/`, `tests/rls/`, `tests/ui/`, `tests/products/`
**Files scanned:** `order-clicks-actions.ts`, `list.ts`, `public-list.ts`, `session-watcher.tsx`, `(admin)/layout.tsx`, `(admin)/dashboard/page.tsx`, `0005_order_clicks_and_public_whatsapp.sql`, `product-order-panel.tsx`, `tests/rls/order-clicks-rls.test.ts`, `tests/ui/dark-mode-contrast.test.ts`, `src/app/loja/[slug]/page.tsx`
**Pattern extraction date:** 2026-07-15
