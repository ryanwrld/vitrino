---
status: complete
phase: 01-funda-o-conta-e-isolamento-multi-tenant
source: [01-VERIFICATION.md]
started: 2026-07-12T00:17:59Z
updated: 2026-07-14T00:00:00Z
---

## Current Test

[testing complete — M-3 aceito como bloqueado permanentemente (SMTP customizado fora de escopo do MVP, ver .planning/... memória: Supabase free tier bloqueia template de email de reset de senha; requer Resend ou upgrade pago)]

## Tests

### 1. M-1 (AUTH-02) — persistência de sessão após F5 real no navegador
expected: Permanece autenticado após o reload (cookie httpOnly gerido por @supabase/ssr sobrevive ao reload)
result: pass

### 2. M-2 (AUTH-04) — renovação silenciosa vs. aviso em falha real
expected: TOKEN_REFRESHED nunca produz UI; SIGNED_OUT dispara toast "Sua sessão expirou..." apenas quando a renovação falha de verdade
result: skipped
reason: "Token de sessão dura 1h (jwt_expiry); o navegador só tenta renovar perto do vencimento. Cortar o wifi por ~30s no meio da sessão não chega a disparar uma tentativa de renovação real — nem o caminho silencioso nem o de falha foram de fato exercitados. User confirmou que o toast \"Sua sessão expirou...\" nunca apareceu, o que é consistente com nenhuma tentativa de renovação ter ocorrido na janela testada, não com um bug. Requer testar com wifi desligado próximo da marca de ~59min de sessão para exercitar de verdade — impraticável nesta sessão de UAT."

### 3. M-3 (AUTH-05) — ciclo completo de reset de senha com email real
expected: Link do email leva a /auth/confirm?token_hash=...&type=recovery, verifyOtp estabelece sessão, redireciona a /redefinir-senha, updateUser troca a senha
result: blocked
blocked_by: third-party
reason: "Supabase free tier bloqueia customização do template de email de reset de senha ({{ .TokenHash }}) — requer SMTP customizado (Resend) ou upgrade pago. Código (requestPasswordReset, /auth/confirm, updatePassword) implementado e coberto por testes de integração; apenas o ciclo ponta-a-ponta com email real depende dessa configuração externa. Aceito como risco conhecido para o MVP em 2026-07-14."

### 4. M-4 (LOJA-01/WPP-01) — confirmação visual do wizard de onboarding
expected: Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir
result: pass
reported: "Confirmado pelo usuário: todos os labels (Nome da loja, Logo, Cor de destaque, Frase, WhatsApp, Template) legíveis após fix 01-06 — texto escuro sobre fundo branco"

### 5. (bônus, achado durante M-2) Mensagem de erro de login com rede offline
expected: Tentar logar sem conexão de rede deve mostrar um erro de conexão/rede, não "Email ou senha inválidos" (mensagem enganosa — sugere senha errada quando na verdade é falha de rede)
result: pass
reported: "Confirmado pelo usuário: mensagem agora mostra 'Não foi possível conectar. Verifique sua internet e tente novamente.' — fix 01-07 funcionando. Labels do /login também confirmados legíveis (contraste OK)."

### 6. (bônus, achado ao recarregar /onboarding) Erro "Cookies can only be modified in a Server Action or Route Handler"
expected: Recarregar /onboarding (ou qualquer página admin) não deve lançar exceção nenhuma, mesmo quando o token de sessão precisa ser renovado durante a renderização do Server Component
result: pass
reported: "Corrigido em 01-08 (try/catch em setAll) — coberto por tests/supabase/server-cookies.test.ts (2 testes), sem componente manual-only, fechado sem necessidade de reconfirmação visual"

## Summary

total: 6
passed: 4
issues: 0
pending: 0
skipped: 1
blocked: 1

**Nota de fechamento (2026-07-14):** Fase 01 aceita como verificada com 1 item permanentemente bloqueado por dependência de terceiro (SMTP customizado do Supabase) e 1 skip documentado (janela de renovação de token impraticável de testar manualmente). Ver 01-VERIFICATION.md para status canônico atualizado.

## Gaps

