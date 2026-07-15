# Phase 1: Fundação, Conta e Isolamento Multi-Tenant - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 16
**Analogs found:** 0 / 16 (greenfield project — no prior source code exists)

## Codebase State

Confirmed via filesystem scan: the repository root contains only `.git/`, `.planning/`, and `.claude/`. There is no `src/`, `app/`, `lib/`, `package.json`, or any application code. No `CLAUDE.md` and no `.claude/skills/` or `.agents/skills/` directories exist either. This is Phase 1 of the project — there are no prior phases and no existing files to use as analogs.

**Consequence for the planner:** every file below has no codebase precedent. Do not invent a "closest analog" — there isn't one. Use `01-RESEARCH.md`'s own `## Exemplos de Código` and `## Padrões de Arquitetura` sections (Patterns 1-5) as the implementation reference instead; they are already cited with sources (official Supabase/Next.js docs) and are reproduced here verbatim where load-bearing, so the planner does not need to re-open RESEARCH.md for these specific excerpts.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|-----------------|----------------|
| `src/lib/supabase/server.ts` | provider | request-response | none | no analog (greenfield) |
| `src/lib/supabase/client.ts` | provider | event-driven | none | no analog (greenfield) |
| `src/lib/supabase/middleware.ts` | middleware | request-response | none | no analog (greenfield) |
| `src/middleware.ts` | middleware | request-response | none | no analog (greenfield) |
| `src/lib/auth/actions.ts` | service (Server Actions) | CRUD (auth) | none | no analog (greenfield) |
| `src/lib/auth/onboarding-guard.ts` | utility (route guard) | request-response | none | no analog (greenfield) |
| `src/lib/phone/normalize-br.ts` | utility (pure transform) | transform | none | no analog (greenfield) |
| `src/app/(admin)/layout.tsx` | component (server layout) | request-response | none | no analog (greenfield) |
| `src/app/(admin)/login/page.tsx` | component | request-response | none | no analog (greenfield) |
| `src/app/(admin)/cadastro/page.tsx` | component | request-response | none | no analog (greenfield) |
| `src/app/(admin)/esqueci-senha/page.tsx` | component | request-response | none | no analog (greenfield) |
| `src/app/(admin)/redefinir-senha/page.tsx` | component | request-response | none | no analog (greenfield) |
| `src/app/(admin)/onboarding/page.tsx` | component (wizard) | CRUD | none | no analog (greenfield) |
| `src/app/(admin)/dashboard/page.tsx` | component | request-response | none | no analog (greenfield) |
| `src/app/auth/confirm/route.ts` | route (Route Handler) | request-response | none | no analog (greenfield) |
| Migration: `stores` + `store_settings` tables + RLS policies | migration | CRUD | none | no analog (greenfield) |
| `tests/auth/*.test.ts`, `tests/onboarding/*.test.ts`, `tests/phone/normalize-br.test.ts`, `tests/rls/isolation.test.ts`, `tests/middleware/matcher.test.ts` | test | — | none | no analog (greenfield) |

## Pattern Assignments

No codebase pattern assignments are possible — there is nothing to copy from. Instead, the following excerpts from `01-RESEARCH.md` are the canonical implementation reference for each file group. File paths/line numbers below refer to `01-RESEARCH.md` itself, not to source code.

### `src/lib/supabase/server.ts` (provider, request-response)

**Reference:** RESEARCH.md Padrão 1 (lines 203-232)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```
Rule: always use `getUser()` (revalidates against Supabase server) for any gate/middleware decision — never `getSession()` alone.

### `src/middleware.ts` (middleware, request-response)

**Reference:** RESEARCH.md Antipadrões a Evitar (lines 335-339) + Armadilha 5 (lines 383-387)

No code excerpt exists yet in RESEARCH.md beyond the constraint: matcher MUST be `['/admin/:path*']` exactly, never a catch-all with an internal allowlist. This is the single most important structural constraint of the phase — the public `/loja/[slug]` route (built in Phase 4) must be unreachable by this middleware by construction, not by exception.

### `src/lib/auth/actions.ts` (service, CRUD/auth)

**Reference:** RESEARCH.md Exemplos de Código (lines 393-418)
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/onboarding') // D-01 + D-04
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: 'Email ou senha inválidos' }
  redirect('/dashboard') // onboarding guard decides if this is really reachable
}
```

### `src/app/auth/confirm/route.ts` (route, request-response)

**Reference:** RESEARCH.md Padrão 3 (lines 263-290)
```typescript
// app/auth/confirm/route.ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash })
    if (!error) redirect('/redefinir-senha')
  }
  redirect('/login?error=link_invalido_ou_expirado')
}
```
Precondition (manual, not code): the Supabase email template for "Reset Password" must use `{{ .TokenHash }}`, configured in the Supabase dashboard.

### `src/lib/phone/normalize-br.ts` (utility, transform)

