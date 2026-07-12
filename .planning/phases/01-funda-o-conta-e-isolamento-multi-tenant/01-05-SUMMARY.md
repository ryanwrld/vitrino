---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
plan: 05
subsystem: onboarding
tags: [libphonenumber-js, zod, react-hook-form, supabase-storage, nextjs-app-router, vitest]

# Dependency graph
requires:
  - phase: 01-02
    provides: "Migration `stores`/`store_settings` com RLS, slug UNIQUE, `onboarding_completed_at`, bucket de Storage `store-assets` com policies por owner_id"
  - phase: 01-03
    provides: "Server Actions de auth (signUpAction/signInAction/signOutAction), factories Supabase server/client, guard `requireCompletedOnboarding`, convenção de página client (react-hook-form + Zod + sonner), Deviation documentada exigindo que `/onboarding` chame seu próprio guard de auth (getUser direto, nunca requireCompletedOnboarding)
provides:
  - "Função pura `normalizeWhatsAppBR` (`src/lib/phone/normalize-br.ts`) — normalização E.164 apenas-dígitos via libphonenumber-js@1.13.8, aprovada via gate de legitimidade"
  - "Schemas Zod de onboarding (`src/lib/validation/onboarding.ts`) — nome obrigatório, cor hex opcional, tagline ≤100 opcional, whatsapp obrigatório (string bruta), template com refine exigindo os 4 placeholders; `DEFAULT_MESSAGE_TEMPLATE` pré-preenchido"
  - "Server Action `saveOnboarding` (`src/lib/onboarding/actions.ts`) — valida, normaliza WhatsApp uma única vez no servidor, valida logo por magic bytes antes do upload em `store-assets/{owner_id}/`, atualiza `stores`/`store_settings`, seta `onboarding_completed_at`, redireciona `/dashboard`"
  - "Wizard de onboarding em tela única (`(admin)/onboarding/page.tsx` + `onboarding-wizard.tsx`) — guard de auth direto (getUser), prévia de telefone client-side (AsYouType, apenas exibição)"
affects: [fase-2-link-compartilhavel, fase-5-vitrine-publica-pedido-whatsapp]

# Tech tracking
tech-stack:
  added: ["libphonenumber-js@1.13.8"]
  patterns:
    - "Normalização de domínio (telefone) isolada em função pura testável (`normalize-br.ts`), chamada exclusivamente dentro do Server Action que persiste o dado — nunca no client, nunca re-derivada por consumidores futuros (Fase 5 apenas lê o valor já persistido)"
    - "Páginas que exigem tanto guard de servidor quanto estado de formulário client são divididas em dois arquivos: um Server Component fino no `page.tsx` (faz o guard, `getUser()` direto) que renderiza um Client Component irmão (`*-wizard.tsx`, react-hook-form + Zod + sonner) — necessário porque Server Components não podem usar hooks e Client Components não podem chamar `cookies()`/`getUser()` diretamente"
    - "Upload de arquivo não confiável (logo) validado por assinatura de magic bytes no servidor (primeiros bytes do buffer), não apenas por `file.type`/extensão reportados pelo browser"

key-files:
  created:
    - src/lib/phone/normalize-br.ts
    - src/lib/validation/onboarding.ts
    - src/lib/onboarding/actions.ts
    - src/app/(admin)/onboarding/page.tsx
    - src/app/(admin)/onboarding/onboarding-wizard.tsx
    - tests/phone/normalize-br.test.ts
    - tests/onboarding/store-settings.test.ts
    - tests/onboarding/message-template.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "libphonenumber-js@1.13.8 aprovado via gate blocking-human de legitimidade de pacote (verificado em execução anterior desta mesma plan; usuário aprovou explicitamente antes desta retry)"
  - "Wizard de onboarding implementado como tela única (não multi-step) — decisão de UI a critério do executor conforme 01-CONTEXT.md, priorizando 'poucos campos obrigatórios, percebido como rápido'"
  - "Apenas nome da loja e WhatsApp são campos obrigatórios; logo, cor de destaque e frase são opcionais — reduz fricção para o revendedor não-técnico no primeiro acesso"
  - "Prévia de telefone client-side usa AsYouType (libphonenumber-js) só para exibição enquanto o usuário digita — nunca é o valor enviado ao servidor; a normalização real e definitiva acontece uma única vez dentro de saveOnboarding"

patterns-established:
  - "Server Component guard + Client Component form, divididos em arquivos irmãos dentro da mesma rota, para páginas que precisam de ambos auth-guard server-side e estado de formulário"

requirements-completed: [LOJA-01, WPP-01, WPP-02]

