---
phase: 06-m-tricas-e-dashboard
plan: 04
subsystem: frontend
tags: [navigation, sidebar, dialog, responsive, route-groups]

# Dependency graph
requires:
  - phase: 06-m-tricas-e-dashboard
    provides: "06-03: dashboard/page.tsx reescrito (o que este plano move para dentro de (painel)/)"
provides:
  - "AdminSidebar compartilhado: sidebar fixa no desktop + drawer <dialog> nativo no mobile, com barra de topo dedicada para o hambúrguer"
  - "Grupo de rotas aninhado (admin)/(painel)/ isolando dashboard/produtos/configuracoes das páginas públicas de auth"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "layout.tsx com flex-col no mobile / md:flex-row no desktop para empilhar a barra de topo mobile acima de {children} sem duplicar componentes"
    - "useEffect + matchMedia('(min-width: 768px)') para fechar um <dialog> quando a viewport cruza um breakpoint, independente do estado de abertura"

key-files:
  created:
    - src/components/admin-sidebar.tsx
    - src/app/(admin)/(painel)/layout.tsx
  modified:
    - src/app/(admin)/(painel)/dashboard/page.tsx
    - src/app/(admin)/(painel)/produtos/page.tsx
    - src/app/(admin)/(painel)/produtos/novo/page.tsx
    - src/app/(admin)/(painel)/produtos/[id]/editar/page.tsx
    - src/app/(admin)/(painel)/produtos/photo-uploader.tsx
    - src/app/(admin)/(painel)/produtos/product-form.tsx
    - src/app/(admin)/(painel)/produtos/product-list.tsx
    - src/app/(admin)/(painel)/produtos/product-toolbar.tsx
    - src/app/(admin)/(painel)/produtos/size-grid.tsx
    - src/app/(admin)/(painel)/configuracoes/page.tsx
    - src/app/(admin)/(painel)/configuracoes/qr-code-panel.tsx
    - src/app/(admin)/(painel)/configuracoes/settings-form.tsx
    - src/app/(admin)/(painel)/configuracoes/slug-editor.tsx
    - tests/ui/dark-mode-contrast.test.ts

key-decisions:
  - "Hambúrguer mobile vive numa barra de topo dedicada (h-14, border-b, md:hidden) em vez de solto na flex row do layout — evita o bug de esticamento vertical (align-items: stretch numa flex row min-h-dvh) e segue literalmente 06-UI-SPEC.md linha 132"
  - "(painel)/layout.tsx usa flex-col no mobile / md:flex-row no desktop para que a barra de topo empilhe acima de {children} sem precisar de position:fixed nem de um componente de header separado"
  - "Dialog do drawer fecha via matchMedia listener ao cruzar para desktop — necessário porque alternar entre emulação mobile/desktop do navegador (ou redimensionar a janela) sem fechar o menu manualmente deixava o <dialog> aberto sobreposto ao layout desktop"

requirements-completed: [MTR-01]

coverage:
  - id: D1
    description: "Sidebar fixa no desktop + drawer <dialog> no mobile, com link ativo destacado (D-05/D-06)"
    requirement: "MTR-01"
    verification:
      - kind: manual
        ref: "checkpoint humano — verificação interativa em http://localhost:3006"
        status: pass
    human_judgment: true
    rationale: "Requer interação real (clique, resize de viewport, foco de teclado) — não testável por asserção estática."
  - id: D2
    description: "'Sair da conta' no rodapé, separado dos links, funcional"
    requirement: "MTR-01"
    verification:
      - kind: manual
        ref: "checkpoint humano"
        status: pass
    human_judgment: true
  - id: D3
    description: "Sidebar ausente nas páginas públicas de auth (login/cadastro/onboarding/esqueci-senha/redefinir-senha)"
    requirement: "MTR-01"
    verification:
      - kind: other
        ref: "(admin)/layout.tsx sem diff (git diff --stat confirma zero mudanças) — isolamento estrutural via grupo de rotas, não checagem condicional"
        status: pass
    human_judgment: false
  - id: D4
    description: "URLs /dashboard, /produtos, /produtos/novo, /produtos/[id]/editar, /configuracoes idênticas após a reorganização"
    requirement: "MTR-01"
    verification:
      - kind: other
        ref: "npm run build — output da tabela de rotas confirma as mesmas 5 URLs, nenhuma nova rota introduzida pelo grupo (painel)"
        status: pass
    human_judgment: false

# Metrics
duration: ~45min (2 sessões — 25min até o checkpoint, +20min corrigindo 2 bugs achados na verificação humana)
completed: 2026-07-15
status: complete
---

# Phase 6 Plan 04: Shell de navegação do painel (sidebar + drawer + grupo de rotas) Summary

**AdminSidebar compartilhado (sidebar fixa no desktop, drawer `<dialog>` nativo no mobile) e grupo de rotas aninhado `(painel)` isolando as páginas autenticadas das públicas de auth — nenhuma URL mudou. Checkpoint humano encontrou 2 bugs de responsividade (hambúrguer mal posicionado, drawer não fechava no resize mobile→desktop), ambos corrigidos e reverificados.**

## Performance

- **Duration:** ~45 min (25min até o checkpoint + 20min corrigindo bugs achados na verificação)
- **Started:** 2026-07-15
- **Completed:** 2026-07-15
- **Tasks:** 3/3 completos (2 de código + 1 checkpoint humano)
- **Files modified:** 16 (2 novos, 14 movidos/ajustados)