**Reference:** RESEARCH.md Exemplos de Código (lines 422-434)
```typescript
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizeWhatsAppBR(input: string): { e164Digits: string } | { error: string } {
  const phone = parsePhoneNumberFromString(input, 'BR')
  if (!phone || !phone.isValid()) {
    return { error: 'Número de WhatsApp inválido. Confira o DDD e o número.' }
  }
  return { e164Digits: phone.number.replace('+', '') }
}
```
Must run server-side inside the Server Action (never client-only) — see Armadilha 2.

### `src/lib/auth/onboarding-guard.ts` (utility, request-response)

**Reference:** RESEARCH.md Padrão 5 (lines 329-333) + Pergunta em Aberto #1 (lines 460-463)

No literal code excerpt in RESEARCH.md; the recommended shape is a function that checks whether `store_settings.onboarding_completed_at` is set (recommended explicit field, not NULL-inference on individual columns) and redirects to `/onboarding` if not, applied to every route in `(admin)` except `/onboarding` and the auth entry pages.

### Migration: `stores` + `store_settings` + RLS (migration, CRUD)

**Reference:** RESEARCH.md Padrão 4 (lines 292-326)
```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  accent_color text,
  tagline text check (char_length(tagline) <= 100),
  created_at timestamptz not null default now()
);

alter table stores enable row level security;

create policy "owner_full_access_stores" on stores
  for all using (owner_id = auth.uid());

create table store_settings (
  store_id uuid primary key references stores(id) on delete cascade,
  whatsapp_e164 text,
  message_template text
);

alter table store_settings enable row level security;

create policy "owner_full_access_settings" on store_settings
  for all using (store_id in (select id from stores where owner_id = auth.uid()));
```
Non-negotiable: RLS `enable row level security` + policy must be in the SAME migration as `create table` — never a follow-up migration (Armadilha 4). `slug` must be `unique` from this first migration even though slug customization UI ships in Phase 2 (Armadilha 3).

### Session watcher (`SessionWatcher` client component, event-driven)

**Reference:** RESEARCH.md Padrão 2 (lines 234-260)
```typescript
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function SessionWatcher() {
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        toast.error('Sua sessão expirou. Salve seu trabalho e faça login novamente.', { duration: Infinity })
      }
      // TOKEN_REFRESHED: silent by design (D-03)
    })
    return () => subscription.unsubscribe()
  }, [])
  return null
}
```
Known limitation (RESEARCH.md Armadilha 1 / Assumption A2): this listener may not fire reliably for refreshes that happen entirely server-side. Mitigation: also handle auth errors explicitly in the return value of each Server Action, don't rely solely on this global listener.

## Shared Patterns

### Auth client creation (server vs. browser)
Two separate factory functions are needed project-wide: `createClient()` in `lib/supabase/server.ts` (cookie-based, for Server Actions/Components/middleware) and an equivalent `createBrowserClient()` in `lib/supabase/client.ts` (for the client-side `onAuthStateChange` listener). Every server-side file that talks to Supabase should import from `lib/supabase/server.ts`; every client component should import from `lib/supabase/client.ts`. This split does not exist yet in code — it must be established by this phase and will be the shared import convention for all subsequent phases.

### Route protection: two independent guards, never merged
1. **Auth guard** (`middleware.ts` + `getUser()`): "is there a valid session?" — scoped narrowly to `/admin/:path*`.
2. **Onboarding guard** (`onboarding-guard.ts`, checked in `(admin)/layout.tsx` or per-page): "is `store_settings` complete?" — a data check, not an auth check.
RESEARCH.md is explicit that mixing these two checks into one is an antipattern (a bug in either condition could block/allow the wrong route). Apply this separation to every protected page added in this phase and in future phases.

### Error handling / messaging convention
Generic, non-enumerating error messages for auth failures ("Email ou senha inválidos", not "user not found" vs "wrong password") — this applies to `signInAction`, `signUpAction`, and the reset-password flow uniformly (RESEARCH.md Padrões de Ameaça table, "Enumeração de contas").

### Validation convention
Zod schemas for every form boundary (signup, login, onboarding fields, phone input, tagline ≤100 chars) — paired with `react-hook-form` client-side and re-validated server-side in the Server Action itself (never trust client-only validation, per Armadilha 2).

## No Analog Found

All 16 files/groups above have no analog — this is expected and correctly reflects a genuinely empty repository (only `.git/`, `.planning/`, `.claude/` exist at project root; no `package.json`, no `src/`). The planner should treat `01-RESEARCH.md` (Padrões 1-5, Exemplos de Código, Estrutura de Projeto Recomendada) as the sole implementation reference for this phase, not this file's "closest analog" mechanism, which has nothing to point to yet.

## Metadata

**Analog search scope:** entire repository root (`find . -maxdepth 3`, excluding `.git`, `.planning`, `.claude`) — confirmed empty of application code.
**Files scanned:** 0 (no source files exist)
**Pattern extraction date:** 2026-07-10