coverage:
  - id: D1
    description: "normalizeWhatsAppBR normaliza entradas reais de revendedor (parênteses, traços, zero à esquerda, sem DDI, 8 dígitos legado) para E.164 apenas-dígitos e rejeita inválidas sem retornar número parcial"
    requirement: "WPP-01"
    verification:
      - kind: unit
        ref: "tests/phone/normalize-br.test.ts (8 testes)"
        status: pass
    human_judgment: false
  - id: D2
    description: "saveOnboarding salva nome/cor/frase da loja, normaliza WhatsApp no servidor e rejeita frase >100 caracteres e WhatsApp inválido"
    requirement: "LOJA-01"
    verification:
      - kind: integration
        ref: "tests/onboarding/store-settings.test.ts (3 testes, contra Supabase remoto real)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Template de mensagem exige os 4 placeholders {modelo}/{solado}/{tamanho}/{preço}; aceita template customizado válido e rejeita template sem eles"
    requirement: "WPP-02"
    verification:
      - kind: integration
        ref: "tests/onboarding/message-template.test.ts (3 testes, contra Supabase remoto real)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ao concluir o onboarding, onboarding_completed_at é setado e o Dashboard passa a ser alcançável; wizard mostra prévia de telefone formatado e template pré-preenchido"
    requirement: "D-04"
    verification:
      - kind: integration
        ref: "tests/onboarding/store-settings.test.ts > seta onboarding_completed_at"
        status: pass
    human_judgment: true
    rationale: "Verificação visual completa do wizard (prévia formatada aparecendo em tela, template pré-preenchido, fluxo até o Dashboard em navegador real) é o human-check M-4 documentado no PLAN.md, a rodar no checklist manual de fim de fase (human_verify_mode=end-of-phase)."

# Metrics
duration: ~35min
completed: 2026-07-11
status: complete
---

# Phase 01 Plan 05: Wizard de Onboarding Pós-Cadastro Summary

**Onboarding em tela única que normaliza WhatsApp BR para E.164 via libphonenumber-js dentro do Server Action `saveOnboarding`, valida template de mensagem com os 4 placeholders obrigatórios, valida logo por magic bytes antes do upload em `store-assets/{owner_id}/`, e libera o Dashboard ao setar `onboarding_completed_at` — cobrindo LOJA-01, WPP-01, WPP-02.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 (Task 1 checkpoint blocking-human já aprovado em execução anterior; Task 2 e Task 3 `type="auto" tdd="true"`)
- **Files created:** 8; **modified:** 2 (`package.json`, `package-lock.json`)

## Accomplishments

