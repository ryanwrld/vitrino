# Phase 5: Fluxo de Pedido no WhatsApp (CRÍTICO) - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 16
**Analogs found:** 15 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` | migration | batch (schema DDL) | `supabase/migrations/0003_products_schema_rls.sql` + `0004_public_storefront_rls_and_visibility.sql` | exact |
| `src/lib/whatsapp/order-message.ts` | utility | transform | `src/lib/currency/brl.ts` + `src/lib/phone/normalize-br.ts` | role-match |
| `src/lib/storage/product-image-url.ts` | utility | transform | inline one-liner in `src/app/loja/[slug]/page.tsx` (L83-88) + `src/lib/products/public-actions.ts` (L58-63) | exact (extraction) |
| `src/lib/products/public-list.ts` (MODIFIED) | service | CRUD (read) | itself — `isVisible()` currently private, must export | exact |
| `src/lib/products/public-detail.ts` | service | CRUD (read) | `src/lib/products/public-list.ts` (`queryPublicProducts`) | exact |
| `src/lib/products/order-clicks-actions.ts` | service (Server Action) | event-driven (fire-and-forget) | `src/lib/products/public-actions.ts` | exact |
| `src/app/loja/[slug]/[produto]/page.tsx` | route (controller) | request-response | `src/app/loja/[slug]/page.tsx` | exact |
| `src/app/loja/[slug]/[produto]/not-found.tsx` | route (component) | request-response | none in codebase | no analog |
| `src/app/loja/[slug]/[produto]/product-order-panel.tsx` | component | event-driven | `src/app/(admin)/produtos/size-grid.tsx` + `src/app/loja/[slug]/load-more-button.tsx` | role-match |
| `src/app/loja/[slug]/product-card.tsx` (MODIFIED) | component | request-response (nav) | `src/app/(admin)/produtos/[id]/editar/page.tsx` (Link usage) | role-match |
| `src/app/loja/[slug]/product-grid.tsx` (MODIFIED) | component | request-response | itself / `page.tsx` (prop threading) | exact |
| `src/app/loja/[slug]/load-more-button.tsx` (MODIFIED) | component | event-driven | itself (already holds `slug` prop) | exact |
| `tests/products/order-message.test.ts` | test | transform | `tests/slug/slugify.test.ts` | exact |
| `tests/storefront/product-detail.test.ts` | test | CRUD | `tests/storefront/sold-out-visibility.test.ts` | exact |
| `tests/rls/order-clicks-rls.test.ts` | test | event-driven / RLS | `tests/rls/product-isolation.test.ts` + `tests/storefront/public-access-rls.test.ts` | role-match |
| `tests/storefront/store-settings-public-read.test.ts` | test | CRUD / RLS | `tests/storefront/public-access-rls.test.ts` | exact |

## Pattern Assignments

### `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` (migration, batch/DDL)

**Analog:** `supabase/migrations/0003_products_schema_rls.sql` (table+RLS same-migration idiom) and `supabase/migrations/0004_public_storefront_rls_and_visibility.sql` (anon-scoped additive policy idiom). `0004` explicitly defers this exact decision to Phase 5 — this is the strongest possible analog relationship in the codebase.

**Non-negotiable rule** (`0003_products_schema_rls.sql` L1-6):
```sql
-- Non-negotiable (03-RESEARCH.md Pitfall 2, herdado da Armadilha 4 do 01-RESEARCH.md):
-- toda `create table` é imediatamente seguida de `enable row level security` e sua
-- `create policy`, nunca separado numa migration posterior — uma janela de tabela
-- sem proteção é um vazamento de dados silencioso.
```

**Table + owner RLS pattern** (`0003_products_schema_rls.sql` L47-61, `product_sizes`):
```sql
create table product_sizes (
  product_id uuid not null references products(id) on delete cascade,
  size smallint not null check (size between 36 and 45),
  available boolean not null default false,
  primary key (product_id, size)
);

alter table product_sizes enable row level security;

create policy "owner_full_access_product_sizes" on product_sizes
  for all using (
    product_id in (
      select id from products where store_id in (select id from stores where owner_id = auth.uid())
    )
  );
```

**Anon-scoped additive `select` policy pattern** (`0004_public_storefront_rls_and_visibility.sql` L24-40):
```sql
create policy "public_read_published_stores" on stores
  for select
  to anon
  using (true);

create policy "public_read_published_products" on products
  for select
  to anon
  using (status = 'published');