- truth: "Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir"
  status: failed
  reason: "User reported: ui horrivel — labels e placeholders do wizard de onboarding quase invisíveis (texto escuro sobre fundo preto), praticamente ilegível"
  severity: major
  test: 4
  root_cause: "src/app/globals.css (linhas 15-20) mantém o boilerplate padrão do create-next-app com @media (prefers-color-scheme: dark) trocando --background/--foreground para quase-preto/quase-branco quando o SO do usuário está em dark mode. Nenhuma página admin adapta isso — todas usam cores hex fixas via Tailwind arbitrary values (text-[#111111], text-[#0D3D2B], etc.) pensadas para fundo branco fixo, e nenhum <main> define bg-white explícito (herdam o --background da body). Quando dark mode do SO ativa, fundo vira quase-preto mas o texto continua quase-preto também. Inputs têm o problema inverso (bg-white fixo + color:inherit do Preflight puxando --foreground quase-branco) — texto/placeholder quase invisível sobre fundo branco do input."
  artifacts:
    - path: "src/app/globals.css"
      issue: "@media (prefers-color-scheme: dark) sem adaptação — projeto não tem dark mode (CLAUDE.md confirma fora de escopo)"
    - path: "src/app/(admin)/onboarding/onboarding-wizard.tsx"
      issue: "main sem bg explícito; labels com text-[#111111]/text-[#0D3D2B] hardcoded"
    - path: "src/app/(admin)/cadastro/page.tsx"
      issue: "mesmo padrão — main sem bg, labels hardcoded"
    - path: "src/app/(admin)/login/page.tsx"
      issue: "mesmo padrão — main sem bg, labels hardcoded"
    - path: "src/app/(admin)/dashboard/page.tsx"
      issue: "mesmo padrão — main sem bg, labels hardcoded"
    - path: "src/app/(admin)/esqueci-senha/page.tsx"
      issue: "mesmo padrão — main sem bg, labels hardcoded"
    - path: "src/app/(admin)/redefinir-senha/page.tsx"
      issue: "mesmo padrão — main sem bg, labels hardcoded"
  missing:
    - "Remover/neutralizar o bloco @media (prefers-color-scheme: dark) em globals.css e/ou forçar color-scheme: light, já que o projeto não tem dark mode"
    - "Adicionar bg-white explícito em todo <main> do admin como defesa em profundidade"
    - "(opcional/longo-prazo) migrar cores hex hardcoded para tokens @theme conectados ao mesmo sistema de variáveis"
  debug_session: ".planning/debug/onboarding-invisible-labels.md"

- truth: "Tentar logar sem conexão de rede mostra um erro de rede/conexão, não uma mensagem de credenciais inválidas"
  status: failed
  reason: "User reported: o único bug identificado foi a mensagem 'email ou senha inválidos' aparecendo com o wifi desligado, ao tentar logar"
  severity: major
  test: 5
  root_cause: "src/lib/auth/actions.ts:102-104 dentro de signInAction trata qualquer error truthy retornado por supabase.auth.signInWithPassword como rejeição de credencial, sem checar error.name/status. Sem rede, o fetch() interno do @supabase/auth-js falha e é relançado como AuthRetryableFetchError (status 0) — uma classe diferente de AuthApiError (credenciais reais inválidas). GoTrueClient.signInWithPassword captura os dois tipos igual (ambos são isAuthError) e retorna uniformemente em {data, error} — nunca lança exceção não tratada. O código atual não distingue os dois casos."
  artifacts:
    - path: "src/lib/auth/actions.ts"
      issue: "signInAction (linhas 97-104): catch-all colapsa AuthRetryableFetchError (falha de rede) e AuthApiError (credenciais erradas) na mesma mensagem genérica"
  missing:
    - "Importar isAuthRetryableFetchError de @supabase/supabase-js (já re-exportado, sem nova dependência) e checar esse caso ANTES do fallback genérico em signInAction"
    - "Retornar mensagem distinta para falha de rede (ex: 'Não foi possível conectar. Verifique sua internet e tente novamente.'), mantendo a mensagem genérica atual só para AuthApiError real (preserva o padrão anti-enumeração intacto — falha de rede não carrega informação sobre existência de conta)"
  debug_session: ".planning/debug/login-network-error-message.md"

- truth: "Recarregar qualquer página admin não lança exceção mesmo quando o token de sessão precisa ser renovado durante a renderização do Server Component"
  status: failed
  reason: "User reported: Console Error ao recarregar /onboarding: 'Cookies can only be modified in a Server Action or Route Handler', apontando para src/lib/supabase/server.ts:23"
  severity: blocker
  test: 6
  root_cause: "src/lib/supabase/server.ts:21-25 (createClient, usado em Server Components/Server Actions/Route Handlers) implementa setAll sem o try/catch recomendado pela documentação oficial do @supabase/ssr. Quando getUser() é chamado a partir de um Server Component (ex: onboarding-guard.ts / page.tsx via requireCompletedOnboarding) e o token de sessão precisa de refresh, o cliente Supabase tenta escrever os cookies renovados via setAll -> cookieStore.set(), mas o Next.js App Router só permite escrita de cookies em Server Actions e Route Handlers, nunca durante a renderização de um Server Component — lançando a exceção. O middleware já faz o refresh de sessão por request (updateSession), então esse setAll redundante disparado por um Server Component pode ser seguramente ignorado."
  artifacts:
    - path: "src/lib/supabase/server.ts"
      issue: "setAll (linhas 21-25) sem try/catch — lança quando chamado durante render de Server Component"
  missing:
    - "Envolver o forEach de cookieStore.set dentro de um try/catch vazio (ou com comentário), conforme o padrão oficial documentado pelo @supabase/ssr para uso em Server Components — o middleware já garante o refresh real da sessão via updateSession"
  debug_session: ""
