---
phase: 01-funda-o-conta-e-isolamento-multi-tenant
plan: 06
subsystem: ui
tags: [css, tailwind, dark-mode, contraste, regression-test]

requires:
  - phase: 01-funda-o-conta-e-isolamento-multi-tenant
    provides: paginas admin (cadastro, login, dashboard, esqueci-senha, redefinir-senha, onboarding) construidas nas plans 01-01 a 01-05
provides:
  - globals.css sem flip de dark mode, forcando color-scheme claro em qualquer SO
  - bg-white explicito em todo <main> do grupo (admin) como defesa em profundidade
  - teste de regressao estatico (tests/ui/dark-mode-contrast.test.ts) cobrindo os dois pontos acima
affects: [ui-polimento, onboarding, admin]

tech-stack:
  added: []
  patterns:
    - "Teste estatico que le arquivos de fonte via fs/path e faz assercoes por regex (mesmo padrao de tests/middleware/matcher.test.ts) para validar propriedades de CSS/markup sem precisar renderizar React"

key-files:
  created:
    - tests/ui/dark-mode-contrast.test.ts
  modified:
    - src/app/globals.css
    - src/app/(admin)/onboarding/onboarding-wizard.tsx
    - src/app/(admin)/cadastro/page.tsx
    - src/app/(admin)/login/page.tsx
    - src/app/(admin)/dashboard/page.tsx
    - src/app/(admin)/esqueci-senha/page.tsx
    - src/app/(admin)/redefinir-senha/page.tsx

key-decisions:
  - "Neutralizar o flip de dark mode em globals.css (remover @media prefers-color-scheme:dark + adicionar color-scheme:light) em vez de migrar as 6 paginas para tokens @theme — resolve 100% do bug reportado com risco de regressao visual minimo"
  - "Migracao de longo prazo dos hex hardcoded (text-[#111111] etc.) para tokens @theme foi deliberadamente deferida como item de backlog de UI polish, nao parte deste gap closure"

patterns-established: []

requirements-completed: [AUTH-01, AUTH-02, AUTH-05, LOJA-01, WPP-01, WPP-02]

coverage:
  - id: D1
    description: "globals.css forca color-scheme:light e nao reintroduz o flip @media (prefers-color-scheme:dark) do boilerplate create-next-app"
    verification:
      - kind: unit
        ref: "tests/ui/dark-mode-contrast.test.ts#globals.css força color-scheme: light"
        status: pass
      - kind: unit
        ref: "tests/ui/dark-mode-contrast.test.ts#globals.css NÃO reintroduz o flip de esquema escuro do boilerplate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Os 6 <main> do grupo (admin) (onboarding, cadastro, login, dashboard, esqueci-senha, redefinir-senha) declaram bg-white explicito"
    verification:
      - kind: unit
        ref: "tests/ui/dark-mode-contrast.test.ts#<main> declara fundo claro explícito (bg-white) (it.each, 6 casos)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Verificacao visual manual: labels/placeholders legiveis em /cadastro, /login, /onboarding com o SO em dark mode"
    verification: []
    human_judgment: true
    rationale: "Requer inspecao visual humana com o SO real em dark mode; o teste estatico prova a propriedade estrutural (color-scheme + bg-white) mas nao substitui a confirmacao visual end-to-end mencionada na secao <verification> do plano como 'opcional/end-of-phase UAT'"

duration: 8min
completed: 2026-07-12
status: complete
---

# Phase 01 Plan 06: Correção de contraste em dark mode (gap closure) Summary

**globals.css forçado a color-scheme:light (remoção do flip @media prefers-color-scheme:dark do boilerplate) + bg-white explícito nos 6 `<main>` do grupo (admin), fechado por teste de regressão estático**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-12T02:22:00Z
- **Completed:** 2026-07-12T02:23:42Z
- **Tasks:** 3
- **Files modified:** 7 (1 criado, 6 modificados)

