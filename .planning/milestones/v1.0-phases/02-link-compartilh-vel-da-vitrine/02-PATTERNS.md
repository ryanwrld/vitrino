# Phase 2: Link Compartilhável da Vitrine - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 11
**Analogs found:** 9 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/(admin)/configuracoes/page.tsx` | route (Server Component) | request-response | `src/app/(admin)/dashboard/page.tsx` | exact |
| `src/app/(admin)/configuracoes/settings-form.tsx` | component (Client Form) | CRUD | `src/app/(admin)/onboarding/onboarding-wizard.tsx` | exact |
| `src/app/(admin)/configuracoes/slug-editor.tsx` | component (Client, debounced input) | request-response (RPC check) | `src/app/(admin)/onboarding/onboarding-wizard.tsx` (partial — no debounce precedent) | role-match |
| `src/app/(admin)/configuracoes/qr-code-panel.tsx` | component (Client) | transform (client-only) | none in codebase — new pattern | no-analog |
| `src/lib/settings/actions.ts` | service (Server Action) | CRUD | `src/lib/onboarding/actions.ts` | exact |
| `src/lib/slug/slugify.ts` | utility | transform | `generateStoreSlug` in `src/lib/auth/actions.ts` (lines 18-27) | exact (needs fixing per Pitfall 2) |
| `src/lib/slug/validation.ts` | utility (Zod schema) | transform | `src/lib/validation/onboarding.ts` | exact |
| `supabase/migrations/0002_slug_availability_rpc.sql` | migration | request-response (RPC) | `supabase/migrations/0001_init_stores_rls.sql` | role-match |
| `src/lib/hooks/use-debounce.ts` | hook | transform | none in codebase — first debounce hook | no-analog |
| `tests/settings/*.test.ts` | test | request-response / unit | (no existing tests directory found — see note) | no-analog |
| `src/lib/auth/actions.ts` (modified — `generateStoreSlug` to call shared `slugify()`) | utility (modification) | transform | itself (existing file, lines 18-27) | exact |

## Pattern Assignments

### `src/app/(admin)/configuracoes/page.tsx` (route, request-response)

**Analog:** `src/app/(admin)/dashboard/page.tsx` (read in full, 33 lines)

**Guard + data-fetch pattern** (lines 1-13):
```typescript
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { signOutAction } from "@/lib/auth/actions";

export default async function DashboardPage() {
  await requireCompletedOnboarding();

  return (
    <main className="bg-white mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-10">
      ...
```

**Apply to `/configuracoes/page.tsx`:** Call `await requireCompletedOnboarding()` as the very first line (same combined auth+onboarding gate used by every protected admin page). Then fetch the store row + `store_settings` row via `createClient()` (see `src/lib/auth/onboarding-guard.ts` lines 30-44 for the query shape: `.from("stores").select(...).eq("owner_id", userData.user.id).single()`), and pass the loaded data as props into `<SettingsForm store={...} settings={...} />`. Do NOT add `"use cache"` to this route (dynamic-by-default, per RESEARCH.md).

---

### `src/app/(admin)/configuracoes/settings-form.tsx` (component, CRUD)

**Analog:** `src/app/(admin)/onboarding/onboarding-wizard.tsx` (read in full, 177 lines)

**Imports pattern** (lines 1-14):
```typescript
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AsYouType } from "libphonenumber-js";
import {
  onboardingSchema,
  DEFAULT_MESSAGE_TEMPLATE,
  type OnboardingInput,
} from "@/lib/validation/onboarding";
import { saveOnboarding } from "@/lib/onboarding/actions";
```
D-07 explicitly says: reuse the Zod schemas + `normalizeWhatsAppBR`, but write the form component from scratch. So import the SAME `onboardingSchema` / `DEFAULT_MESSAGE_TEMPLATE` from `@/lib/validation/onboarding` for the Loja/WhatsApp sections, but build a new `useForm` + JSX layout (do not copy the wizard's single-column single-CTA "conclude wizard" structure — this is a persistent settings page with a "Salvar" per section, per D-06).

**react-hook-form + useTransition + toast submit pattern** (lines 27-66):
```typescript
export function OnboardingWizard() {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { ... },
  });

  const onSubmit = (values: OnboardingInput) => {
    const formData = new FormData();
    formData.set("name", values.name);
    // ...
    startTransition(async () => {
      const result = await saveOnboarding(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };
```
Apply verbatim as the submit pattern for the Loja+WhatsApp section of `settings-form.tsx`, swapping `saveOnboarding` for the new `saveStoreSettings` Server Action, and adding `toast.success("Configurações salvas!")` on the success path (no existing success-toast precedent in this file — onboarding redirects instead of toasting, but D-12 establishes the toast-on-success convention for this phase).

**Field markup convention** (lines 78-90, repeated per field):
```typescript
<div className="flex flex-col gap-1">
  <label htmlFor="name" className="text-sm font-medium text-[#111111]">
    Nome da loja
  </label>
  <input
    id="name"
    type="text"
    {...register("name")}
    className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
  />
  {errors.name && <span className="text-sm text-[#FF4D4D]">{errors.name.message}</span>}
</div>
```
Reuse this exact label/input/error markup convention (colors `#111111`/`#F5F5F3`/`#00C46A`/`#FF4D4D`) for every field in all three sections (Loja, WhatsApp, Link/QR).

**Phone preview pattern (WhatsApp section)** (lines 46-47, 138-148): reuse `AsYouType("BR").input(whatsappValue)` for live-typing display formatting — same non-authoritative preview-only convention (never the persisted value).

---

### `src/app/(admin)/configuracoes/slug-editor.tsx` (component, request-response)

**Analog:** `src/app/(admin)/onboarding/onboarding-wizard.tsx` for form/toast/useTransition conventions (no existing debounce precedent in codebase — RESEARCH.md confirms this is the first debounce use, Pattern 2/Code Examples supply the reference implementation instead of a codebase analog).

**Core pattern to follow (from RESEARCH.md Pattern 2, since no codebase analog exists):**
```typescript
"use client";
import { useEffect, useState, useTransition } from "react";
import { checkSlugAvailability, updateStoreSlug } from "@/lib/settings/actions";
import { slugify } from "@/lib/slug/slugify";

const [rawSlug, setRawSlug] = useState(currentSlug);
const slug = slugify(rawSlug); // D-01: auto-slugify on every keystroke
const debouncedSlug = useDebouncedValue(slug, 400); // D-03
const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
const [isPending, startTransition] = useTransition();

useEffect(() => {
  if (debouncedSlug.length < 3 || debouncedSlug === currentSlug) return;
  setStatus("checking");
  startTransition(async () => {
    const result = await checkSlugAvailability(debouncedSlug);
    setStatus(result.available ? "available" : "taken");
  });
}, [debouncedSlug]);
```

**Confirmation dialog pattern (D-08), native `<dialog>`** — reuse the `#0D3D2B`/`#FF4D4D` button color convention from the onboarding wizard's submit button:
```typescript
<dialog ref={dialogRef} className="rounded-lg p-6 backdrop:bg-black/40">
  <h2 className="text-xl font-medium text-[#111111]">Trocar o link da sua vitrine?</h2>
  <p className="mt-2 text-sm text-[#6B6B6B]">
    Isso vai quebrar links já compartilhados: quem tiver o link antigo não vai
    mais conseguir acessar sua vitrine. Essa ação não pode ser desfeita.
  </p>
  <form method="dialog" className="mt-4 flex gap-3">
    <button type="submit" className="rounded-lg border border-[#0D3D2B] px-4 py-2">Cancelar</button>
    <button type="button" onClick={() => { onConfirm(); dialogRef.current?.close(); }}
      className="rounded-lg bg-[#FF4D4D] px-4 py-2 text-white">
      Sim, trocar o link
    </button>
  </form>
</dialog>
```
Trigger `updateStoreSlug` ONLY from the explicit confirm button's `onClick`, never from the dialog's `close`/`cancel` events (Pitfall 4).

---

### `src/app/(admin)/configuracoes/qr-code-panel.tsx` (component, transform)

**Analog:** none in codebase — first QR/clipboard component. Use RESEARCH.md's Code Examples directly (already vetted against `qrcode` package + Clipboard API, no codebase precedent to diverge from):
```typescript
"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

export function QrCodePanel({ publicUrl }: { publicUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, publicUrl, { width: 240, margin: 2 });
    }
  }, [publicUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "vitrine-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar o link. Selecione e copie manualmente.");
    }
  }
  // ... readonly <input value={publicUrl} readOnly /> block per D-13, using
  // the same label/input Tailwind classes as settings-form.tsx fields.
}
```

---

### `src/lib/settings/actions.ts` (service, CRUD)

**Analog:** `src/lib/onboarding/actions.ts` (read in full, 152 lines)

**Imports + auth-guard pattern** (lines 1-6, 85-100):
```typescript
"use server";
import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsAppBR } from "@/lib/phone/normalize-br";
import { onboardingSchema } from "@/lib/validation/onboarding"; // reused per D-07

export type SettingsActionResult = { error: string } | { success: true };

// ... inside each action:
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
```
This exact "get user → look up store scoped by `owner_id` → operate scoped by `store.id`" three-step sequence (lines 85-100 of `saveOnboarding`) is the mandatory pattern for `saveStoreSettings`, `updateStoreSlug`, and `checkSlugAvailability` alike — RESEARCH.md's Architecture Patterns section and CONTEXT.md's Integration Points both flag this as the established convention to mirror.

**Validation → normalization → persist pattern** (lines 68-84, 123-148):
```typescript
const parsed = onboardingSchema.safeParse({ ... });
if (!parsed.success) {
  return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
}
const phoneResult = normalizeWhatsAppBR(parsed.data.whatsapp);
if ("error" in phoneResult) {
  return { error: phoneResult.error };
}
// ...
const { error: storeUpdateError } = await supabase
  .from("stores")
  .update({ name: parsed.data.name, accent_color: parsed.data.accentColor || null, ... })
  .eq("id", store.id);
if (storeUpdateError) {
  return { error: "Não foi possível salvar os dados da loja. Tente novamente." };
}
```
Apply directly to `saveStoreSettings` (same schema/fields, but `.update()` instead of onboarding's terminal state, and no `redirect()` at the end — this page persists in place with a toast, not a wizard-completion redirect).

**NEW pattern for this phase — RPC call + `unique_violation` handling (no codebase analog, from RESEARCH.md Pattern 1 + Pitfall 3):**
```typescript
export async function checkSlugAvailability(candidateSlug: string) {
  const parsed = slugValidationSchema.safeParse(candidateSlug);
  if (!parsed.success) {
    return { available: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_slug_available", { candidate_slug: parsed.data });
  if (error) {
    return { available: false, error: "Não foi possível verificar o link agora." };
  }
  return { available: data as boolean };
}

export async function updateStoreSlug(newSlug: string) {
  // ... same getUser() → store lookup pattern as above ...
  const { error } = await supabase.from("stores").update({ slug: newSlug }).eq("id", store.id);
  if (error) {
    if (error.code === "23505") {
      return { error: "Este link já está em uso. Escolha outro." };
    }
    return { error: "Não foi possível salvar o novo link. Tente novamente." };
  }
  return { success: true };
}
```

---

### `src/lib/slug/slugify.ts` (utility, transform)

**Analog:** `generateStoreSlug` in `src/lib/auth/actions.ts` (lines 18-27) — same role, but RESEARCH.md's Pitfall 2 documents that this existing algorithm must NOT be copied verbatim (does not fold diacritics):
```typescript
// EXISTING (buggy for D-01 "sem acento" requirement) — src/lib/auth/actions.ts lines 18-27
function generateStoreSlug(email: string): string {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "loja";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
```
**Required fix (per RESEARCH.md Don't Hand-Roll table + Pitfall 2):** extract the shared logic as `slugify(input: string): string`, prepending NFD diacritic-folding before the existing lowercase/hyphenate/trim logic:
```typescript
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```
Then update `src/lib/auth/actions.ts`'s `generateStoreSlug` to call this shared `slugify()` instead of its inline regex, per CONTEXT.md's explicit warning against two divergent slugify algorithms (Integration Points section).

---

### `src/lib/slug/validation.ts` (utility, Zod schema)

**Analog:** `src/lib/validation/onboarding.ts` (read in full, 71 lines)

**Schema construction convention** (lines 27, 39-68):
```typescript
import { z } from "zod";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da loja"),
  // ... .regex(...), .max(...), .refine(...) with Portuguese error messages
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
```
Apply the same "named regex constant + trim + Portuguese message + exported inferred type" convention for the new slug schema, e.g.:
```typescript
const SLUG_CHARSET_REGEX = /^[a-z0-9-]+$/;
export const slugSchema = z
  .string()
  .trim()
  .min(3, "O link precisa ter entre 3 e 30 caracteres")
  .max(30, "O link precisa ter entre 3 e 30 caracteres")
  .regex(SLUG_CHARSET_REGEX, "Use apenas letras, números e hífens (3 a 30 caracteres).")
  .refine((v) => !v.startsWith("-") && !v.endsWith("-"), "O link não pode começar ou terminar com hífen");
export type SlugInput = z.infer<typeof slugSchema>;
```

---

### `supabase/migrations/0002_slug_availability_rpc.sql` (migration)

**Analog:** `supabase/migrations/0001_init_stores_rls.sql` (read lines 1-60)

**Structural convention** (comment header + `create policy`/`create table` style, lines 1-25):
```sql
-- Migration: schema multi-tenant fundacional (stores, store_settings) + RLS + bucket store-assets
-- Non-negotiable (Armadilha 4 do 01-RESEARCH.md): RLS habilitado na MESMA migration ...

create table stores ( ... );
alter table stores enable row level security;
create policy "owner_full_access_stores" on stores
  for all using (owner_id = auth.uid());
```
Follow the same comment-header convention (explaining the "why", citing the phase's RESEARCH.md pitfall by name) and apply RESEARCH.md's Pattern 1 SQL directly:
```sql
-- Migration: RPC de verificação de unicidade de slug (SECURITY DEFINER)
-- Necessário porque a RLS de `stores` (owner_id = auth.uid()) bloqueia
-- checagem cross-tenant de slug (Pitfall 1 do 02-RESEARCH.md) — retorna
-- apenas um boolean, nunca dados de linha.
create or replace function public.is_slug_available(candidate_slug text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from stores where slug = candidate_slug
  );
$$;

grant execute on function public.is_slug_available(text) to authenticated;
```

---

### `src/lib/hooks/use-debounce.ts` (hook)

**No codebase analog** — first debounce hook in this project (confirmed by RESEARCH.md). Use RESEARCH.md's Pattern 2 verbatim as the implementation reference:
```typescript
"use client";
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

---

## Shared Patterns

### Auth + Onboarding Guard
**Source:** `src/lib/auth/onboarding-guard.ts` (`requireCompletedOnboarding`, lines 20-49)
**Apply to:** `src/app/(admin)/configuracoes/page.tsx` (call as the first line of the Server Component, same as `dashboard/page.tsx` line 13). Never use in `/onboarding` itself (would loop-redirect).

### Owner-scoped store lookup (get user → find store by `owner_id` → operate by `store.id`)
**Source:** `src/lib/onboarding/actions.ts` lines 85-100; also `src/lib/auth/onboarding-guard.ts` lines 24-38
**Apply to:** All new Server Actions in `src/lib/settings/actions.ts` (`saveStoreSettings`, `updateStoreSlug`, `checkSlugAvailability`).

### Zod validation with Portuguese messages, re-validated server-side
**Source:** `src/lib/validation/onboarding.ts` (whole file) — client-side via `zodResolver` in the form, server-side via `.safeParse()` inside the Server Action (never trust client-only, per `saveOnboarding` lines 68-78).
**Apply to:** `src/lib/slug/validation.ts` and reused `onboardingSchema` fields in `settings-form.tsx`.

### Toast feedback via `sonner`
**Source:** `src/app/(admin)/onboarding/onboarding-wizard.tsx` lines 62-65 (`toast.error(result.error)` on Server Action failure)
**Apply to:** All new client components — `settings-form.tsx`, `slug-editor.tsx`, `qr-code-panel.tsx` — for save-success (D-12 "Link copiado!" and general "Configurações salvas!"), save-failure, and copy-to-clipboard feedback.

### `"use server"` Server Action file convention
**Source:** `src/lib/onboarding/actions.ts` line 1, `src/lib/auth/actions.ts` line 1
**Apply to:** `src/lib/settings/actions.ts` — top-of-file `"use server"` directive, one exported async function per action, return type `{ error: string } | void` or equivalent success shape (no throw-based error handling).

### Supabase server client
**Source:** `src/lib/supabase/server.ts` (`createClient()`, cookie-based session, always use `getUser()` never `getSession()`)
**Apply to:** Every new Server Action and the `configuracoes/page.tsx` Server Component.

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/(admin)/configuracoes/qr-code-panel.tsx` | component | transform (client-only) | No prior QR/canvas/clipboard component exists; use RESEARCH.md's Code Examples directly |
| `src/lib/hooks/use-debounce.ts` | hook | transform | First debounce hook in codebase; use RESEARCH.md Pattern 2 |
| `tests/settings/*.test.ts` | test | request-response/unit | No `tests/` directory was found under the explored `src/` tree during this mapping pass — planner/executor should confirm actual test directory location (RESEARCH.md references `tests/onboarding/store-settings.test.ts` and `tests/rls/isolation.test.ts` as adaptable fixtures; verify these exist before assuming the pattern, as this agent's read-only codebase scan was scoped to `src/` and `supabase/`) |
| `supabase/migrations/0002_slug_availability_rpc.sql` (RPC logic itself, not the file convention) | migration | request-response (RPC) | No existing `SECURITY DEFINER` function in `0001_init_stores_rls.sql` to copy the RPC body from — only the migration file's structural/comment conventions are reusable; the RPC SQL itself must come from RESEARCH.md Pattern 1 |

## Metadata

**Analog search scope:** `src/app/(admin)/**`, `src/lib/**`, `supabase/migrations/**`
**Files scanned:** `src/app/(admin)/dashboard/page.tsx`, `src/app/(admin)/onboarding/{page,onboarding-wizard}.tsx`, `src/lib/onboarding/actions.ts`, `src/lib/auth/{actions,onboarding-guard,reset-actions}.ts`, `src/lib/validation/onboarding.ts`, `src/lib/phone/normalize-br.ts`, `src/lib/supabase/server.ts`, `supabase/migrations/0001_init_stores_rls.sql`
**Pattern extraction date:** 2026-07-12
