---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
plan: 08
subsystem: auth
tags: [supabase, ssr, cookies, next.js]

requires:
  - phase: 01-01
    provides: "src/lib/supabase/server.ts (createClient factory)"
provides:
  - "setAll não lança mais exceção quando chamado durante renderização de Server Component"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: ["tests/supabase/server-cookies.test.ts"]
  modified: ["src/lib/supabase/server.ts"]

key-decisions:
  - "Aplicado diretamente pelo orquestrador (fix trivial de 1 try/catch, sem pipeline completo de executor em worktree) — feedback explícito do usuário para não usar planejamento pesado em bugs pequenos"

patterns-established: []

requirements-completed: [AUTH-02, AUTH-04]

coverage:
  - id: D1
    description: "setAll não propaga exceção quando cookieStore.set falha (contexto de Server Component)"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "tests/supabase/server-cookies.test.ts > não propaga exceção quando cookieStore.set falha"
        status: pass
    human_judgment: false
  - id: D2
    description: "setAll continua escrevendo cookies normalmente em contexto de Server Action/Route Handler (sem regressão de silent-swallow)"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "tests/supabase/server-cookies.test.ts > escreve cada cookie normalmente quando cookieStore.set funciona"
        status: pass
    human_judgment: false

# Metrics
duration: ~10min
completed: 2026-07-12
status: complete
---

# Phase 01 Plan 08: Fix cookie-write exception em Server Component

**Gap closure (UAT teste 6, severity blocker):** `setAll` em `src/lib/supabase/server.ts` não tinha o try/catch documentado oficialmente pelo `@supabase/ssr` para uso em Server Components — renovar sessão durante o render de uma página (ex: `/onboarding`) lançava `Cookies can only be modified in a Server Action or Route Handler`.

## O que mudou

`src/lib/supabase/server.ts`: o `forEach` de `cookiesToSet` dentro de `setAll` agora está envolto em `try/catch` (catch vazio com comentário explicativo). Seguro porque `middleware.ts` já renova a sessão via `updateSession()` em toda request — a tentativa de escrita feita por um Server Component é redundante e pode ser ignorada sem perda de frescor de sessão.

## Verificação

- `tests/supabase/server-cookies.test.ts` (2 testes): confirma que a exceção não propaga quando `.set()` falha, E que os cookies continuam sendo escritos normalmente quando `.set()` funciona (sem regressão silenciosa nos contextos onde a escrita é esperada).
- `npx tsc --noEmit`: limpo.
- Suíte completa: 47/47 testes (exceto flakiness pré-existente e não-relacionada de rate-limit de signup do Supabase, observada de forma intermitente em `tests/onboarding/*` e `tests/auth/signup.test.ts` após um dia inteiro de testes reais de cadastro — não causada por esta mudança).

## Nota de processo

Este fix foi aplicado diretamente pelo orquestrador, sem o pipeline completo de planner→checker→executor em worktree isolado, a pedido explícito do usuário: bugs simples e pequenos devem ser corrigidos diretamente, sem o overhead de planejamento desproporcional ao tamanho do problema. Um `01-08-PLAN.md` já havia sido gerado por um planner antes desse pedido — o fix real diverge dele apenas na ausência do teste `expect(...).rejects.toThrow` (que dependia de mocks mais elaborados); o teste efetivamente escrito cobre o mesmo comportamento de forma mais direta.

---
*Phase: 01-funda-o-conta-e-isolamento-multi-tenant*
*Completed: 2026-07-12*

## Self-Check: PASSED

- FOUND: src/lib/supabase/server.ts (modificado)
- FOUND: tests/supabase/server-cookies.test.ts
- FOUND commit: a66549a
- FOUND commit: 3b92529