## Accomplishments
- Removido o bloco `@media (prefers-color-scheme: dark)` herdado do boilerplate `create-next-app` em `src/app/globals.css`, que invertia `--background`/`--foreground` para quase-preto/quase-branco quando o SO do usuário está em dark mode
- Adicionado `color-scheme: light;` em `:root` para forçar controles nativos de formulário/scrollbar do navegador a renderizar em modo claro independentemente da preferência do SO
- Adicionado `bg-white` explícito ao `<main>` das 6 páginas do grupo `(admin)`: onboarding, cadastro, login, dashboard, esqueci-senha, redefinir-senha — defesa em profundidade contra qualquer futura alteração das variáveis CSS
- Criado teste de regressão estático (`tests/ui/dark-mode-contrast.test.ts`) com 8 asserções cobrindo os dois pontos acima, seguindo o padrão já usado em `tests/middleware/matcher.test.ts` (leitura de arquivo-fonte via `fs`/`path` + regex, sem renderização React)
- Suite completa (`npm test`) permanece 100% verde: 43/43 testes passam, nenhuma regressão introduzida

## Task Commits

Cada task foi commitada atomicamente (ciclo TDD RED → GREEN):

1. **Task 1: Escrever teste de regressão de contraste (RED)** - `4de3992` (test)
2. **Task 2: Neutralizar o dark mode no globals.css** - `c0ef0a8` (fix)
3. **Task 3: Adicionar bg-white em todo main do admin + fechar o teste (GREEN)** - `ca2b88a` (feat)

_Nota: RED confirmado antes do fix (8/8 falhas); GREEN confirmado após o fix (8/8 passam) + suite completa 43/43 sem regressão._

## Files Created/Modified
- `tests/ui/dark-mode-contrast.test.ts` - Teste estático de regressão: color-scheme:light, ausência do flip dark, bg-white nos 6 mains
- `src/app/globals.css` - Removido flip `@media (prefers-color-scheme: dark)`; adicionado `color-scheme: light` em `:root`
- `src/app/(admin)/onboarding/onboarding-wizard.tsx` - `bg-white` adicionado ao `<main>`
- `src/app/(admin)/cadastro/page.tsx` - `bg-white` adicionado ao `<main>`
- `src/app/(admin)/login/page.tsx` - `bg-white` adicionado ao `<main>`
- `src/app/(admin)/dashboard/page.tsx` - `bg-white` adicionado ao `<main>`
- `src/app/(admin)/esqueci-senha/page.tsx` - `bg-white` adicionado ao `<main>`
- `src/app/(admin)/redefinir-senha/page.tsx` - `bg-white` adicionado ao `<main>`

## Decisions Made
- Optou-se por neutralizar o flip de dark mode na raiz (globals.css) em vez de migrar os hex hardcoded (`text-[#111111]`, `text-[#0D3D2B]`) para tokens `@theme` — resolve 100% do bug relatado no UAT M-4 com risco de regressão visual muito menor. A migração para tokens `@theme` fica registrada como item de backlog de polimento de UI (nota explícita no PLAN.md, não implementada aqui).

## Deviations from Plan

None - plano executado exatamente como especificado. Os arquivos-alvo e o padrão de teste bateram exatamente com o que o plano descreveu (`grep` de `<main` nas 6 páginas confirmou as classNames previstas antes de qualquer edição).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gap M-4 do UAT (`.planning/phases/01-funda-o-conta-e-isolamento-multi-tenant/01-UAT.md`) fechado: labels/placeholders do onboarding e demais páginas admin permanecem legíveis com o SO em dark mode.
- Verificação visual manual opcional (abrir `/cadastro`, `/login`, `/onboarding` com o SO em dark mode) ainda recomendada como confirmação end-to-end, mas não bloqueia — a correção estrutural está provada pelo teste estático.
- Item de backlog registrado: migração futura dos valores hex hardcoded (`text-[#111111]` etc.) para tokens `@theme` conectados às variáveis CSS — não urgente, cosmético.

## Self-Check: PASSED

Arquivos verificados:
- FOUND: tests/ui/dark-mode-contrast.test.ts
- FOUND: src/app/globals.css (color-scheme: light presente; flip @media ausente)
- FOUND: src/app/(admin)/onboarding/onboarding-wizard.tsx (bg-white presente)
- FOUND: src/app/(admin)/cadastro/page.tsx (bg-white presente)
- FOUND: src/app/(admin)/login/page.tsx (bg-white presente)
- FOUND: src/app/(admin)/dashboard/page.tsx (bg-white presente)
- FOUND: src/app/(admin)/esqueci-senha/page.tsx (bg-white presente)
- FOUND: src/app/(admin)/redefinir-senha/page.tsx (bg-white presente)

Commits verificados:
- FOUND: 4de3992
- FOUND: c0ef0a8
- FOUND: ca2b88a

---
*Phase: 01-funda-o-conta-e-isolamento-multi-tenant*
*Completed: 2026-07-12*
