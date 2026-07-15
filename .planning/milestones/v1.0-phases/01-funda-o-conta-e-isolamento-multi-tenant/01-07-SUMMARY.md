---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
plan: 07
subsystem: auth
tags: [supabase, auth-js, server-actions, error-handling, vitest]

# Dependency graph
requires:
  - phase: 01-funda-o-conta-e-isolamento-multi-tenant (plan 03)
    provides: signInAction original com mensagem genérica anti-enumeração
provides:
  - "signInAction distingue AuthRetryableFetchError (falha de rede) de AuthApiError (credencial real inválida)"
  - "Mensagem de rede honesta: 'Não foi possível conectar. Verifique sua internet e tente novamente.'"
  - "Teste unitário mockado cobrindo os dois caminhos de erro"
affects: [phases futuras que tocam signInAction ou UX de erro de login]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Checar isAuthRetryableFetchError(error) ANTES do fallback genérico anti-enumeração em Server Actions de auth"
    - "Teste unitário mockado (vi.hoisted + vi.mock de @/lib/supabase/server) para casos de erro determinísticos, complementando testes de integração real do Supabase"

key-files:
  created:
    - tests/auth/signin-network-error.test.ts
  modified:
    - src/lib/auth/actions.ts

key-decisions:
  - "isAuthRetryableFetchError checado primeiro, mensagem genérica 'Email ou senha inválidos' mantida byte-a-byte para todo AuthApiError — preserva a mitigação anti-enumeração T-01-08 do plano 01-03"
  - "Nenhuma dependência nova: isAuthRetryableFetchError já é re-exportado de @supabase/supabase-js (via @supabase/auth-js)"
  - "Não alterado signUpAction/signOutAction/generateStoreSlug/validação zod — escopo estritamente limitado ao gap do UAT teste 5"

patterns-established:
  - "Gap-closure de UAT com root-cause já diagnosticado em .planning/debug/: plano aplica o fix já decidido, sem redescobrir a causa"

requirements-completed: [AUTH-02]

coverage:
  - id: D1
    description: "signInAction retorna mensagem de rede distinta quando signInWithPassword falha por AuthRetryableFetchError (offline/fetch failed)"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "tests/auth/signin-network-error.test.ts#retorna mensagem de conexão distinta para AuthRetryableFetchError (falha de rede)"
        status: pass
    human_judgment: false
  - id: D2
    description: "signInAction mantém a mensagem genérica anti-enumeração 'Email ou senha inválidos' inalterada para AuthApiError (credencial real inválida)"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "tests/auth/signin-network-error.test.ts#mantém a mensagem genérica anti-enumeração para AuthApiError (credencial real inválida)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-11
status: complete
---

# Phase 01 Plan 07: Distinguir erro de rede de credenciais inválidas no login Summary

**`signInAction` agora checa `isAuthRetryableFetchError(error)` antes do fallback genérico, retornando uma mensagem de conexão honesta para falha de rede sem tocar na mensagem anti-enumeração usada para credencial real inválida.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-11T22:16:50-04:00
- **Completed:** 2026-07-11T22:23:46-04:00
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2 (1 criado, 1 modificado)

## Accomplishments
- Gap major do UAT (teste 5) fechado: login com wifi desligado agora mostra "Não foi possível conectar. Verifique sua internet e tente novamente." em vez de "Email ou senha inválidos"
- Mensagem genérica anti-enumeração preservada byte-a-byte para `AuthApiError` (verificado via `git diff` — a linha da string não foi tocada em nenhum dos dois commits)
- Teste unitário determinístico (sem rede real) cobrindo os dois caminhos de erro, complementando os testes de integração existentes em `tests/auth/signup.test.ts`

## Task Commits

Cada task foi commitada atomicamente (ciclo TDD RED → GREEN):

1. **Task 1: Escrever teste dos dois caminhos de erro (RED)** - `81ddc4f` (test)
2. **Task 2: Diferenciar erro de rede em signInAction (GREEN)** - `b0e1fb3` (feat)

**Plan metadata:** commit de fechamento pendente (ver step final do executor)

## Files Created/Modified
- `tests/auth/signin-network-error.test.ts` - teste unitário mockado (vi.hoisted + vi.mock de `next/navigation` e `@/lib/supabase/server`) cobrindo `AuthRetryableFetchError` (mensagem de rede) e `AuthApiError` (mensagem genérica anti-enumeração)
- `src/lib/auth/actions.ts` - `signInAction` importa `isAuthRetryableFetchError` de `@supabase/supabase-js` e checa esse caso antes do `return { error: 'Email ou senha inválidos' }` existente; doc-comment atualizado registrando a exceção de rede

## Decisions Made
- `isAuthRetryableFetchError(error)` checado PRIMEIRO, com a mensagem genérica mantida como fallback inalterado — decisão herdada diretamente do diagnóstico em `.planning/debug/login-network-error-message.md` (nenhuma nova decisão de arquitetura necessária, root cause já confirmado por leitura do código-fonte do `@supabase/auth-js`)
- Nenhuma dependência nova instalada: `isAuthRetryableFetchError` já é re-exportado de `@supabase/supabase-js` (que re-exporta `@supabase/auth-js` inteiro)

## Deviations from Plan

None - plan executado exatamente como escrito. RED falhou no caso esperado (rede) e já passava no caso anti-enumeração (confirmando que a regressão não existia); GREEN passou nos dois casos sem tocar em nenhum outro Server Action.

## Issues Encountered
None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- Gap do UAT teste 5 fechado; suite completa (`npm test`) permanece verde (9 arquivos, 37 testes) e `tsc --noEmit` sem erros
- Verificação manual opcional (end-of-phase UAT) ainda recomendada: desligar wifi, tentar logar em `/login`, confirmar a mensagem de conexão em vez de "Email ou senha inválidos" — não bloqueante, já coberto por teste unitário determinístico

---
*Phase: 01-funda-o-conta-e-isolamento-multi-tenant*
*Completed: 2026-07-11*

## Self-Check: PASSED
