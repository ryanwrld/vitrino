# Phase 3: CRUD de Produtos e Pipeline de Mídia - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 14 (new)
**Analogs found:** 12 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `supabase/migrations/0003_products_schema_rls.sql` | migration | CRUD | `supabase/migrations/0001_init_stores_rls.sql` | exact |
| `src/lib/validation/product.ts` | utility (Zod schema) | request-response | `src/lib/validation/onboarding.ts` | exact |
| `src/lib/products/constants.ts` | config | — | `src/lib/validation/onboarding.ts` (constants section, e.g. `DEFAULT_MESSAGE_TEMPLATE`) | role-match |
| `src/lib/products/actions.ts` | service (Server Actions) | CRUD + file-I/O | `src/lib/settings/actions.ts` | exact |
| `src/lib/currency/brl.ts` | utility (transform) | transform | `src/lib/phone/normalize-br.ts` (not read but referenced heavily; same "dedicated normalizer" convention as `slugify`/`normalizeWhatsAppBR`) | role-match |
| `src/app/(admin)/produtos/page.tsx` | route (Server Component, list) | request-response (searchParams query) | `src/app/(admin)/configuracoes/page.tsx` | role-match |
| `src/app/(admin)/produtos/novo/page.tsx` | route | request-response | `src/app/(admin)/onboarding/page.tsx` | role-match |
| `src/app/(admin)/produtos/[id]/editar/page.tsx` | route | request-response | `src/app/(admin)/configuracoes/page.tsx` | role-match |
| `src/app/(admin)/produtos/product-form.tsx` | component (client form) | CRUD + file-I/O | `src/app/(admin)/configuracoes/settings-form.tsx` | exact |
| `src/app/(admin)/produtos/product-list.tsx` | component | CRUD (read/filter) | `src/app/(admin)/configuracoes/page.tsx` (Server Component reading store data) | role-match |
| `src/app/(admin)/produtos/size-grid.tsx` | component | CRUD (form state) | `src/app/(admin)/configuracoes/settings-form.tsx` (field-array-like repeated input group pattern) | partial |
| `src/app/(admin)/produtos/photo-uploader.tsx` | component | file-I/O + event-driven (drag) | `src/app/(admin)/configuracoes/settings-form.tsx` (logo file input + `saveStoreSettings` upload flow) + `src/app/(admin)/configuracoes/slug-editor.tsx` (debounce/async status pattern) | partial |
| `tests/products/*.test.ts`, `tests/rls/product-isolation.test.ts` | test | integration | `tests/rls/isolation.test.ts` | exact |

## Pattern Assignments

### `supabase/migrations/0003_products_schema_rls.sql` (migration, CRUD)

**Analog:** `supabase/migrations/0001_init_stores_rls.sql` (full file read, 81 lines)

**Core pattern — RLS in the same migration as `create table`, never a later step** (lines 9-23):
```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  ...
);

alter table stores enable row level security;

create policy "owner_full_access_stores" on stores
  for all using (owner_id = auth.uid());
```
Apply this exact three-line sequence (`create table` → `alter table ... enable row level security` → `create policy ... for all using (...)`) immediately, per table, for `products`, `product_sizes`, `product_photos` — see RESEARCH.md Pattern 1 for the exact DDL to use (owner-scoping via `store_id in (select id from stores where owner_id = auth.uid())` subquery for the two child tables).

**Storage bucket + path-scoped RLS policy pattern** (lines 49-81):
```sql
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

create policy "owner_insert_store_assets" on storage.objects
  for insert
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- repeated for select/update/delete
```
Copy this pattern for the new `product-images` bucket (`public: true`, per RESEARCH.md decision), adjusting the foldername check to match the `{owner_id}/{product_id}/{uuid}.{ext}` path convention (first path segment is still `auth.uid()::text`, so the same `(storage.foldername(name))[1] = auth.uid()::text` check works unmodified).

---

### `src/lib/validation/product.ts` (utility, request-response)

**Analog:** `src/lib/validation/onboarding.ts` (full file, 70 lines)