```
Note the header comment (L12-16) explaining WHY `to anon` is always scoped to `for select` only — never open write/all to anon by default.

**The exact deferral this migration resolves** (`0004_public_storefront_rls_and_visibility.sql` L78-85):
```sql
-- NOTA EXPLÍCITA (04-RESEARCH.md Pitfall 2): esta migration NÃO adiciona
-- nenhuma policy pública em `store_settings`. O WhatsApp (whatsapp_e164,
-- message_template) só será exposto publicamente quando a Fase 5 decidir
-- como/quando esse dado é consumido no CTA "Pedir agora" — princípio de
-- menor privilégio, nunca "adiantar" uma policy pública para uma tabela que
-- esta fase não precisa ler.
```

**Concrete target SQL** (fully drafted and verified against this exact idiom): `.planning/phases/05-fluxo-de-pedido-no-whatsapp-cr-tico/05-RESEARCH.md` L417-462 — `order_clicks` table + owner `select` policy + anon `insert`-only policy with a validating `WITH CHECK`, plus the `store_settings` anon `select` policy scoped tighter than the blanket `stores` policy (`store_id in (select store_id from products where status = 'published')` instead of `using (true)`).

**Verified schema fields to reference** (`src/lib/database.types.ts` L159-177, `store_settings`): `message_template: string | null`, `whatsapp_e164: string | null`, `onboarding_completed_at: string | null`, `store_id: string` (PK/FK, one-to-one with `stores`) — confirms `store_settings` has no own `id` column, only `store_id`.

---

### `src/lib/whatsapp/order-message.ts` (utility, transform — pure functions)

**Analog:** `src/lib/currency/brl.ts` (pure-function module with decision-justifying doc comments) + `src/lib/phone/normalize-br.ts` (union return-type convention for validated/derived values). No WhatsApp-specific precedent exists yet — first file in this new `src/lib/whatsapp/` directory.

**Pure-function module doc-comment convention** (`src/lib/currency/brl.ts` L1-19):
```typescript
/**
 * Parser/formatter dedicado de preço em BRL (03-RESEARCH.md Pitfall 3;
 * 03-PATTERNS.md §No Analog Found — não existe precedente direto no
 * codebase, mesmo espírito de `normalizeWhatsAppBR`/`slugify`: uma única
 * fonte de verdade para conversão string<->numeric, nunca `parseFloat` cru
 * sobre o valor digitado).
 */