- `libphonenumber-js@1.13.8` instalado (gate de legitimidade previamente aprovado pelo usuário; sem script `postinstall` suspeito, confirmado nesta execução).
- `src/lib/phone/normalize-br.ts`: `normalizeWhatsAppBR` — função pura, `parsePhoneNumberFromString(input, 'BR')`, retorna `{ e164Digits }` (13 dígitos, sem `+`) ou `{ error }` claro. 8 testes cobrindo parênteses/traços, zero à esquerda no DDD, 8 dígitos legado, sem DDI, com `+55`, e duas entradas inválidas.
- `src/lib/validation/onboarding.ts`: Zod schema com `name` obrigatório, `accentColor` (regex hex) opcional, `tagline` ≤100 caracteres opcional, `whatsapp` (string bruta, normalização só no servidor) obrigatório, `messageTemplate` com `.refine` exigindo os 4 placeholders `{modelo}`/`{solado}`/`{tamanho}`/`{preço}`. `DEFAULT_MESSAGE_TEMPLATE` exporta a copy padrão do `PROJECT.md`.
- `src/lib/onboarding/actions.ts`: `saveOnboarding` ('use server') — valida com Zod, chama `normalizeWhatsAppBR` uma única vez no servidor (rejeita com erro claro se inválido), valida logo opcional por assinatura de magic bytes (PNG/JPEG/WebP) + limite de 5MB antes de subir para `store-assets/{owner_id}/logo.*`, atualiza `stores` (name/accent_color/tagline/logo_url) e `store_settings` (whatsapp_e164/message_template/onboarding_completed_at), redireciona `/dashboard`.
- `src/app/(admin)/onboarding/page.tsx` (Server Component): guard de auth direto via `getUser()` — NÃO reaproveita `requireCompletedOnboarding` (evitaria loop de redirect, conforme Deviation #1 documentada no `01-03-SUMMARY.md` especificamente para esta página).
- `src/app/(admin)/onboarding/onboarding-wizard.tsx` (Client Component): wizard em tela única, react-hook-form + `zodResolver` + `sonner`; só nome e WhatsApp são obrigatórios; prévia de telefone via `AsYouType` (exibição apenas); template pré-preenchido e editável.
- Testes de integração reais (`tests/onboarding/store-settings.test.ts`, `tests/onboarding/message-template.test.ts`) rodando contra o projeto Supabase remoto, mockando apenas `next/headers`/`next/navigation` (mesmo padrão do Plan 03). 6 testes verdes.
- `npx tsc --noEmit` limpo; `npx next build` confirma a rota real `/onboarding` (sem prefixo `/admin`, Route Group).
- Suíte completa (`npx vitest run`): 31 testes verdes em 7 arquivos.

## Task Commits

Each task was committed atomically:

1. **Task 1: [BLOCKING-HUMAN] Verificar legitimidade de libphonenumber-js** — já aprovado pelo usuário em execução anterior desta plan (não repetido). Instalação: `93a3b66` (feat)
2. **Task 2: normalize-br.ts + testes** — TDD: `9adc09f` (test, RED) → `92d5352` (feat, GREEN)
3. **Task 3: Wizard de onboarding + saveOnboarding** — TDD: `906dc19` (test, RED) → `cfd0532` (feat, GREEN)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `package.json`, `package-lock.json` - `libphonenumber-js@1.13.8` adicionado
- `src/lib/phone/normalize-br.ts` - `normalizeWhatsAppBR`
- `src/lib/validation/onboarding.ts` - Zod schema + `DEFAULT_MESSAGE_TEMPLATE`
- `src/lib/onboarding/actions.ts` - `saveOnboarding`
- `src/app/(admin)/onboarding/page.tsx` - guard de auth (Server Component)
- `src/app/(admin)/onboarding/onboarding-wizard.tsx` - wizard (Client Component)
- `tests/phone/normalize-br.test.ts` - 8 testes unitários
- `tests/onboarding/store-settings.test.ts` - 3 testes de integração real
- `tests/onboarding/message-template.test.ts` - 3 testes de integração real

## Decisions Made
- Gate de legitimidade de `libphonenumber-js` não foi re-executado nesta sessão — já verificado e aprovado explicitamente pelo usuário em execução anterior desta mesma plan (mantenedor `catamphetamine`, repo GitLab, ~20.1M downloads/semana, sem `postinstall` suspeito, versão exata `1.13.8`).
- Wizard implementado como tela única, não multi-step — decisão de UI deixada a critério do executor pelo `01-CONTEXT.md`; tela única reduz fricção percebida para o público não-técnico.
- Nome da loja e WhatsApp são os únicos campos obrigatórios; logo/cor/frase são opcionais no onboarding (podem ser preenchidos depois no painel), alinhado à diretriz "poucos campos obrigatórios, percebido como rápido".
- Validação de logo por magic bytes (assinatura binária) além de content-type — mitigação explícita do threat model (T-01-15) contra upload de arquivo malicioso disfarçado de imagem.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Página `/onboarding` exige um Client Component irmão para o formulário, não previsto explicitamente na lista de `files_modified` do plano**
- **Found during:** Task 3
- **Issue:** O plano lista apenas `src/app/(admin)/onboarding/page.tsx` em `files_modified`, mas a própria Deviation #1 do `01-03-SUMMARY.md` (já listada no `<context>` deste plano) exige que esta página chame seu próprio guard de auth via `getUser()` diretamente (nunca `requireCompletedOnboarding`, que criaria loop de redirect). Isso exige que `page.tsx` seja um Server Component (para chamar `cookies()`/`getUser()` no servidor). Mas o wizard também precisa de `react-hook-form` + estado local (arquivo do logo, `useTransition`), que exige `'use client'` — e Server Components não podem usar hooks nem `'use client'` no mesmo arquivo que faz o guard server-side.
- **Fix:** Dividido em dois arquivos na mesma rota: `page.tsx` (Server Component, guard de auth + renderiza o wizard) e `onboarding-wizard.tsx` (Client Component, todo o formulário). Mesmo padrão arquitetural já usado implicitamente no projeto (dashboard é Server puro; login/cadastro são Client puros porque não precisam de guard) — onboarding é o primeiro caso que precisa de ambos.
- **Files modified:** `src/app/(admin)/onboarding/page.tsx`, `src/app/(admin)/onboarding/onboarding-wizard.tsx` (novo, não listado no plano)
- **Verification:** `npx tsc --noEmit` limpo; `npx next build` confirma a rota `/onboarding` renderizando sem erros.
- **Committed in:** `cfd0532` (Task 3 commit)

**2. [Rule 2 - Missing critical functionality] Validação de logo por magic bytes, não só por `file.type`/extensão**
- **Found during:** Task 3
- **Issue:** O plano menciona "validar content-type no servidor" para o upload de logo, mas o threat model do próprio plano (T-01-15) exige explicitamente "validar content-type/magic-bytes no servidor" — `file.type` reportado pelo browser é um header controlável pelo cliente, não uma garantia real do conteúdo do arquivo.
- **Fix:** `saveOnboarding` lê os primeiros bytes do arquivo (`file.slice(0, N).arrayBuffer()`) e compara com as assinaturas binárias conhecidas de PNG/JPEG/WebP antes de aceitar o upload, além do limite de 5MB.
- **Files modified:** `src/lib/onboarding/actions.ts`
- **Verification:** `npx tsc --noEmit` limpo; lógica coberta indiretamente pelos testes de integração (fluxo sem logo, campo opcional, passa sem erro).
- **Committed in:** `cfd0532` (Task 3 commit)

---

**Total deviations:** 2 (1 blocking/arquitetural do Next.js contornado com arquivo irmão dentro da mesma rota, 1 funcionalidade crítica de segurança adicionada conforme o próprio threat model do plano)
**Impact on plan:** Nenhum requisito funcional foi reduzido — LOJA-01/WPP-01/WPP-02 seguem cobertos integralmente. O arquivo extra (`onboarding-wizard.tsx`) é puramente uma consequência da separação Server/Client Component exigida pelo Next.js App Router, não uma mudança de escopo.

## Issues Encountered
- Flakiness intermitente em `tests/onboarding/message-template.test.ts` na primeira rodada (uma conta de teste falhou ao criar a linha `stores` com "Conta criada, mas não foi possível preparar sua loja") — reproduzido como transiente: reexecutado isoladamente e em conjunto com os demais arquivos de teste do onboarding, passou 100% em 3 rodadas subsequentes. Consistente com rate-limiting do Supabase Auth ao criar múltiplas contas reais rapidamente em paralelo (mesma classe de risco já implícita no padrão "sempre testes de integração reais, nunca mockar o Supabase" adotado desde o Plan 02/03) — não uma falha no código de `saveOnboarding`. Nenhuma mudança de código foi necessária; documentado aqui para visibilidade caso reapareça em CI.
- Ambiente do worktree não tinha `node_modules` instalado (esperado — worktrees não compartilham `node_modules` com o checkout principal); rodado `npm install` antes de qualquer teste/instalação da Task 1.

## User Setup Required
None — nenhuma configuração externa adicional além do que já está documentado (`.env.local`, projeto Supabase `yuyprdjzeslanxbgcemj` já linkado, bucket `store-assets` já criado pela migration do Plan 02).

## Next Phase Readiness
- `normalizeWhatsAppBR` está travado e testado — pronto para ser consumido (apenas leitura do valor já persistido) pela Fase 5 (botão "Pedir agora"), sem re-normalização.
- `whatsapp_e164` e `message_template` persistidos em `store_settings` estão prontos para a Fase 5 montar o link `wa.me`.
- `logo_url`/`accent_color`/`tagline`/`name` persistidos em `stores` estão prontos para a Fase 2 (link compartilhável) e Fase 6 (vitrine pública) consumirem.
- Checklist manual de fim de fase (M-1..M-4) documentado no `01-05-PLAN.md` ainda pendente de execução — inclui M-4 (fluxo completo de onboarding em navegador real com número de WhatsApp real), a rodar antes de `/gsd:verify-work` conforme `human_verify_mode=end-of-phase`.
- Nenhum bloqueio conhecido para o restante da Fase 01.

---
*Phase: 01-funda-o-conta-e-isolamento-multi-tenant*
*Completed: 2026-07-11*

## Self-Check: PASSED

- FOUND: src/lib/phone/normalize-br.ts
- FOUND: src/lib/validation/onboarding.ts
- FOUND: src/lib/onboarding/actions.ts
- FOUND: src/app/(admin)/onboarding/page.tsx
- FOUND: src/app/(admin)/onboarding/onboarding-wizard.tsx
- FOUND: tests/phone/normalize-br.test.ts
- FOUND: tests/onboarding/store-settings.test.ts
- FOUND: tests/onboarding/message-template.test.ts
- FOUND commit: 93a3b66
- FOUND commit: 9adc09f
- FOUND commit: 92d5352
- FOUND commit: 906dc19
- FOUND commit: cfd0532
- FOUND commit: ba36579