**Schema shape + comment convention** (lines 39-68):
```typescript
export const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da loja"),
  accentColor: z.string().trim().regex(HEX_COLOR_REGEX, "Cor inválida (use o formato #RRGGBB)").optional().or(z.literal("")),
  tagline: z.string().trim().max(100, "...").optional().or(z.literal("")),
  whatsapp: z.string().trim().min(1, "Informe o número de WhatsApp"),
  messageTemplate: z.string().trim().min(1, "...").refine(...),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
```
Copy directly: field-level `.trim()` + Portuguese error messages inline; optional fields use `.optional().or(z.literal(""))` for empty-string-tolerant text inputs; export both the schema and an inferred `type ...Input`. RESEARCH.md already drafted the target `productSchema` (Code Examples section) following this exact shape — use it verbatim, keeping `price` as a raw string (parsed server-side, never `z.number()` on a comma-decimal BRL input — see Pitfall 3).

**Convention:** doc comment above the schema explains *why* validation happens server-side too ("Revalidado SEMPRE dentro do Server Action... nunca confiar só no client") — replicate this comment style referencing `03-PATTERNS.md`/`03-RESEARCH.md` instead of `01-PATTERNS.md`.

---

### `src/lib/products/actions.ts` (service, CRUD + file-I/O)

**Analog:** `src/lib/settings/actions.ts` (full file, 227 lines)

**Imports pattern** (lines 1-8):
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsAppBR } from "@/lib/phone/normalize-br";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { slugSchema } from "@/lib/slug/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
```
For products, swap in `productSchema` from `@/lib/validation/product` and `parseBRLPrice` from `@/lib/currency/brl`.

**Owner-scoped store lookup — reusable helper** (lines 63-84):
```typescript
async function getOwnedStore(): Promise<
  | { error: string }
  | { supabase: SupabaseClient<Database>; userId: string; storeId: string }
> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }
  const { data: store, error: storeLookupError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userData.user.id)
    .single();
  if (storeLookupError || !store) {
    return { error: "Não foi possível localizar sua loja. Tente novamente." };
  }
  return { supabase, userId: userData.user.id, storeId: store.id };
}
```
**Copy this function verbatim into `src/lib/products/actions.ts`** (or extract to a shared module if the planner prefers DRY over duplication — this codebase currently duplicates it per-file, see comment at lines 56-62 explaining why). Every product Server Action starts with `const owned = await getOwnedStore(); if ("error" in owned) return { error: owned.error };`.

**Magic-byte file validation pattern (defense in depth for uploads)** (lines 12-54):
```typescript
const LOGO_MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

