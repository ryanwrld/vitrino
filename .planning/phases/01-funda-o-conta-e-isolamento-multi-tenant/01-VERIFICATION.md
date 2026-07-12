---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
verified: 2026-07-12T00:15:00Z
status: human_needed
score: 4/7 truths verificadas (3 presentes/instrumentadas, comportamento não exercitado)
behavior_unverified: 3
overrides_applied: 0
behavior_unverified_items:
  - truth: "Sessão persiste após refresh real do navegador (AUTH-02)"
    test: "Fazer login em /login, aguardar alguns minutos com atividade normal, dar F5 na página do painel em um navegador real"
    expected: "Permanece autenticado após o reload (cookie httpOnly gerido por @supabase/ssr sobrevive ao reload)"
    why_human: "Mecanismo de cookie httpOnly + getUser() no middleware está corretamente implementado e coberto por testes de integração via cookie-jar mockado, mas a persistência real entre reloads de um navegador de verdade não é exercitada por nenhum teste automatizado — o próprio 01-RESEARCH.md classifica este item como 'manual-only'. Checklist M-1 do 01-05-PLAN.md documentado como 'ainda pendente de execução' no próprio 01-05-SUMMARY.md."
  - truth: "Renovação de sessão é silenciosa em segundo plano; aviso visível só aparece se a renovação falhar de verdade (AUTH-04, D-03)"
    test: "Deixar a sessão ociosa além da expiração do token em uso normal (renovação deve ser silenciosa); depois simular perda de conectividade real e tentar salvar algo (aviso deve aparecer)"
    expected: "TOKEN_REFRESHED nunca produz UI; SIGNED_OUT dispara toast 'Sua sessão expirou...' apenas quando a renovação falha de verdade"
    why_human: "SessionWatcher trata corretamente os dois branches de onAuthStateChange (grep confirma TOKEN_REFRESHED silencioso e SIGNED_OUT com toast), mas nenhum teste automatizado simula expiração real de token ou perda de conectividade — RESEARCH.md classifica como 'manual-only'. Checklist M-2 do 01-05-PLAN.md ainda pendente de execução."
  - truth: "Revendedor consegue completar o ciclo real de recuperação de senha por email (AUTH-05)"
    test: "Solicitar reset em /esqueci-senha com um email real, abrir o link recebido, confirmar chegada a /redefinir-senha e troca de senha bem-sucedida"
    expected: "Link do email leva a /auth/confirm?token_hash=...&type=recovery, verifyOtp estabelece sessão, redireciona a /redefinir-senha, updateUser troca a senha"
    why_human: "O código (requestPasswordReset, /auth/confirm, updatePassword) está implementado e testado via integração (sessão simulada via cookie-jar), mas o ciclo ponta a ponta real depende do template de email 'Reset Password' no Supabase Dashboard usar {{ .TokenHash }} — configuração manual ainda pendente (item user_setup do 01-04-PLAN.md, confirmado como não-código em 01-04-SUMMARY.md). Sem essa configuração, um email de reset real ainda usaria o formato de fragmento de URL que não funciona em SSR."
human_verification:
  - test: "M-1 (AUTH-02): login em /login, aguardar, F5 na página do painel"
    expected: "Permanece autenticado após o reload"
    why_human: "Persistência de cookie httpOnly em navegador real não é testável por automação neste projeto (RESEARCH.md: manual-only)"
  - test: "M-2 (AUTH-04): ociosidade real além da expiração do token + simulação de perda de conectividade"
    expected: "Renovação silenciosa em uso normal; aviso 'sessão expirou' aparece somente quando a renovação falha de verdade"
    why_human: "Requer simular expiração real de token/perda de conectividade em navegador real (RESEARCH.md: manual-only)"
  - test: "M-3 (AUTH-05): fluxo completo de reset de senha com um email real, após configurar o template TokenHash no Supabase Dashboard"
    expected: "Link do email leva a /redefinir-senha; nova senha funciona"
    why_human: "Depende de configuração manual pendente no painel Supabase (template de email) e de interceptar um email real — não automatizável"
  - test: "M-4 (LOJA-01/WPP-01): completar o onboarding em um navegador real com um número de WhatsApp BR real"
    expected: "Prévia do número formatado aparece corretamente; template vem pré-preenchido; Dashboard é liberado só após concluir"
    why_human: "Confirmação visual/UX do wizard (prévia AsYouType, upload de logo, cor de destaque) não é verificável apenas por grep ou teste de integração de backend"
---

# Fase 1: Fundação, Conta e Isolamento Multi-Tenant — Verificação

**Meta da Fase:** O revendedor consegue criar conta, entrar, recuperar senha esquecida e sair do painel, sobre uma base de dados multi-tenant onde cada revendedor só enxerga os próprios dados e a vitrine pública nunca é bloqueada por autenticação. Logo após o cadastro, um onboarding coleta a identidade da loja e o WhatsApp antes de liberar o Dashboard.