```

**Formatter used for `{preço}` interpolation** (`src/lib/currency/brl.ts` L60-62) — use `formatBRLPriceInput`, NEVER `formatBRLPrice` (which prepends "R$", causing double-prefix — `DEFAULT_MESSAGE_TEMPLATE` already hardcodes `"Preço: R$ {preço}"`):
```typescript
export function formatBRLPriceInput(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
```

**Message template constants to import (read-only, never redefine)** (`src/lib/validation/onboarding.ts` L10-25):
```typescript
export const DEFAULT_MESSAGE_TEMPLATE = `Olá! Vi sua vitrine e tenho interesse no seguinte produto:

Modelo: {modelo}
Solado: {solado}
Tamanho: {tamanho}
Preço: R$ {preço}

Poderia confirmar a disponibilidade?`;

/** Placeholders obrigatórios no template de mensagem (WPP-02). */
export const REQUIRED_TEMPLATE_PLACEHOLDERS = [
  "{modelo}",
  "{solado}",
  "{tamanho}",
  "{preço}",
] as const;
```

**Union return-type convention for a validated/derived value** (`src/lib/phone/normalize-br.ts` L17-29) — mirror this shape if `order-message.ts` needs any fallible step:
```typescript
export function normalizeWhatsAppBR(
  input: string
): { e164Digits: string } | { error: string } {
  const phone = parsePhoneNumberFromString(input, "BR");
  if (!phone || !phone.isValid()) {
    return { error: "Número de WhatsApp inválido. Confira o DDD e o número." };
  }
  return { e164Digits: phone.number.replace("+", "") };
}
```
**Critical, read-only note:** `whatsapp_e164` is already normalized once at onboarding save — Phase 5 only *reads* `store_settings.whatsapp_e164` (L1-16 of this same file spell out why re-deriving it here would be a bug).

**Concrete target implementation** (fully drafted, verified against `onboarding.ts` placeholders): `05-RESEARCH.md` L306-334 (`interpolateMessageTemplate`, `buildOrderMessage`, `buildWhatsAppUrl` — single `encodeURIComponent` call over the fully composed string, never encoding sub-pieces separately).

---

### `src/lib/storage/product-image-url.ts` (utility, transform — extraction of a duplicated one-liner)

**Analog:** the identical inline expression duplicated in two places today — this is a pure extraction, not a new pattern.

**Occurrence 1** (`src/app/loja/[slug]/page.tsx` L83-88):
```typescript
const productsWithCoverUrl = products.map((product) => ({
  ...product,
  coverUrl: product.coverPath
    ? supabase.storage.from("product-images").getPublicUrl(product.coverPath).data.publicUrl
    : null,
}));
```

**Occurrence 2** (`src/lib/products/public-actions.ts` L58-63) — byte-for-byte the same expression:
```typescript
const productsWithCoverUrl: PublicProductCardData[] = products.map((product) => ({
  ...product,
  coverUrl: product.coverPath
    ? supabase.storage.from("product-images").getPublicUrl(product.coverPath).data.publicUrl
    : null,
}));
```

**Extraction target:** `getProductImagePublicUrl(supabase, storagePath: string | null): string | null` — a single-purpose wrapper around `supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl`, returning `null` when `storagePath` is `null` (matches both call sites' `? ... : null` ternary). Both `page.tsx`/`public-actions.ts` are candidates to adopt this helper opportunistically, but this phase's own `public-detail.ts` and `page.tsx` (new `[produto]` route) are the two call sites that MUST use it (never a 4th copy-paste, per `05-RESEARCH.md` "Don't Hand-Roll").

---

### `src/lib/products/public-list.ts` (MODIFIED — export `isVisible`)

**Analog:** itself. Single-line signature change.

**Current (private)** (`src/lib/products/public-list.ts` L70-73):
```typescript
function isVisible(hideWhenSoldOut: boolean | null, disponivel: boolean, storeHideSoldOutDefault: boolean): boolean {
  const effectiveHide = hideWhenSoldOut ?? storeHideSoldOutDefault;
  return disponivel || !effectiveHide;
}
```
**Change required:** add `export` before `function isVisible`. Nothing else in this function changes — the doc comment directly above it (L54-69) already states the exact contract: "produto aparece se `disponivel === true` OU `effectiveHide === false`". `queryPublicProductDetail` (new file) MUST import and reuse this verbatim — re-deriving the same boolean logic a second time is an explicitly flagged pitfall (Pitfall 8, `05-RESEARCH.md` L401-405): a product hidden via the sold-out-hide rule but still `status='published'` would otherwise be reachable by direct URL, bypassing the Phase 4 feature entirely.

---

### `src/lib/products/public-detail.ts` (NEW — service, CRUD/read)

**Analog:** `src/lib/products/public-list.ts` (`queryPublicProducts`) — same role, same domain, same store (public/anon-scoped product reads). Secondary analog: `src/app/(admin)/produtos/[id]/editar/page.tsx` for the "resolve one row by id + related sizes/photos" shape.

**Module header convention to mirror** (`src/lib/products/public-list.ts` L1-27) — explicitly states this is a PARALLEL function to the admin equivalent, never importing/modifying it:
```typescript
/**
 * Leitura pública paginada de produtos publicados (VITR-01/VITR-04,
 * 04-RESEARCH.md Pattern 3) — variante pública/anônima de
 * `src/lib/products/list.ts` (`queryProducts`, painel admin). NUNCA importar
 * ou modificar `list.ts` — são funções paralelas, uma owner-scoped (sessão),
 * outra pública (sem sessão, role `anon` no Postgres).
 */
```

**Two-query-plus-in-memory-join pattern to replicate** (`src/lib/products/public-list.ts` L119-158) — never a Supabase embed:
```typescript
const { data: fetchedProducts, error } = await query;
if (error || !fetchedProducts || fetchedProducts.length === 0) {
  return { products: [], hasMore: false };
}
// ...
const productIds = products.map((product) => product.id);

const { data: sizeRows } = await supabase
  .from("product_sizes")
  .select("product_id, available")
  .in("product_id", productIds);

const { data: photoRows } = await supabase
  .from("product_photos")
  .select("product_id, storage_path, position")
  .in("product_id", productIds)
  .order("position", { ascending: true });

const availableProductIds = new Set(
  (sizeRows ?? []).filter((row) => row.available).map((row) => row.product_id)
);
```
For `public-detail.ts`, this becomes single-row instead of batch: fetch the one product by `id` + `store_id`, then fetch ALL its `product_sizes` rows (not just an aggregate `available` boolean — the detail page needs the full per-size availability map for the pill grid) and ALL its `product_photos` (full gallery, not just cover, per `05-RESEARCH.md` Architecture Diagram step 4).

**Resolve-by-id + scope-to-store pattern** (`src/app/(admin)/produtos/[id]/editar/page.tsx` L44-65) — adapt this shape (owner-scoped there, must become store/published/visibility-scoped here):
```typescript
const { data: product } = await supabase
  .from("products")
  .select("*")
  .eq("id", id)
  .eq("store_id", store.id)
  .single();

if (!product) {
  redirect("/produtos");
}

const { data: sizeRows } = await supabase
  .from("product_sizes")
  .select("size, available")
  .eq("product_id", id)
  .order("size", { ascending: true });

const { data: photoRows } = await supabase
  .from("product_photos")
  .select("id, storage_path")
  .eq("product_id", id)
  .order("position", { ascending: true });
```
**Divergence required:** the admin version redirects to `/produtos` on miss; the public version must call `notFound()` (Next.js), and the `.single()` filter must ALSO apply `isVisible()` (imported from `public-list.ts`, see above) — a product that is `status='published'` but hidden by the sold-out rule must resolve exactly like "not found" (Pitfall 8).

**Fixed category lists available for interpolation/labels** (`src/lib/products/constants.ts` L14-34): `BRANDS`, `SOLES`, `CATEGORIES`, `FULFILLMENTS` — same constants already used by `public-list.ts`'s validation; `{solado}` in the message template maps to `product.sole` (nullable, `05-RESEARCH.md` recommends empty-string fallback, Open Question 3).

---

### `src/lib/products/order-clicks-actions.ts` (NEW — Server Action, event-driven fire-and-forget)

**Analog:** `src/lib/products/public-actions.ts` — same exact role (anon-callable Server Action, deliberately separated from owner-scoped `actions.ts`).

**Separation-of-concerns rule to replicate verbatim** (`src/lib/products/public-actions.ts` L1-17):
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { queryPublicProducts, type QueryPublicProductsParams } from "@/lib/products/public-list";
import type { PublicProductCardData } from "@/app/loja/[slug]/product-card";

/**
 * Server Actions PÚBLICAS/ANÔNIMAS da vitrine — arquivo deliberadamente
 * SEPARADO de src/lib/products/actions.ts (owner-scoped, autenticado).
 * ...
 * NUNCA importar/chamar `getOwnedStore()` neste arquivo.
 */
```
This "NUNCA importar/chamar `getOwnedStore()`" rule is the single most important convention to carry into `order-clicks-actions.ts` — mixing the owner-scoped auth helper into a publicly-callable action file is the exact risk this codebase already identified and guarded against once.

**Bare-mutation-no-`.select()` idiom already established** (`src/lib/products/actions.ts` `markProductEsgotado`, L607-623) — confirms this codebase already knows the "don't chain `.select()` when you only need the error" idiom, now load-bearing for a different reason (RLS, not just simplicity):
```typescript
export async function markProductEsgotado(productId: string): Promise<ProductActionResult> {
  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  const { error } = await owned.supabase
    .from("product_sizes")
    .update({ available: false })
    .eq("product_id", productId);

  if (error) {
    return { error: "Não foi possível marcar o produto como esgotado. Tente novamente." };
  }

  return { success: true, id: productId };
}
```

**Concrete target implementation** (fully drafted in research, matches both patterns above): `05-RESEARCH.md` L464-487 — bare `.insert({...})`, no `.select()`/`.single()` (the `anon` role has no `SELECT` policy on `order_clicks` by design — chaining `.select()` would make a successful insert *look* like a failure, Pitfall 2), wrapped in `try/catch` that only logs, never throws or returns an error to the caller (true fire-and-forget contract, D-10).

---

### `src/app/loja/[slug]/[produto]/page.tsx` (NEW — route/controller, request-response)

**Analog:** `src/app/loja/[slug]/page.tsx` — same route family, same "no auth, no cache" discipline, same `Promise<params>` shape (Next.js 16).

**Imports + no-auth/no-cache doc-comment convention to mirror** (`src/app/loja/[slug]/page.tsx` L1-36):
```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryPublicProducts } from "@/lib/products/public-list";
import { StoreHero } from "./store-hero";
// ...

/**
 * Vitrine pública — Server Component sem NENHUMA checagem de auth. ...
 * NUNCA adicionar a diretiva de cache do App Router nesta rota nem em
 * public-list.ts — o estoque precisa refletir o painel do revendedor com
 * delay de segundos (VITR-03, CLAUDE.md), e Cache Components do Next 16 é
 * opt-in por padrão (basta nunca optar por cache aqui).
 */
```

**`Promise<params>` typing + store resolution + `notFound()` pattern** (`src/app/loja/[slug]/page.tsx` L45-68):
```typescript
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<LojaSearchParams>;
};

export default async function LojaPublicaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, logo_url, accent_color, tagline, hide_sold_out_default")
    .eq("slug", slug)
    .single();

  if (storeError || !store) {
    notFound();
  }
```
For `[produto]/page.tsx`: `params` becomes `Promise<{ slug: string; produto: string }>` (per `05-RESEARCH.md` Pattern 1, L204-223) — same store-resolution query, then delegate to `queryPublicProductDetail(supabase, store.id, produto)` from the new `public-detail.ts`, `notFound()` if it returns `null` (covers not-found, unpublished, AND sold-out-hidden in one check, per Pitfall 8).

**`store_settings` fetch is net-new** — no existing page in this codebase queries `store_settings` from a public/anon context (migration `0004`'s explicit deferral, see migration section above). This is the one query in `page.tsx` with zero prior precedent; wire it exactly like the `stores` query above (`.select("whatsapp_e164, message_template").eq("store_id", store.id).single()`), gated entirely by the new RLS policy, not by app code.

---

### `src/app/loja/[slug]/[produto]/not-found.tsx` (NEW — route/component, request-response)

**No codebase analog** — see "No Analog Found" below. Only caller precedent: `src/app/loja/[slug]/page.tsx` L67 (`notFound();`) shows where this boundary gets triggered from, but no `not-found.tsx` file exists anywhere in the project today to copy structure from.

---

### `src/app/loja/[slug]/[produto]/product-order-panel.tsx` (NEW — Client Component, event-driven)

**Analog (composite — no single strong match exists; `05-RESEARCH.md` itself states "first WhatsApp CTA in the project"):** `src/app/(admin)/produtos/size-grid.tsx` for the size-pill guard sub-pattern, `src/app/loja/[slug]/load-more-button.tsx` for the overall Client-Component-calling-a-Server-Action shape, `src/app/(admin)/configuracoes/qr-code-panel.tsx` for the "copy to clipboard + toast" sub-pattern.

**`cn()` helper convention (defined locally, not centralized)** (`src/app/(admin)/produtos/size-grid.tsx` L1-20):
```typescript
"use client";

import { useTransition } from "react";
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```
Note: there is no shared `src/lib/cn.ts` in this codebase — `size-grid.tsx` is the only file that combines `clsx` + `tailwind-merge` into a local `cn()`; `product-filters.tsx` uses raw `clsx` alone for its simpler case. `product-order-panel.tsx` has 3 pill states (available/sold-out/selected, per `05-UI-SPEC.md`) — same complexity class as `size-grid.tsx` — so replicate the local `cn()` pattern, not a bare `clsx`.

**Button-per-pill guard pattern (covers both mouse AND keyboard)** (`src/app/(admin)/produtos/size-grid.tsx` L109-124), adapted for the public 2-state (not 3-state) case:
```tsx
<button
  key={size}
  type="button"
  onClick={() => handleTogglePill(size)}
  aria-pressed={included}
  className={cn(
    "flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-base transition",
    !included && "border-[#F5F5F3] text-[#6B6B6B]",
    included && !available && "border-[#F5F5F3] bg-[#F5F5F3] text-[#6B6B6B] line-through",
    included && available && "border-[#00C46A] bg-[#00C46A] text-white"
  )}
>
  {size}
</button>
```

**`useTransition` fire-and-forget Server Action call from a Client Component** (`src/app/loja/[slug]/load-more-button.tsx` L27-44):
```tsx
export function LoadMoreButton({ slug, initialPage, initialHasMore, filters }: LoadMoreButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await fetchNextPage(slug, filters, currentPage + 1);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // ...
    });
  }
```
**Divergence for `logOrderClick`:** unlike `fetchNextPage`, the result must be IGNORED (D-10 — never blocks/gates UI, `isPending` is never read to disable anything) — `startTransition(() => { logOrderClick(...).catch(() => {}); })`, matching `05-RESEARCH.md` Pattern 3 (L274-286) exactly.

**Copy-to-clipboard + toast pattern (direct precedent for "Copiar mensagem")** (`src/app/(admin)/configuracoes/qr-code-panel.tsx` L49-58):
```tsx
function handleCopy() {
  startCopyTransition(async () => {
    const ok = await copyText(publicUrl);
    if (ok) {
      toast.success("Link copiado!");
    } else {
      toast.error("Não foi possível copiar o link. Selecione e copie manualmente.");
    }
  });
}
```
This already satisfies Pitfall 6 (clipboard call must be the first await, no upstream `await`) — `copyText(...)` is the only awaited call inside the transition, called synchronously from the click handler. Reuse verbatim, swap `publicUrl` for the composed order message and toast text for `"Mensagem copiada!"` / `"Não foi possível copiar. Tente novamente."` (locked copy, `05-UI-SPEC.md` L91-92).

**`copyText` contract to import unchanged** (`src/lib/clipboard.ts`, full file, 14 lines):
```typescript
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

**Novel, load-bearing pattern with no prior precedent** — the always-clickable `<a>` with conditional `preventDefault` (D-02/D-03/D-10): `05-RESEARCH.md` Pattern 3, L257-299 (full code example: `waLink` resolves to `"#"` vs a real `wa.me` URL depending on `selectedSize`; `onClick` only calls `preventDefault()` in the no-size-selected branch; `shakeKey` counter forces remount to restart the CSS shake animation on repeated invalid clicks, per Pitfall 4, L377-381).

---

### `src/app/loja/[slug]/product-card.tsx` (MODIFIED — wrap in `<Link>`)

**Analog:** `next/link` usage convention already established elsewhere in this codebase (`src/app/(admin)/produtos/[id]/editar/page.tsx` L1, L102-107):
```tsx
import Link from "next/link";
// ...
<Link
  href="/produtos"
  className="rounded-lg border border-[#0D3D2B] px-4 py-2 text-center font-medium text-[#0D3D2B] transition hover:bg-[#0D3D2B] hover:text-white"
>
  Voltar
</Link>
```

**Current full file** (`src/app/loja/[slug]/product-card.tsx`, 51 lines) — the `<div className="flex flex-col gap-2">` at L28 is the wrap target; becomes a `<Link href={`/loja/${slug}/${product.id}`}>` with the same className, requiring a new `slug` prop on `ProductCardProps`/the function signature (currently only `{ product }`, L23). Everything inside (image, name, price, availability badge, L29-49) stays unchanged.

**Consequence:** `PublicProductCardData` (L4-13) and the component signature both need a `slug: string` (or the caller passes a pre-built `href`) — see `product-grid.tsx` and `load-more-button.tsx` entries below, both of which instantiate `<ProductCard>` and must be updated in lockstep or the build breaks.

---

### `src/app/loja/[slug]/product-grid.tsx` (MODIFIED — thread `slug` prop)

**Analog:** itself — trivial prop-threading change, `page.tsx` already has `slug` in scope from `params`.

**Current call site** (`src/app/loja/[slug]/product-grid.tsx`, full file, 17 lines):
```tsx
export function ProductGrid({ products }: { products: PublicProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```
**Change required:** add `slug: string` to the props type, pass `slug={slug}` to each `<ProductCard>`. `page.tsx` L126 (`<ProductGrid products={productsWithCoverUrl} />`) must pass `slug={slug}` too.

---

### `src/app/loja/[slug]/load-more-button.tsx` (MODIFIED — thread existing `slug` prop)

**Analog:** itself — `slug` is ALREADY a prop here (used for `fetchNextPage(slug, ...)`), just not yet forwarded to `ProductCard`.

**Current props + call site** (`src/app/loja/[slug]/load-more-button.tsx` L9-13, L52-54):
```typescript
export type LoadMoreButtonProps = {
  slug: string;
  initialPage: number;
  initialHasMore: boolean;
  filters: Omit<QueryPublicProductsParams, "page">;
};
// ...
{items.map((product) => (
  <ProductCard key={product.id} product={product} />
))}
```
**Change required:** `<ProductCard key={product.id} product={product} slug={slug} />` — a one-line change since `slug` is already destructured in the function signature (L27).

---

### `tests/products/order-message.test.ts` (NEW — pure-function test, transform)

**Analog:** `tests/slug/slugify.test.ts` — same shape (no DB, no mocking, no `beforeAll`/`afterAll`, pure `describe`/`it`/`expect` against a pure function import).

**Full file to mirror the shape of** (`tests/slug/slugify.test.ts`, 24 lines):
```typescript
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug/slugify";

describe("slugify", () => {
  it("folds diacritics, spaces to hyphens, lowercase", () => {
    expect(slugify("Sapatênis São Paulo")).toBe("sapatenis-sao-paulo");
  });
  // ...
  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});
```
For `order-message.test.ts`: import `interpolateMessageTemplate`/`buildOrderMessage`/`buildWhatsAppUrl` from the new `src/lib/whatsapp/order-message.ts`, assert against `DEFAULT_MESSAGE_TEMPLATE` with accented characters (ã, ç, é per PED-03), assert single-pass `encodeURIComponent` (no `%2520` double-encoding), and assert the photo-URL line is appended correctly (D-06). Run via `npx vitest run tests/products/order-message.test.ts` (`05-RESEARCH.md` L551).

---

### `tests/storefront/product-detail.test.ts` (NEW — integration test, CRUD)

**Analog:** `tests/storefront/sold-out-visibility.test.ts` — same shape: `seedAuthenticatedAccount`, seed a store + product(s) directly via the authenticated client (bypassing the UI), call the query function under test directly, assert on its return shape.

**Seed + assert pattern to replicate** (`tests/storefront/sold-out-visibility.test.ts` L14-37):
```typescript
describe("Regra de visibilidade de esgotado (D-09/D-10/D-11)", () => {
  it("produto disponível sempre aparece, mesmo com hide_when_sold_out=true", async () => {
    const loja = await seedAuthenticatedAccount("visibility-available");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Visibilidade Disponível", slug: `loja-visibilidade-disp-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Disponível Com Hide True", brand: "Nike", price: 199.9, status: "published", hide_when_sold_out: true })
      .select("id")
      .single();
    // ...
    const result = await queryPublicProducts(loja.client, store.id, {}, false);
    expect(result.products.map((p) => p.id)).toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);
```
For `product-detail.test.ts`: call `queryPublicProductDetail(loja.client, store.id, product.id)` instead, assert `null` for not-found/unpublished/sold-out-hidden cases (mirrors `sold-out-visibility.test.ts`'s 5-combination matrix exactly, per `05-RESEARCH.md`'s test map, L560/567), and a populated detail object for the visible case (sizes array + photos array + product fields). Always seed via the authenticated client, never service_role; always `30000`ms timeout per test (network round-trips to a real Supabase project).

---

### `tests/rls/order-clicks-rls.test.ts` (NEW — RLS/integration test, event-driven)

**Analog (composite):** `tests/rls/product-isolation.test.ts` for the owner-read cross-tenant-isolation shape; `tests/storefront/public-access-rls.test.ts` for the `createAnonClient()` usage shape. This is the project's FIRST test of an anon `INSERT` — no exact precedent, but both halves (owner isolation + anon client) are independently well-established.

**Owner cross-tenant isolation pattern to replicate for the `select` policy** (`tests/rls/product-isolation.test.ts` L178-190):
```typescript
it("tentativa de UPDATE da Loja A numa linha de products da Loja B afeta 0 linhas", async () => {
  const { data, error } = await lojaA.client
    .from("products")
    .update({ name: "Nome adulterado pela Loja A" })
    .eq("id", productBId)
    .select();

  expect(error).toBeNull();
  expect(data).toEqual([]);

  const { data: verify } = await lojaB.client.from("products").select("name").eq("id", productBId).single();
  expect(verify?.name).toBe("Chuteira Predator B");
});
```
Adapt this shape for `order_clicks`: seed Loja A + Loja B, each with a click row; assert `lojaA.client.from("order_clicks").select("*").eq(...)` for Loja B's row returns `[]` (owner read-scoping), never an error.

**`createAnonClient()` usage for the anon-insert half** (`tests/storefront/public-access-rls.test.ts` L1-2, L90-97):
```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAnonClient, seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";
// ...
it("client anônimo lê a linha de stores pelo slug (policy public_read_published_stores)", async () => {
  const anon = createAnonClient();
  const { data, error } = await anon.from("stores").select("id, name, slug").eq("slug", storeSlug);
  expect(error).toBeNull();
  // ...
});
```
For `order_clicks`: use `createAnonClient()` to `.insert({ store_id, product_id, size })` (bare insert, no `.select()` — Pitfall 2) against a seeded published product and assert `error` is `null`; then assert an insert with a mismatched `product_id`/`store_id` pair OR an unpublished product is REJECTED by the `WITH CHECK` clause (`error` is non-null); then assert the anon client CANNOT read back any `order_clicks` row at all (mirrors `public-access-rls.test.ts` L148-153's "client anônimo NUNCA lê store_settings" negative-assertion pattern).

**Test setup helpers to import unchanged** (`tests/setup/supabase-test.ts`, full file): `seedAuthenticatedAccount(label)` (owner accounts, real signUp+signIn, never service_role for data operations) and `createAnonClient()` (anon key only, no session) — both already exist and require no changes.

---

### `tests/storefront/store-settings-public-read.test.ts` (NEW — RLS/integration test, CRUD)

**Analog:** `tests/storefront/public-access-rls.test.ts` — this is functionally an extension of that exact test file's existing `store_settings` coverage, which today only proves the NEGATIVE (anon cannot read at all). Once migration `0005` lands, the new test proves the scoped POSITIVE.

**Current negative assertion this test's positive case must sit beside** (`tests/storefront/public-access-rls.test.ts` L148-153):
```typescript
it("client anônimo NUNCA lê store_settings (Pitfall 2 — nenhuma policy pública nessa tabela)", async () => {
  const anon = createAnonClient();
  const { data, error } = await anon.from("store_settings").select("*").eq("store_id", storeId);
  expect(error).toBeNull();
  expect(data).toEqual([]);
});
```
**Note for planner:** this existing assertion in `public-access-rls.test.ts` will become FALSE once migration `0005` ships (a store with a published product will now return the row) — either update this existing test's seed to have no published product (so the negative still holds for that specific case), or explicitly scope the assertion. Do not leave a contradicting red test in the suite.

**Full `beforeAll` seeding shape to replicate** (`tests/storefront/public-access-rls.test.ts` L24-84): seed one store with a published product + `store_settings` row (`whatsapp_e164`, `onboarding_completed_at`) via the owner's authenticated client, then assert `anon.from("store_settings").select("whatsapp_e164, message_template").eq("store_id", storeId)` returns the row. Add a second store with ONLY draft products (no published) and assert anon read of ITS `store_settings` still returns `[]` — this is the scoping condition (`store_id in (select store_id from products where status='published')`) that makes the new policy stricter than the blanket `stores` policy.

## Shared Patterns

### Fully dynamic Server Component, never `"use cache"`
**Source:** `src/app/loja/[slug]/page.tsx` L10-20 (doc comment) — established project-wide discipline since Phase 4.
**Apply to:** `src/app/loja/[slug]/[produto]/page.tsx`. The stock-freshness guarantee (VITR-03) depends entirely on never opting into Cache Components caching on this route family.

### Two-query-plus-in-memory-join for `product_sizes`/`product_photos`, never a Supabase embed
**Source:** `src/lib/products/public-list.ts` L119-158, mirrored verbatim in `src/lib/products/list.ts` L89-113 (admin equivalent).
**Apply to:** `src/lib/products/public-detail.ts`.

### `useTransition`/`startTransition` for every Server Action call from a Client Component
**Source:** `src/app/loja/[slug]/load-more-button.tsx` L31-44, `src/app/(admin)/configuracoes/qr-code-panel.tsx` L23, L49-58, `src/app/(admin)/produtos/size-grid.tsx` L50, L80-90. Used in 14 files project-wide per `05-RESEARCH.md`.
**Apply to:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx` (both the `logOrderClick` fire-and-forget call and the "Copiar mensagem" clipboard call).

### Locally-defined `cn()` (clsx + tailwind-merge), never a centralized shared helper
**Source:** `src/app/(admin)/produtos/size-grid.tsx` L18-20 (only file that defines the merged `cn()`); `src/app/loja/[slug]/product-filters.tsx` uses bare `clsx` for its simpler case.
**Apply to:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx` — has 3 conditional pill states, matching `size-grid.tsx`'s complexity, so replicate its local `cn()`, not the bare-`clsx` variant.

### `create table` immediately followed by `enable row level security` + `create policy`, same migration
**Source:** `supabase/migrations/0001_init_stores_rls.sql`, `0003_products_schema_rls.sql` (every table), doc comment at `0003` L1-6.
**Apply to:** `order_clicks` in migration `0005`. Never split table creation and RLS policy across migrations.

### Bare `.insert()`/`.update()` with no `.select()`/`.single()` when the caller's role lacks a `SELECT` policy
**Source:** `src/lib/products/actions.ts` `markProductEsgotado` L613-621 (simplicity-motivated there); becomes correctness-critical (not just style) for `order_clicks` because `anon` has literally no `SELECT` policy on that table.
**Apply to:** `src/lib/products/order-clicks-actions.ts`'s `logOrderClick`.

### Owner-scoped vs. anon-scoped Server Action file separation — `getOwnedStore()` NEVER imported into public-action files
**Source:** `src/lib/products/public-actions.ts` L1-17 (explicit rule stated in the file's own header comment); `src/lib/products/actions.ts` L135-156 (`getOwnedStore()` itself, for contrast — this is what must NOT be imported).
**Apply to:** `src/lib/products/order-clicks-actions.ts` — new anon-callable file, same separation rule as `public-actions.ts`.

### Test setup via `seedAuthenticatedAccount()` (owner-scoped writes) / `createAnonClient()` (public reads/writes), never `service_role` for actual data operations
**Source:** `tests/setup/supabase-test.ts` (full file) — `service_role` is used ONLY internally by `seedAuthenticatedAccount` to bypass GoTrue's signup rate limit, never to read/write test data.
**Apply to:** `tests/storefront/product-detail.test.ts`, `tests/rls/order-clicks-rls.test.ts`, `tests/storefront/store-settings-public-read.test.ts`.

### `<a href>` real anchor, never `window.open()`/`router.push()`, for the WhatsApp CTA
**Source:** No prior codebase instance (first WhatsApp CTA), but explicitly locked project-wide in `.claude/CLAUDE.md` ("Nunca `window.open()` programático para o CTA do WhatsApp") and re-derived in `05-RESEARCH.md` Pattern 3/Anti-Patterns (L257-299, L337-339).
**Apply to:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx`'s "Pedir agora" CTA. This is the single highest-risk pattern in the phase — the conditional-`preventDefault()` approach is NOT the same anti-pattern as `window.open()`; verify this distinction survives code review.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/loja/[slug]/[produto]/not-found.tsx` | route/component | request-response | First `not-found.tsx` file convention used anywhere in this project (confirmed via `find`/`grep` — zero existing `not-found.tsx`/`error.tsx` files, only one `notFound()` call site at `src/app/loja/[slug]/page.tsx` L67). Planner should follow the Next.js App Router `not-found.tsx` file convention directly (no codebase precedent to copy structure from) and the locked copy in `05-UI-SPEC.md` L94: heading "Produto não encontrado", body "Este produto não está mais disponível ou o link mudou.", link "Voltar para a loja" → `/loja/[slug]`. Style should reuse the same Tailwind tokens as the rest of the public storefront (`#111111`/`#6B6B6B`/`#00C46A`, `text-2xl font-bold` heading per `store-hero.tsx`'s precedent). |

## Metadata

**Analog search scope:** `src/app/loja/[slug]/**`, `src/app/(admin)/produtos/**`, `src/app/(admin)/configuracoes/**`, `src/lib/products/**`, `src/lib/currency/**`, `src/lib/phone/**`, `src/lib/slug/**`, `src/lib/clipboard.ts`, `src/lib/validation/onboarding.ts`, `src/lib/database.types.ts`, `supabase/migrations/**`, `tests/storefront/**`, `tests/rls/**`, `tests/settings/**`, `tests/slug/**`, `tests/setup/**`
**Files scanned:** 33 source files read directly this session (26 `src/`, 4 `supabase/migrations/`, 7 `tests/`), plus `database.types.ts` schema section for `products`/`store_settings`/`stores`
**Pattern extraction date:** 2026-07-14