async function validateLogoFile(file: File): Promise<{ error: string } | null> {
  const signature = LOGO_MAGIC_BYTES[file.type];
  if (!signature) return { error: "Logo deve ser uma imagem PNG, JPEG ou WebP." };
  if (file.size > MAX_LOGO_BYTES) return { error: "Logo excede o limite de 5MB." };
  const headerBytes = new Uint8Array(await file.slice(0, signature.length).arrayBuffer());
  const matchesSignature = signature.every((byte, index) => headerBytes[index] === byte);
  if (!matchesSignature) return { error: "Arquivo de logo inválido (conteúdo não corresponde a uma imagem)." };
  return null;
}
```
Copy this shape as `validatePhotoFile` in `src/lib/products/actions.ts` — same magic-byte table, same 5MB limit, same three-check order (type → size → signature). RESEARCH.md Pattern 2 shows this looped over `formData.getAll("photos")` with a max-5-count check first (Pitfall 6).

**Core CRUD + file upload pattern (Server Action shape)** (lines 156-227, `saveStoreSettings`):
```typescript
export async function saveStoreSettings(formData: FormData): Promise<SettingsActionResult> {
  const parsed = onboardingSchema.safeParse({ ...formData.get(...) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  // domain-specific normalization (phone) — analog: parseBRLPrice for price
  const phoneResult = normalizeWhatsAppBR(parsed.data.whatsapp);
  if ("error" in phoneResult) return { error: phoneResult.error };

  const owned = await getOwnedStore();
  if ("error" in owned) return { error: owned.error };

  // conditional file upload
  let logoUrl: string | undefined;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const validationError = await validateLogoFile(logoFile);
    if (validationError) return validationError;
    const path = `${owned.userId}/logo.${logoExtension(logoFile.type)}`;
    const { error: uploadError } = await owned.supabase.storage
      .from("store-assets")
      .upload(path, logoFile, { contentType: logoFile.type, upsert: true });
    if (uploadError) return { error: "Não foi possível enviar o logo. Tente novamente." };
    const { data: publicUrlData } = owned.supabase.storage.from("store-assets").getPublicUrl(path);
    logoUrl = publicUrlData.publicUrl;
  }

  const { error: storeUpdateError } = await owned.supabase.from("stores").update({...}).eq("id", owned.storeId);
  if (storeUpdateError) return { error: "Não foi possível salvar os dados da loja. Tente novamente." };

  return { success: true };
}
```
This is the template for `saveProduct`/`updateProduct` — Zod parse → domain normalize (price) → `getOwnedStore()` → per-photo validate+upload loop (RESEARCH.md Pattern 2) → insert/update `products` row → insert `product_sizes` rows → insert `product_photos` rows. Return type convention: `{ error: string } | { success: true }` (or `{ success: true; id: string }` if the caller needs the new product id — extend the union, don't invent a new shape).

**Postgres unique-constraint error translation** (lines 137-144):
```typescript
const { error } = await owned.supabase.from("stores").update({ slug: parsed.data }).eq("id", owned.storeId);
if (error) {
  if (error.code === "23505") {
    return { error: "Este link já está em uso. Escolha outro." };
  }
  return { error: "Não foi possível salvar o novo link. Tente novamente." };
}
```
Not directly needed for products (no unique constraints besides PKs), but keep this "never surface raw Postgres error, translate known codes, fallback to generic Portuguese message" convention for all new Server Actions.

**Error handling pattern (project-wide convention, all actions):** every Supabase call is checked individually (`if (error) return { error: "<mensagem amigável em português>" }`), never a single catch-all try/catch. No exceptions are thrown for expected failure paths — the return type union (`{ error } | { success }`) is the error channel, consumed by the client via `if ("error" in result)`.

---

### `src/app/(admin)/produtos/product-form.tsx` (component, CRUD + file-I/O)

**Analog:** `src/app/(admin)/configuracoes/settings-form.tsx` (full file, 184 lines)

**Imports + hook setup pattern** (lines 1-10, 34-51):
```typescript
"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { onboardingSchema, type OnboardingInput } from "@/lib/validation/onboarding";
import { saveStoreSettings } from "@/lib/settings/actions";

export function SettingsForm({ store, settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { ... },
  });
```
For `product-form.tsx`, swap in `productSchema`/`ProductInput`, add `useFieldArray` for the size grid (RESEARCH.md Pitfall 5 — must use `move()`/`swap()` from `useFieldArray`, never a parallel state array), and manage the photo `File[]` array in local state (compressed via `browser-image-compression` before being appended to `FormData`, per RESEARCH.md Pattern 2).

**Submit handler pattern — build FormData, call Server Action inside startTransition, toast result** (lines 56-75):
```typescript
const onSubmit = (values: OnboardingInput) => {
  const formData = new FormData();
  formData.set("name", values.name);
  // ... other fields
  if (logoFile) formData.set("logo", logoFile);

  startTransition(async () => {
    const result = await saveStoreSettings(formData);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Configurações salvas!");
  });
};
```
Copy this exact shape for `product-form.tsx`'s submit handler — append compressed photo files via `formData.append("photos", file)` in a loop (not `.set`, since there can be up to 5), append `sizes` as JSON string or repeated fields, call `saveProduct`/`updateProduct`.

**Field + error rendering pattern** (lines 82-94, repeated per field):
```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="name" className="text-sm font-medium text-[#111111]">Nome da loja</label>
  <input id="name" type="text" {...register("name")} className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]" />
  {errors.name && <span className="text-sm text-[#FF4D4D]">{errors.name.message}</span>}
</div>
```
This is the canonical field wrapper (label + input + conditional error span, exact Tailwind classes/color tokens) — reuse verbatim for every text/number/select field in the product form.

**Submit button pattern** (lines 175-181):
```tsx
<button type="submit" disabled={isPending} className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white transition disabled:opacity-60">
  {isPending ? "Salvando…" : "Salvar alterações"}