**Verificado em:** 2026-07-12
**Status:** human_needed
**Re-verificação:** Não — verificação inicial (nenhum `01-VERIFICATION.md` prévio encontrado)

## Método

Esta verificação NÃO confiou nas alegações dos SUMMARY.md. Evidência coletada diretamente do código-fonte e por execução real:
- `npx vitest run` executado por este verificador: **35/35 testes passam, 8 arquivos**, contra o projeto Supabase remoto real (`yuyprdjzeslanxbgcemj`) — confirma a alegação do disparo, não apenas a repete.
- `npx tsc --noEmit` executado: limpo, sem erros.
- `npm run build` executado: build de produção completo, 10 rotas geradas corretamente.
- Servidor `next dev` real iniciado nesta sessão e testado via `curl` sem nenhum cookie de sessão:
  - `GET /loja/teste-slug` → **200** (vitrine pública responde sem auth)
  - `GET /` → **200**
  - `GET /dashboard` (sem cookie) → **307 → /login** (guard `requireCompletedOnboarding` funciona de verdade em runtime, não só por grep)
  - `GET /onboarding` (sem cookie) → **307 → /login** (guard de auth direto funciona em runtime)
  - `GET /cadastro`, `/login`, `/esqueci-senha` → **200** (entradas públicas do admin, sem loop de redirect)
- Leitura direta de todo o código-fonte relevante (middleware, layout, guards, Server Actions, migration SQL, componentes) — não apenas dos SUMMARY.md.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Revendedor cria conta com email e senha e é levado ao onboarding inicial (SC-1, AUTH-01) | ✓ VERIFIED | `signUpAction` (`src/lib/auth/actions.ts`) cria usuário real, insere `stores`+`store_settings`, `redirect('/onboarding')`; `tests/auth/signup.test.ts` (5 testes) roda contra Supabase remoto real e passa (confirmado nesta verificação); `/cadastro` responde 200 ao vivo |
| 2 | Login persiste após refresh do navegador; logout de qualquer página do painel (SC-2, AUTH-02/03) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Login/logout via `signInAction`/`signOutAction` testados e funcionais (`tests/auth/signup.test.ts`, `tests/auth/signout.test.ts`); logout wired no Dashboard (única página do painel nesta fase) via `signOutAction`. Persistência real após F5 em navegador depende de cookie httpOnly + `@supabase/ssr` — mecanismo corretamente implementado, mas comportamento não exercitado por nenhum teste (ver `behavior_unverified_items` M-1) |
| 3 | Revendedor pode solicitar redefinição de senha via link por email (SC-3, AUTH-05) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `requestPasswordReset`, `/auth/confirm` (verifyOtp), `updatePassword` implementados e testados via integração (`tests/auth/reset-password.test.ts`, 4 testes); ciclo ponta a ponta real bloqueado por configuração manual pendente do template de email no Supabase Dashboard (ver M-3) |
| 4 | Sessão renovada automaticamente em segundo plano; aviso só se falhar de verdade (SC-4, AUTH-04) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `SessionWatcher` (`src/components/session-watcher.tsx`) trata `TOKEN_REFRESHED` silenciosamente e `SIGNED_OUT` com toast — código correto e wired (montado em `(admin)/layout.tsx`), mas nenhum teste simula expiração/reconexão real (ver M-2) |
| 5 | Onboarding coleta nome, logo, cor, frase, WhatsApp (normalizado+template) antes de liberar Dashboard (SC-5, LOJA-01/WPP-01/WPP-02, D-04) | ✓ VERIFIED | `saveOnboarding` (`src/lib/onboarding/actions.ts`) valida com Zod, normaliza telefone via `normalizeWhatsAppBR` (server-side), seta `onboarding_completed_at`; `tests/onboarding/store-settings.test.ts` + `tests/onboarding/message-template.test.ts` + `tests/phone/normalize-br.test.ts` passam (14 testes); confirmado ao vivo que `/dashboard` e `/onboarding` redirecionam para `/login` sem sessão, e a cadeia de guard (`requireCompletedOnboarding` → auth → dados) está implementada corretamente |
| 6 | Teste de isolamento entre dois tenants passa; RLS habilitado em toda tabela (SC-6) | ✓ VERIFIED | `tests/rls/isolation.test.ts` (5 testes) executado nesta verificação contra o Supabase remoto real — passa. Migration (`0001_init_stores_rls.sql`) confirma `enable row level security` em ambas as tabelas + policies `owner_id = auth.uid()`. Usuário confirma RLS "Enabled" via Studio |
| 7 | `/loja/[slug]` responde sem auth (middleware escopado a `/admin/:path*`); slug UNIQUE no banco (SC-7) | ✓ VERIFIED | `tests/middleware/matcher.test.ts` (6 asserções) passa; `src/middleware.ts` tem `config.matcher = ['/admin/:path*']` exato; migration tem `slug text not null unique`; confirmado ao vivo via curl: `/loja/teste-slug` responde 200 sem nenhum cookie |

