---
status: testing
phase: 01-funda-o-conta-e-isolamento-multi-tenant
source: [01-VERIFICATION.md]
started: 2026-07-12T00:17:59Z
updated: 2026-07-12T00:17:59Z
---

## Current Test

number: 1
name: M-1 (AUTH-02) — persistência de sessão após F5 real no navegador
expected: |
  Login em /login, aguardar alguns minutos com atividade normal, dar F5 na página do painel.
  Permanece autenticado após o reload (cookie httpOnly gerido por @supabase/ssr sobrevive ao reload).
awaiting: user response

## Tests

### 1. M-1 (AUTH-02) — persistência de sessão após F5 real no navegador
expected: Permanece autenticado após o reload (cookie httpOnly gerido por @supabase/ssr sobrevive ao reload)
result: [pending]

### 2. M-2 (AUTH-04) — renovação silenciosa vs. aviso em falha real
expected: TOKEN_REFRESHED nunca produz UI; SIGNED_OUT dispara toast "Sua sessão expirou..." apenas quando a renovação falha de verdade
result: [pending]

### 3. M-3 (AUTH-05) — ciclo completo de reset de senha com email real
expected: Link do email leva a /auth/confirm?token_hash=...&type=recovery, verifyOtp estabelece sessão, redireciona a /redefinir-senha, updateUser troca a senha
result: [blocked]

### 4. M-4 (LOJA-01/WPP-01) — confirmação visual do wizard de onboarding
expected: Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 1

## Gaps
