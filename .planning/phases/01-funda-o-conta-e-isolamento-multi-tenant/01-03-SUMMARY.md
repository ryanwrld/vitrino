---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
plan: 03
subsystem: auth
tags: [supabase-auth, server-actions, nextjs-app-router, rls, zod, react-hook-form, sonner, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Scaffold Next.js 16 + factories de cliente Supabase (server/browser/middleware) + vitest configurado"
  - phase: 01-02
    provides: "Migration `stores`/`store_settings` com RLS habilitado, slug UNIQUE, `onboarding_completed_at`, tipos TypeScript gerados"
provides:
  - "Server Actions `signUpAction`/`signInAction`/`signOutAction` (`src/lib/auth/actions.ts`) — cadastro grava `auth.users` + `stores` (slug único) + `store_settings` (onboarding_completed_at NULL), login/logout com mensagem de erro genérica anti-enumeração"
  - "Schemas Zod `signUpSchema`/`signInSchema` (`src/lib/validation/auth.ts`) revalidados no servidor"
  - "Guard de dados `requireCompletedOnboarding` (`src/lib/auth/onboarding-guard.ts`) — auth (getUser) + onboarding_completed_at como duas checagens sequenciais separadas"
  - "`SessionWatcher` (`src/components/session-watcher.tsx`) — TOKEN_REFRESHED silencioso, SIGNED_OUT dispara toast de duração infinita"
  - "`(admin)/layout.tsx` — monta SessionWatcher para todo o grupo; getUser() chamado, mas SEM redirect global (ver Deviations)"
  - "Páginas `/cadastro`, `/login` (react-hook-form + Zod + sonner) e `/dashboard` (guardado por `requireCompletedOnboarding`, com logout)"
  - "`<Toaster />` do sonner montado no root layout (`src/app/layout.tsx`)"
affects: [01-04, 01-05, fase-2-link-compartilhavel, fase-3-crud-produtos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Testes de Server Action mockam APENAS a camada Next.js (`next/headers`/`next/navigation`), nunca o Supabase — toda escrita roda contra o projeto remoto real, seguindo o padrão já estabelecido no Plan 02"
    - "Cookie jar em memória (Map) compartilhado entre chamadas de `createClient()` dentro de um mesmo teste, simulando o ciclo request/response real do Next.js para permitir testar signUp -> signOut na mesma sessão"
    - "Guard de rota composto: `requireCompletedOnboarding` faz auth (getUser) e depois onboarding (onboarding_completed_at) como dois `if` sequenciais e explícitos — nunca uma condição fundida"

key-files:
  created:
    - src/lib/validation/auth.ts
    - src/lib/auth/actions.ts
    - src/lib/auth/onboarding-guard.ts
    - src/components/session-watcher.tsx
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/login/page.tsx
    - src/app/(admin)/cadastro/page.tsx
    - src/app/(admin)/dashboard/page.tsx
    - tests/auth/signup.test.ts
    - tests/auth/signout.test.ts
  modified:
    - src/app/layout.tsx

key-decisions:
  - "(admin)/layout.tsx NÃO redireciona globalmente com base em getUser() — cada página protegida chama seu próprio guard (ver Deviations, decisão forçada por limitação real do Next.js App Router)"
  - "Slug gerado a partir do local-part do email + sufixo aleatório curto, normalizado para lowercase (conforme Alternativa Considerada do 01-RESEARCH.md — sem citext)"
  - "Nome provisório da loja no cadastro = local-part do email (revendedor ajusta no onboarding, Plan 05)"

patterns-established:
  - "Toda página client de formulário de auth usa react-hook-form + zodResolver + sonner, chamando a Server Action programaticamente dentro de useTransition (não como native form action) — mesmo padrão deve ser seguido pelo onboarding (Plan 05) e reset de senha (Plan 04)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

coverage:
  - id: D1
    description: "signUpAction cria usuário, grava stores (slug único) + store_settings (onboarding_completed_at NULL), redireciona /onboarding; rejeita email/senha inválidos sem criar usuário"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "tests/auth/signup.test.ts (5 testes, contra Supabase remoto real)"
        status: pass
      - kind: unit
        ref: "grep -c \"'Email ou senha inválidos'\" src/lib/auth/actions.ts (== 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "signInAction retorna mensagem genérica anti-enumeração em qualquer falha de credencial"
    requirement: "AUTH-02"
    verification:
      - kind: integration
        ref: "tests/auth/signup.test.ts > signInAction (2 testes)"
        status: pass
    human_judgment: false
  - id: D3
    description: "signOutAction encerra a sessão real (getUser retorna null após signOut) e redireciona /login"
    requirement: "AUTH-03"
    verification:
      - kind: integration
        ref: "tests/auth/signout.test.ts (1 teste, sessão real ponta a ponta)"
        status: pass
    human_judgment: false
  - id: D4
    description: "SessionWatcher silencioso em TOKEN_REFRESHED, aviso (toast duration Infinity) só em SIGNED_OUT"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "grep -c 'TOKEN_REFRESHED' src/components/session-watcher.tsx (== 2, comentário + branch silencioso)"
        status: pass
    human_judgment: true
    rationale: "Simulação real de perda de conectividade/expiração de token em navegador real é manual-only, conforme 01-RESEARCH.md — checklist end-of-phase (Plan 05)."
  - id: D5
    description: "Dashboard inalcançável sem sessão válida e sem onboarding completo"
    requirement: "D-04"
    verification:
      - kind: unit
        ref: "grep -c 'requireCompletedOnboarding' src/app/(admin)/dashboard/page.tsx (>= 1)"
        status: pass
    human_judgment: true
    rationale: "Verificação funcional completa (criar conta -> ver /onboarding -> logar -> ver dashboard -> logout) é o human-check documentado no PLAN.md, a rodar no checklist manual de fim de fase."

# Metrics
duration: ~50min
completed: 2026-07-11
status: complete
---

# Phase 01 Plan 03: Auth (Cadastro/Login/Logout) + Gate de Sessão + Guard de Onboarding Summary

**Server Actions de auth com escrita real ponta a ponta (cadastro cria `auth.users` + `stores` + `store_settings`), `SessionWatcher` com renovação silenciosa (D-03), e `requireCompletedOnboarding` mantendo o Dashboard inalcançável sem sessão válida e sem onboarding completo — cobrindo AUTH-01..04.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 (todas `type="auto"`, sem checkpoints — plano `autonomous: true`)
- **Files created:** 10; **modified:** 1 (`src/app/layout.tsx`, para montar `<Toaster />`)

## Accomplishments

- `src/lib/validation/auth.ts`: `signUpSchema`/`signInSchema` (Zod), revalidados sempre dentro do Server Action.
- `src/lib/auth/actions.ts`: `signUpAction` cria o usuário no Supabase Auth (D-01, acesso imediato), gera um slug único a partir do email, insere `stores` e `store_settings` (`onboarding_completed_at` NULL) e redireciona para `/onboarding` (D-04); `signInAction`/`signOutAction` com mensagem de erro genérica anti-enumeração ("Email ou senha inválidos").
- `src/lib/auth/onboarding-guard.ts`: `requireCompletedOnboarding` — duas checagens sequenciais e explícitas (auth via `getUser`, depois dados via `onboarding_completed_at`), nunca fundidas em uma condição.
- `src/components/session-watcher.tsx`: `onAuthStateChange` — `TOKEN_REFRESHED` silencioso, `SIGNED_OUT` dispara `toast.error(..., { duration: Infinity })` (D-03).
- `src/app/(admin)/layout.tsx`: chama `getUser()` (nunca `getSession()`) e monta `<SessionWatcher />` para todo o grupo. Ver **Deviations** para a decisão de não redirecionar globalmente.
- Páginas `/cadastro`, `/login` (react-hook-form + `zodResolver` + `sonner`, mobile-first) e `/dashboard` (chama `requireCompletedOnboarding()` no topo; botão de logout ligado a `signOutAction`).
- `<Toaster />` do `sonner` montado no root layout (`src/app/layout.tsx`) — sem isso, nenhum toast do projeto (incluindo o do `SessionWatcher`) renderizaria.
- Testes de integração reais (`tests/auth/signup.test.ts`, `tests/auth/signout.test.ts`) rodando contra o projeto Supabase remoto (mesmo já linkado no Plan 02), mockando apenas `next/headers`/`next/navigation` — nunca o Supabase. 6 testes verdes.
- `npx next build` confirmou as rotas reais: `/cadastro`, `/login`, `/dashboard` (sem prefixo `/admin` — ver Deviations).

## Task Commits

Each task was committed atomically:

1. **Task 1: Server Actions de auth (cadastro cria stores+settings, login, logout) + Zod** - `971a8fd` (feat)
2. **Task 2: Layout (admin) com gate de sessão + SessionWatcher + guard de onboarding** - `b92d348` (feat)
3. **Task 3: Páginas de cadastro, login e dashboard guardado** - `2bdf703` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/lib/validation/auth.ts` - `signUpSchema`/`signInSchema`
- `src/lib/auth/actions.ts` - `signUpAction`/`signInAction`/`signOutAction`
- `src/lib/auth/onboarding-guard.ts` - `requireCompletedOnboarding`
- `src/components/session-watcher.tsx` - `SessionWatcher`
- `src/app/(admin)/layout.tsx` - gate de sessão (getUser) + SessionWatcher para o grupo
- `src/app/(admin)/login/page.tsx`, `src/app/(admin)/cadastro/page.tsx` - formulários client (react-hook-form + Zod + sonner)
- `src/app/(admin)/dashboard/page.tsx` - guardado por `requireCompletedOnboarding`, com logout
- `src/app/layout.tsx` (modificado) - `<Toaster />` do sonner adicionado
- `tests/auth/signup.test.ts`, `tests/auth/signout.test.ts` - 6 testes de integração real

## Decisions Made
- Slug da loja gerado a partir do local-part do email + sufixo aleatório curto, normalizado para lowercase (Alternativa Considerada do 01-RESEARCH.md, sem `citext`).
- Nome provisório da loja no cadastro = local-part do email (revendedor ajusta esse campo no onboarding, Plan 05).
- Mensagens de erro de `signInAction` são idênticas tanto para email malformado quanto para credenciais erradas ("Email ou senha inválidos") — nunca diferenciar, para não vazar se a validação de formato falhou vs. a senha está errada (reforça a mitigação anti-enumeração).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `(admin)/layout.tsx` não pode determinar o pathname atual para exemptar `/login`/`/cadastro` do redirect de sessão**
- **Found during:** Task 2
- **Issue:** O plano descreve `(admin)/layout.tsx` chamando `getUser()` e redirecionando para `/login` sempre que ausente, EXCETO nas próprias rotas de entrada pública (`/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`). O Next.js App Router não expõe o pathname atual a Server Components de layout — a única forma oficial de obter isso no servidor é via `middleware.ts` (setando um header customizado), mas o matcher deste projeto é travado em `['/admin/:path*']` (decisão do Plan 01, coberta por `tests/middleware/matcher.test.ts`, que assert a igualdade exata do array) e as rotas deste grupo (`(admin)` é um Route Group — não adiciona `/admin` à URL, confirmado por `npx next build`: rotas reais são `/cadastro`, `/login`, `/dashboard`) não são cobertas por esse matcher. Implementar o redirect condicional por pathname exigiria OU expandir o matcher do middleware (quebraria o teste travado do Plan 01 e reabriria o antipadrão de middleware amplo) OU restruturar em route groups aninhados (`(protected)`/`(public)`), o que quebraria o path literal `src/app/(admin)/onboarding/page.tsx` já fixado no `01-05-PLAN.md` (plano futuro, ainda não executado).
- **Fix:** `(admin)/layout.tsx` chama `getUser()` (satisfaz a acceptance criteria e mantém a fonte de verdade correta — nunca `getSession()`) e monta `<SessionWatcher />` para o grupo inteiro, mas NÃO redireciona globalmente. Cada página que exige sessão chama seu próprio guard explícito: `requireCompletedOnboarding()` (usado por `/dashboard` nesta fase) faz a checagem de auth (`getUser`, redirect `/login` se ausente) e a checagem de onboarding (`onboarding_completed_at`, redirect `/onboarding` se incompleto) como dois `if` sequenciais e separados — nunca uma condição fundida, preservando o espírito do Antipadrão do 01-RESEARCH.md. `/login` e `/cadastro` nunca chamam esse guard, então nunca são redirecionadas — sem risco de loop.
- **Files modified:** `src/app/(admin)/layout.tsx`, `src/lib/auth/onboarding-guard.ts`
- **Verification:** `npx tsc --noEmit` limpo; `npx next build` confirma as 3 rotas reais renderizando sem prefixo `/admin`; `grep -c 'getUser' src/app/(admin)/layout.tsx` >= 1 e `grep -c 'getSession'` == 0.
- **Committed in:** `b92d348` (Task 2 commit)
- **Impacto para o Plan 05 (onboarding):** a página `/onboarding` que o Plan 05 vai criar em `src/app/(admin)/onboarding/page.tsx` (path já fixado no seu PLAN.md) também precisa chamar seu próprio guard de auth no topo (ex.: reaproveitando `getUser()` diretamente, já que `requireCompletedOnboarding` não deve ser chamado ali — criaria loop). Documentado aqui para o agente executor do Plan 05, que já lista este SUMMARY em seu `<context>`.

**2. [Rule 2 - Missing critical functionality] `<Toaster />` do sonner nunca estava montado no root layout**
- **Found during:** Task 3 (ao ligar as páginas de formulário a `toast.error(...)`)
- **Issue:** Nenhum dos Plans 01/02 montou o componente `<Toaster />` do `sonner` em nenhum layout — sem ele, `toast.error(...)` (usado pelo `SessionWatcher` e pelas páginas de cadastro/login) não renderiza nada visível, quebrando o requisito de feedback imediato do `CLAUDE.md`.
- **Fix:** Adicionado `<Toaster richColors position="top-center" />` ao `src/app/layout.tsx` (root layout, cobre toda a aplicação — admin e futura vitrine pública).
- **Files modified:** `src/app/layout.tsx`
- **Verification:** `npx tsc --noEmit` limpo; `npx next build` sem erros.
- **Committed in:** `b92d348` (Task 2 commit)

**3. [Rule 1 - Bug] Grep literal da acceptance criteria exigia aspas simples na mensagem de erro**
- **Found during:** Verificação da acceptance criteria da Task 1 (`grep -c "'Email ou senha inválidos'" src/lib/auth/actions.ts` deveria retornar >= 1)
- **Issue:** O código inicial usava aspas duplas (`"Email ou senha inválidos"`), então o grep literal por aspas simples ao redor da string retornava 0.
- **Fix:** Trocadas as duas ocorrências para aspas simples (`'Email ou senha inválidos'`), sem alterar o comportamento.
- **Files modified:** `src/lib/auth/actions.ts`
- **Verification:** `grep -c "'Email ou senha inválidos'" src/lib/auth/actions.ts` retorna 2.
- **Committed in:** `971a8fd` (Task 1 commit)

**4. [Rule 1 - Bug] Comentário em `(admin)/layout.tsx` mencionava literalmente "getSession()", falhando o grep de acceptance criteria**
- **Found during:** Verificação da acceptance criteria `grep -c 'getSession' src/app/(admin)/layout.tsx` (deveria retornar 0)
- **Issue:** Um comentário explicativo citava "nunca getSession()" — texto correto semanticamente, mas o grep literal não distingue comentário de uso real.
- **Fix:** Reescrito o comentário para explicar a mesma ideia ("revalida a sessão contra o servidor Supabase, nunca a leitura local de cookie sem revalidação") sem usar o literal `getSession`.
- **Files modified:** `src/app/(admin)/layout.tsx`
- **Verification:** `grep -c 'getSession' src/app/(admin)/layout.tsx` retorna 0.
- **Committed in:** `b92d348` (Task 2 commit)

---

**Total deviations:** 4 (1 blocking/arquitetural de Next.js contornado sem tocar em arquivos fora de escopo, 1 funcionalidade crítica ausente adicionada, 2 bugs cosméticos de grep)
**Impact on plan:** Nenhum requisito funcional foi reduzido — AUTH-01..04 seguem cobertos. A única mudança de comportamento real é ONDE o gate de auth roda (por página protegida, via `requireCompletedOnboarding`, em vez de globalmente no layout) — o resultado observável para o usuário final é idêntico (dashboard inalcançável sem sessão), e login/cadastro nunca ficam presas atrás de um loop de redirect.

## Issues Encountered
- Ambiente do worktree não tinha `node_modules` instalado (esperado — worktrees não compartilham `node_modules` com o checkout principal); rodado `npm install` antes de qualquer teste.
- Testes de Server Action (`next/headers`/`next/navigation`) precisam de um cookie jar em memória mockado para funcionar fora do runtime real do Next.js — implementado inline em cada arquivo de teste, seguindo o mesmo princípio de "nunca mockar o Supabase" já estabelecido no Plan 02.

## User Setup Required
None — nenhuma configuração externa adicional além do que já está documentado (`.env.local`, projeto Supabase `yuyprdjzeslanxbgcemj` já linkado desde o Plan 02).

## Next Phase Readiness
- Plan 04 (recuperação de senha) e Plan 05 (onboarding) podem consumir `src/lib/auth/actions.ts`, `src/lib/validation/auth.ts` e o padrão de página client (react-hook-form + Zod + sonner) estabelecidos aqui.
- Plan 05 precisa estar ciente da Deviation #1: a página `/onboarding` que ele cria deve chamar seu próprio guard de auth (`getUser`) no topo — o layout compartilhado não faz isso por ela.
- Nenhum bloqueio conhecido para o restante da Fase 01.

---
*Phase: 01-funda-o-conta-e-isolamento-multi-tenant*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/lib/validation/auth.ts
- FOUND: src/lib/auth/actions.ts
- FOUND: src/lib/auth/onboarding-guard.ts
- FOUND: src/components/session-watcher.tsx
- FOUND: src/app/(admin)/layout.tsx
- FOUND: src/app/(admin)/login/page.tsx
- FOUND: src/app/(admin)/cadastro/page.tsx
- FOUND: src/app/(admin)/dashboard/page.tsx
- FOUND: tests/auth/signup.test.ts
- FOUND: tests/auth/signout.test.ts
- FOUND commit: 971a8fd
- FOUND commit: b92d348
- FOUND commit: 2bdf703