**Score:** 4/7 truths verificadas (3 presentes e corretamente implementadas/wired, mas com comportamento runtime não exercitado por teste automatizado — ver Human Verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/middleware.ts` | matcher `['/admin/:path*']` | ✓ VERIFIED | Exato, confirmado por grep e teste |
| `src/lib/supabase/{server,client,middleware}.ts` | 3 factories `@supabase/ssr` | ✓ VERIFIED | `getUser()` usado no middleware, nunca `getSession()` como gate |
| `src/app/loja/[slug]/page.tsx` | placeholder público sem auth | ✓ VERIFIED | Sem import de cliente autenticado; 200 ao vivo sem cookie |
| `supabase/migrations/0001_init_stores_rls.sql` | stores+store_settings+RLS+slug UNIQUE+bucket | ✓ VERIFIED | RLS 2x, slug UNIQUE, `onboarding_completed_at`, bucket `store-assets` com 4 policies |
| `src/lib/database.types.ts` | tipos gerados do banco real | ✓ VERIFIED | Contém `stores`/`store_settings` com FK correta |
| `src/lib/auth/actions.ts` | signUp/signIn/signOut | ✓ VERIFIED | Escreve stores+store_settings reais; mensagens anti-enumeração |
| `src/lib/auth/onboarding-guard.ts` | `requireCompletedOnboarding` | ✓ VERIFIED | Duas checagens sequenciais (auth, depois dados) — nunca fundidas |
| `src/components/session-watcher.tsx` | SessionWatcher | ✓ VERIFIED | TOKEN_REFRESHED silencioso, SIGNED_OUT com toast (comportamento real não exercitado, ver truth 4) |
| `src/app/(admin)/layout.tsx` | gate de sessão + SessionWatcher | ✓ VERIFIED (com deviation documentada) | Não redireciona globalmente (limitação real do Next App Router com Route Groups, documentada e coerente); cada página protegida chama seu próprio guard |
| `src/lib/auth/reset-actions.ts` + `src/app/auth/confirm/route.ts` | fluxo de reset | ✓ VERIFIED | `resetPasswordForEmail`, `verifyOtp`, `updateUser` presentes; testado via integração |
| `src/lib/phone/normalize-br.ts` | `normalizeWhatsAppBR` | ✓ VERIFIED | 8 testes cobrindo casos malformados do PITFALLS |
| `src/lib/onboarding/actions.ts` + `onboarding-wizard.tsx` | `saveOnboarding` + wizard | ✓ VERIFIED | Normaliza server-side, valida magic bytes do logo, seta `onboarding_completed_at` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `middleware.ts` | `lib/supabase/middleware.ts` | `updateSession(request)` | ✓ WIRED | Chamado diretamente |
| `(admin)/dashboard/page.tsx` | `onboarding-guard.ts` | `requireCompletedOnboarding()` | ✓ WIRED | Confirmado por grep + comportamento ao vivo (307→/login sem cookie) |
| `signUpAction` | `stores`+`store_settings` | insert real | ✓ WIRED | Confirmado por teste de integração real |
| `SessionWatcher` | `onAuthStateChange` | toast em SIGNED_OUT | ✓ WIRED | Confirmado por grep; comportamento real não exercitado (ver truth 4) |
| `saveOnboarding` | `normalizeWhatsAppBR` | chamada server-side única | ✓ WIRED | Confirmado por grep + teste de integração |
| `requestPasswordReset` | `/auth/confirm` | `redirectTo` | ✓ WIRED | Construído via `headers()`, aponta corretamente para a rota |
| `/auth/confirm` | `verifyOtp` → `/redefinir-senha` | Route Handler | ✓ WIRED | Confirmado por grep; ciclo real de email não exercitado (ver truth 3) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vitrine pública responde sem auth | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/loja/teste-slug` | 200 | ✓ PASS |
| Home responde | `curl .../` | 200 | ✓ PASS |
| Dashboard sem sessão redireciona | `curl -I .../dashboard` | 307 → /login | ✓ PASS |
| Onboarding sem sessão redireciona | `curl -I .../onboarding` | 307 → /login | ✓ PASS |
| Entradas públicas do admin acessíveis | `curl .../cadastro`, `/login`, `/esqueci-senha` | 200/200/200 | ✓ PASS |
| Suíte de testes completa | `npx vitest run` | 35/35 testes, 8 arquivos | ✓ PASS |
| Build de produção | `npm run build` | Compilado com sucesso, 10 rotas | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | Limpo | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-03 | Criar conta com email/senha | ✓ SATISFIED | `signUpAction` + teste + curl |
| AUTH-02 | 01-01, 01-03 | Login persistente entre sessões | ✓ SATISFIED (mecanismo) / human_needed (persistência real) | Cookie httpOnly via `@supabase/ssr`; M-1 pendente |
| AUTH-03 | 01-03 | Logout de qualquer página | ✓ SATISFIED | `signOutAction` wired no Dashboard (única página do painel nesta fase) |
| AUTH-04 | 01-03 | Renovação automática com aviso só em falha | ✓ SATISFIED (código) / human_needed (comportamento real) | `SessionWatcher`; M-2 pendente |
| AUTH-05 | 01-04 | Reset de senha via email | ✓ SATISFIED (código) / human_needed (e2e real) | Código completo; template TokenHash pendente de config manual |
| LOJA-01 | 01-02, 01-05 | Nome/logo/cor/frase da loja | ✓ SATISFIED | `saveOnboarding` + testes |
| WPP-01 | 01-02, 01-05 | WhatsApp normalizado E.164 | ✓ SATISFIED | `normalizeWhatsAppBR` + 8 testes |
| WPP-02 | 01-02, 01-05 | Template de mensagem com placeholders | ✓ SATISFIED | Zod `.refine` + 3 testes |

**Nenhum requisito órfão encontrado** — todos os 8 IDs da fase (AUTH-01..05, LOJA-01, WPP-01, WPP-02) aparecem no campo `requirements` de pelo menos um plano, e todos os 8 aparecem mapeados para Phase 1 em `.planning/REQUIREMENTS.md`.

**Nota informativa (não-bloqueante):** `.planning/REQUIREMENTS.md` ainda lista os checkboxes destes 8 itens como `[ ]`/"Pendente" — aparenta ser um passo de bookkeeping separado (não atualizado automaticamente durante a execução dos planos), não uma lacuna de implementação.

### Anti-Patterns Found

Nenhum marcador de débito técnico (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`) encontrado nos arquivos modificados pela fase. As únicas ocorrências de "placeholder" no código são: (a) o atributo HTML `placeholder="(11) 99999-9999"` de um input (uso legítimo), (b) a constante `REQUIRED_TEMPLATE_PLACEHOLDERS` (nome de variável, uso legítimo), e (c) o comentário/texto do próprio `src/app/loja/[slug]/page.tsx`, que é o placeholder público INTENCIONAL e documentado desta fase (a vitrine completa chega na Fase 4, conforme `01-01-PLAN.md`). Nenhum bloqueador.

**Itens informativos (não-bloqueantes, já documentados nos SUMMARY.md):**
- `middleware.ts` está deprecado a favor de `proxy.ts` no Next 16.2.10 (aviso, não erro) — comportamento idêntico confirmado; migração recomendada para fase futura.
- 2 vulnerabilidades moderadas em `postcss` (dependência transitiva do Next.js) — abaixo do threshold `security_block_on: "high"` do projeto.

## Gaps Summary

Nenhum gap bloqueante (FAILED) foi encontrado — todo o código, testes automatizados, migration e comportamento de guard em runtime (confirmado ao vivo via curl nesta verificação) sustentam os 7 critérios de sucesso da fase. O status é `human_needed`, não `passed`, porque quatro itens de verificação manual documentados pelo próprio plano (`01-05-PLAN.md`, checklist M-1..M-4) permanecem pendentes de execução, conforme o próprio `01-05-SUMMARY.md` reconhece explicitamente ("Checklist manual de fim de fase (M-1..M-4) ... ainda pendente de execução"):

1. **M-1 (AUTH-02):** confirmar persistência de sessão após F5 real em navegador.
2. **M-2 (AUTH-04):** confirmar renovação silenciosa vs. aviso em falha real de conectividade/expiração.
3. **M-3 (AUTH-05):** configurar o template de email "Reset Password" no Supabase Dashboard (`{{ .TokenHash }}`) e confirmar o ciclo completo com um email real.
4. **M-4 (LOJA-01/WPP-01):** confirmar visualmente o wizard de onboarding com um número de WhatsApp BR real (prévia formatada, template pré-preenchido).

Nenhum destes é um defeito de código — em todos os quatro casos, a implementação está presente, correta por inspeção, e coberta por testes automatizados no nível que é automatizável (integração contra o Supabase real, unitário para normalização de telefone, smoke test do matcher). A lacuna é exclusivamente de confirmação humana em ambiente de navegador real / configuração de painel externo, exatamente como o próprio `01-RESEARCH.md` e `01-05-PLAN.md` já haviam antecipado e classificado como `manual-only`.

---

_Verified: 2026-07-12T00:15:00Z_
_Verifier: Claude (gsd-verifier)_