## Accomplishments
- `src/components/admin-sidebar.tsx` criado: `<aside hidden md:flex>` fixo no desktop + hambúrguer numa barra de topo mobile + `<dialog>` nativo (`.showModal()`) para o drawer, com `NavLinks` compartilhado entre os dois (mesmo destaque de link ativo via `pathname.startsWith`)
- `src/app/(admin)/(painel)/layout.tsx` criado: único `<main>` das páginas do painel, `flex-col` no mobile / `md:flex-row` no desktop
- 13 arquivos movidos via `git mv` para dentro de `(admin)/(painel)/` (dashboard, produtos e subrotas, configuracoes) — raiz de cada página trocada de `<main>` para `<div>` para evitar landmark duplicado
- `tests/ui/dark-mode-contrast.test.ts` repontado para a nova localização do `bg-white`
- `(admin)/layout.tsx` nunca tocado — isolamento da sidebar às páginas autenticadas é estrutural (grupo de rotas), não uma checagem condicional

## Task Commits

1. **Task 1: AdminSidebar + (painel)/layout.tsx** - `4f843d3` (feat)
2. **Task 2: Mover páginas para (painel)/ + repontar teste** - `b8b5d69` (feat)
3. **Task 3: checkpoint humano** - verificação inicial encontrou 2 bugs; corrigidos em `f024a33` (fix), reverificados e aprovados pelo usuário

## Files Created/Modified
- `src/components/admin-sidebar.tsx` - sidebar/drawer compartilhado
- `src/app/(admin)/(painel)/layout.tsx` - layout do painel, único `<main>`
- 13 páginas/componentes movidos para `(painel)/` (dashboard, produtos + subrotas, configuracoes)
- `tests/ui/dark-mode-contrast.test.ts` - entrada repontada

## Decisions Made
- Barra de topo mobile dedicada (não um botão solto na flex row) para o hambúrguer — evita esticamento vertical indesejado e segue `06-UI-SPEC.md` linha 132 literalmente
- `flex-col`/`md:flex-row` no layout do painel para empilhar a barra de topo mobile acima do conteúdo sem `position:fixed`
- `matchMedia` listener para fechar o drawer ao cruzar para desktop — cobre o caso de alternar emulação mobile/desktop do navegador sem fechar o menu manualmente primeiro

## Deviations from Plan

### Found During Human Checkpoint (Task 3), Fixed Before Approval

**1. [Descoberto na verificação humana] Hambúrguer mobile flutuava no meio da lateral esquerda em vez de ficar numa barra de topo**
- **Found during:** Task 3 (checkpoint humano — usuário testou em viewport mobile real)
- **Issue:** O botão do hambúrguer era um item solto na flex row `min-h-dvh` do layout (`<aside>`/botão/`<dialog>`/`<main>` todos como irmãos flex). Com `align-items: stretch` (padrão), o botão esticava para a altura inteira da viewport, deixando o ícone centralizado no meio da tela em vez de no topo — divergindo de `06-UI-SPEC.md` linha 132 ("positioned in a small top bar above {children}").
- **Fix:** Botão movido para dentro de uma barra de topo dedicada (`h-14 border-b md:hidden`); `(painel)/layout.tsx` passou de `flex` (row sempre) para `flex-col md:flex-row`, fazendo a barra empilhar acima de `{children}` no mobile.
- **Files modified:** `src/components/admin-sidebar.tsx`, `src/app/(admin)/(painel)/layout.tsx`
- **Verification:** Reverificado interativamente pelo usuário — aprovado
- **Committed in:** `f024a33`

**2. [Descoberto na verificação humana] `<dialog>` do drawer não fechava ao redimensionar de mobile para desktop**
- **Found during:** Task 3 (checkpoint humano — usuário abriu o drawer em emulação mobile do navegador e depois voltou para viewport desktop sem fechar o menu)
- **Issue:** O `<dialog>` não tinha nenhum listener de redimensionamento; ao cruzar o breakpoint `md` com o drawer aberto, ele continuava renderizado por cima do layout desktop (overlay escuro + painel de 256px), produzindo uma tela quebrada.
- **Fix:** `useEffect` com `window.matchMedia('(min-width: 768px)')` fecha o dialog (`dialogRef.current?.close()`) sempre que a media query passa a bater, independente do estado atual (no-op se já fechado).
- **Files modified:** `src/components/admin-sidebar.tsx`
- **Verification:** Reverificado interativamente pelo usuário — aprovado
- **Committed in:** `f024a33`

---

**Total deviations:** 2 (ambas encontradas e corrigidas durante o checkpoint humano da Task 3, antes da aprovação)
**Impact on plan:** Nenhum desvio de escopo — as duas correções são bugs de responsividade dentro do mesmo componente que a Task 1 já criava, não trabalho novo.

## Issues Encountered

Nenhum bloqueio de infraestrutura. O worktree nasceu sem `.env.local`/`node_modules` (necessários para `npm run dev` autenticar contra o Supabase real durante a verificação humana) — resolvido copiando `.env.local` do checkout principal e symlinkando `node_modules`, ambos removidos/não commitados ao final (gitignored).

## User Setup Required

Nenhuma ação pendente.

## Next Phase Readiness

- Fase 6 completa: todos os 4 planos (06-01 a 06-04) fechados.
- Nenhum trabalho pendente para fases futuras derivado deste plano.

---
*Phase: 06-m-tricas-e-dashboard*
*Status: COMPLETO*

## Self-Check: PASSED

- FOUND: `src/components/admin-sidebar.tsx`
- FOUND: `src/app/(admin)/(painel)/layout.tsx`
- FOUND: `tests/ui/dark-mode-contrast.test.ts` (repontado)
- FOUND commit: `4f843d3` (Task 1)
- FOUND commit: `b8b5d69` (Task 2)
- FOUND commit: `f024a33` (Task 3 — fixes pós-checkpoint)
- CONFIRMED: `(admin)/layout.tsx` sem diff (isolamento estrutural intacto)
- CONFIRMED: checkpoint humano aprovado pelo usuário após correções
