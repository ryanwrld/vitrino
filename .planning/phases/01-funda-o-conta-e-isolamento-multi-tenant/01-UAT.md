---
status: partial
phase: 01-funda-o-conta-e-isolamento-multi-tenant
source: [01-VERIFICATION.md]
started: 2026-07-12T00:17:59Z
updated: 2026-07-12T01:20:00Z
---

## Current Test

[testing paused — 1 item outstanding: M-3 bloqueado por configuração pendente de SMTP/template de email]

## Tests

### 1. M-1 (AUTH-02) — persistência de sessão após F5 real no navegador
expected: Permanece autenticado após o reload (cookie httpOnly gerido por @supabase/ssr sobrevive ao reload)
result: pass

### 2. M-2 (AUTH-04) — renovação silenciosa vs. aviso em falha real
expected: TOKEN_REFRESHED nunca produz UI; SIGNED_OUT dispara toast "Sua sessão expirou..." apenas quando a renovação falha de verdade
result: pass

### 3. M-3 (AUTH-05) — ciclo completo de reset de senha com email real
expected: Link do email leva a /auth/confirm?token_hash=...&type=recovery, verifyOtp estabelece sessão, redireciona a /redefinir-senha, updateUser troca a senha
result: [blocked]

### 4. M-4 (LOJA-01/WPP-01) — confirmação visual do wizard de onboarding
expected: Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir
result: issue
reported: "ui horrivel — labels (Nome da loja, Logo, Cor de destaque, Frase, WhatsApp, Template) e placeholders quase invisíveis, texto escuro sobre fundo preto, praticamente ilegível"
severity: major

### 5. (bônus, achado durante M-2) Mensagem de erro de login com rede offline
expected: Tentar logar sem conexão de rede deve mostrar um erro de conexão/rede, não "Email ou senha inválidos" (mensagem enganosa — sugere senha errada quando na verdade é falha de rede)
result: issue
reported: "o único bug identificado foi essa mensagem de 'email ou senha inválidos' aparecendo com o wifi desligado"
severity: major

## Summary

total: 5
passed: 2
issues: 2
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir"
  status: failed
  reason: "User reported: ui horrivel — labels e placeholders do wizard de onboarding quase invisíveis (texto escuro sobre fundo preto), praticamente ilegível"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Tentar logar sem conexão de rede mostra um erro de rede/conexão, não uma mensagem de credenciais inválidas"
  status: failed
  reason: "User reported: o único bug identificado foi a mensagem 'email ou senha inválidos' aparecendo com o wifi desligado, ao tentar logar"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