</button>
```

---

### `src/app/(admin)/produtos/photo-uploader.tsx` (component, file-I/O + event-driven)

**Analogs:** `src/app/(admin)/configuracoes/settings-form.tsx` (file input handling, lines 96-107) + `src/app/(admin)/configuracoes/slug-editor.tsx` (async status/pending pattern, full file 193 lines)

**File input pattern** (settings-form.tsx lines 96-107):
```tsx
<input
  id="logo"
  type="file"
  accept="image/png,image/jpeg,image/webp"
  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
  className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-sm outline-none focus:border-[#00C46A]"
/>
```
For multi-file: `<input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={...}>`, run each `File` through `imageCompression()` (RESEARCH.md Pattern 2) before storing in state, cap at 5.

**`useTransition` + async status pattern, for compression/upload pending state** (slug-editor.tsx lines 40-41, 90-102):
```typescript
const [isSaving, startSaveTransition] = useTransition();

function handleConfirm() {
  startSaveTransition(async () => {
    const result = await updateStoreSlug(targetSlug);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Link atualizado!");
      router.refresh();
    }
  });
}
```
Use the same `useTransition` + toast-on-result convention when persisting `updatePhotoOrder` after a drag-and-drop reorder (RESEARCH.md Pattern 2, `onDragEnd` handler) — optimistic UI update first (`setPhotos(reordered)`), then `startTransition` to persist, `toast.error` only on failure.

**Status pill component pattern** (slug-editor.tsx lines 164-193):
```tsx
function StatusPill({ status }: { status: AvailabilityStatus }) {
  if (status === "checking") {
    return <span className="flex items-center gap-1 text-xs text-[#6B6B6B]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Verificando disponibilidade…</span>;
  }
  if (status === "available") {
    return <span className="flex items-center gap-1 text-xs text-[#00C46A]"><Check className="h-3.5 w-3.5" aria-hidden="true" />Disponível</span>;
  }
  // ...
}
```
Reuse this exact `lucide-react` icon + colored text-xs span pattern for photo upload/compression status indicators ("Comprimindo…", "Enviado", "Erro").

---

### `src/app/(admin)/produtos/size-grid.tsx` (component, CRUD form state)

**Analog:** RESEARCH.md Code Examples section already provides the target default-state logic directly (no closer codebase analog exists — this is a genuinely new UI pattern, grid of toggleable pills):
```typescript
const DEFAULT_SIZE_RANGE = [37, 38, 39, 40, 41, 42, 43];
const defaultSizes = DEFAULT_SIZE_RANGE.map((size) => ({ size, available: false }));
```
Combine this default-generation logic with `useFieldArray` from react-hook-form (`fields`, `append`, `remove` for adding sizes 36/44/45 manually per D-01) and the field-wrapper/error styling convention from `settings-form.tsx` (label + Tailwind classes). Toggle pill styling should use `clsx`/`tailwind-merge` (newly installed this phase) instead of manual string concatenation — this is the first component in the codebase with enough conditional visual states (available/esgotado, selected/not selected) to justify it per RESEARCH.md.

---

### `tests/products/*.test.ts` and `tests/rls/product-isolation.test.ts` (test, integration)

**Analog:** `tests/rls/isolation.test.ts` (first 50 lines read)

**Seed-two-tenants-and-assert-isolation pattern** (lines 1-33):
```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";

describe("Isolamento RLS entre tenants (stores/store_settings)", () => {
  let lojaA: SeededAccount;
  let lojaB: SeededAccount;
  let storeAId: string;

  beforeAll(async () => {
    lojaA = await seedAuthenticatedAccount("loja-a");
    lojaB = await seedAuthenticatedAccount("loja-b");

    const { data: storeA, error: storeAError } = await lojaA.client
      .from("stores")
      .insert({ owner_id: lojaA.userId, name: "Loja A - Chuteiras Import", slug: `loja-a-teste-${Date.now()}` })
      .select()
      .single();
    if (storeAError || !storeA) throw new Error(`Falha ao seedar stores da Loja A: ${storeAError?.message}`);
    storeAId = storeA.id;
    // ... same for Loja B, then store_settings insert per store
  });
  // subsequent `it()` blocks assert lojaB.client cannot read/write lojaA's rows
});
```
Copy this exact structure for `tests/rls/product-isolation.test.ts`: seed two real accounts via `seedAuthenticatedAccount`, insert a `stores` row per account, then insert `products`/`product_sizes`/`product_photos` rows scoped to each store, and assert cross-tenant SELECT/UPDATE/DELETE all return empty/error. This is a real integration test against the remote Supabase test project — no mocking of the Supabase client (only `next/headers`/`next/navigation` when simulating Server Action context, per RESEARCH.md Validation Architecture section).

For the other test files (`create-product.test.ts`, `photo-upload.test.ts`, `availability.test.ts`, `edit-delete-product.test.ts`, `list-filter-sort.test.ts`), follow the same `seedAuthenticatedAccount` + real-Postgres-insert convention, calling the actual Server Actions from `src/lib/products/actions.ts` rather than mocking them.

---

## Shared Patterns

### Owner-scoped store resolution
**Source:** `src/lib/settings/actions.ts` lines 63-84 (`getOwnedStore`)
**Apply to:** Every Server Action in `src/lib/products/actions.ts` — first call after Zod validation, before any database mutation.

### Server Action error-return convention
**Source:** `src/lib/settings/actions.ts` (throughout), `src/app/(admin)/configuracoes/slug-editor.tsx` lines 90-102 (client consumption side)
**Apply to:** All product Server Actions (return `{ error: string } | { success: true }` union, never throw) and all client components calling them (`if ("error" in result) toast.error(result.error); else toast.success(...)`).

### Magic-byte + size file validation
**Source:** `src/lib/settings/actions.ts` lines 12-54 (`validateLogoFile`)
**Apply to:** `validatePhotoFile` in `src/lib/products/actions.ts`, looped over up to 5 uploaded photos, plus server-side recount of existing + new photos before accepting (Pitfall 6 in RESEARCH.md).

### RLS-in-same-migration
**Source:** `supabase/migrations/0001_init_stores_rls.sql` (entire file)
**Apply to:** `0003_products_schema_rls.sql` — every `create table` immediately followed by `alter table ... enable row level security` and a `create policy ... for all using (...)`, never split across migrations.

### Toast + useTransition feedback loop
**Source:** `src/app/(admin)/configuracoes/slug-editor.tsx` lines 90-102, `settings-form.tsx` lines 67-75
**Apply to:** Every mutating client interaction in the products UI (save, publish, delete, toggle availability, reorder photos) — `startTransition(async () => { const result = await action(...); if ("error" in result) toast.error(...); else toast.success(...); })`.

### Debounced async check
**Source:** `src/lib/hooks/use-debounce.ts` (full file) + `slug-editor.tsx` lines 43-81
**Apply to:** Product search input (PROD-06) — reuse `useDebouncedValue` unmodified; do not write a new debounce hook.

### Field wrapper + error styling
**Source:** `settings-form.tsx` lines 82-94 and repeated throughout
**Apply to:** Every labeled input/select/textarea across `product-form.tsx`, `size-grid.tsx` — exact class names (`rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]` for inputs, `text-sm text-[#FF4D4D]` for errors).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/currency/brl.ts` | utility (transform) | transform | No existing BRL-specific parser in codebase (`normalizeWhatsAppBR`/`slugify` are the closest "dedicated normalizer" precedent in spirit, but operate on different domains — phone/slug, not currency). Follow RESEARCH.md Pitfall 3 guidance directly: never `parseFloat` raw comma-decimal input. |
| `src/app/(admin)/produtos/product-list.tsx` (drag/reorder + filter UI specifics) | component | event-driven (dnd-kit) | `@dnd-kit` is a new library this phase with no existing codebase usage — follow RESEARCH.md Pattern 2's dnd-kit code example (`DndContext`/`SortableContext`/`arrayMove`) directly, sourced from external docs, not an internal analog. |

## Metadata

**Analog search scope:** `src/app/(admin)/configuracoes/`, `src/app/(admin)/onboarding/`, `src/lib/settings/`, `src/lib/onboarding/`, `src/lib/validation/`, `src/lib/hooks/`, `supabase/migrations/`, `tests/rls/`
**Files scanned:** 9 read in full (settings-form.tsx, slug-editor.tsx, actions.ts ×2, onboarding.ts, use-debounce.ts, 0001_init_stores_rls.sql, isolation.test.ts partial)
**Pattern extraction date:** 2026-07-12
