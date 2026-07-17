---
phase: quick-260716-osh
plan: 1
subsystem: ui
tags: [tailwind-v4, react-hook-form, lucide-react, design-tokens, admin-panel]

requires:
  - phase: quick-260716-fl8
    provides: fundação de tokens/tipografia do Design System (@theme com blue/gray scale, semânticas success/error/warning, whatsapp, raio, sombra, escala tipográfica, keyframes vt-*)
provides:
  - Paleta viva round 2 no @theme (primary-bright, surface-subtle/panel, divider, field-border, ink-navy, sidebar, violet-*, orange-*, success-border)
  - Componente VitrinoLogo (SVG currentColor, conceito de vitrine) substituindo o quadrado azul placeholder
  - Componente ColorSwatchPicker (swatches + entrada custom) substituindo o input[type=color] nativo
  - Split-screen do login com mockup de vitrine em CSS/HTML puro
  - Sidebar admin em tema escuro #0A1680
  - Dashboard com 4 stat cards de cor semântica própria
  - Formulários (Configurações/Novo produto/Onboarding) com seções "que respiram" (bg-surface-subtle, labels navy, bordas azuladas)
affects: [admin-panel, onboarding, dashboard, configuracoes, produtos]

tech-stack:
  added: []
  patterns:
    - "VitrinoLogo: componente de logotipo único usando currentColor para herdar cor do contexto (azul no auth, branco na sidebar escura) em vez de duas variantes de arquivo"
    - "ColorSwatchPicker: swatches predefinidos + input[type=color] nativo visualmente contido via <label> + sr-only input, integrado a react-hook-form via Controller"
    - "Mapa de tom semântico (STAT_TONE_CLASSES) para stat cards: cor aplicada simultaneamente no fundo do ícone, na borda do card e no número — nunca só decorativa"

key-files:
  created:
    - src/components/vitrino-logo.tsx
    - src/components/color-picker.tsx
  modified:
    - src/app/globals.css
    - src/components/auth-layout.tsx
    - src/components/admin-sidebar.tsx
    - src/app/(admin)/onboarding/onboarding-wizard.tsx
    - src/app/(admin)/(painel)/dashboard/page.tsx
    - src/app/(admin)/(painel)/configuracoes/settings-form.tsx
    - src/app/(admin)/(painel)/produtos/product-form.tsx

key-decisions:
  - "Botões secundários (ex.: 'Voltar para rascunho' em product-form.tsx) mantidos com border-gray-300 neutro — a receita 'bordas de input azuladas' (border-field-border) é escopo estrito de input/textarea/select, não de botões, para não alterar a vocabulário visual de ações fora do pedido do plano"
  - "Botão fechar (X) do drawer mobile da sidebar ganhou cor explícita text-white/70 — bug latente introduzido pela troca de tema (ficaria invisível escuro-sobre-escuro sem essa correção), fixado inline como Rule 1"
  - "Verificação visual completa das telas autenticadas (dashboard/onboarding/configurações/novo produto) não foi feita via login real: criar uma conta de teste no projeto Supabase de PRODUÇÃO só para capturar screenshots poluiria dados reais — fora de escopo para um checkpoint de redesign puramente visual. Login (única tela pública) foi validado via screenshot real; as demais foram validadas por compilação (tsc limpo) + grep de classes + inspeção do CSS gerado pelo Tailwind v4 (confirmando que todos os tokens novos compilam em regras reais)"

requirements-completed: [QUICK-REDESIGN-R2]

coverage:
  - id: D1
    description: "Paleta viva round 2 adicionada ao @theme (primary-bright, surface-subtle/panel, divider, field-border, ink-navy, sidebar, violet-*, orange-*, success-border), todas derivadas da marca #0D21A1, sem remover tokens existentes"
    requirement: "QUICK-REDESIGN-R2"
    verification:
      - kind: other
        ref: "grep dos 9 tokens novos em src/app/globals.css + inspeção do CSS gerado pelo Tailwind v4 (bg-sidebar/text-violet-fg/bg-orange-bg/etc. presentes com valores reais em /_next/static/chunks/*.css)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (apenas os 2 erros pré-existentes em tests/supabase/server-cookies.test.ts, documentados no STATE.md)"
        status: pass
    human_judgment: false
  - id: D2
    description: "VitrinoLogo (SVG currentColor, conceito de vitrine/moldura+prateleira+produto) substitui o quadrado azul placeholder em auth-layout.tsx e admin-sidebar.tsx"
    requirement: "QUICK-REDESIGN-R2"
    verification:
      - kind: automated_ui
        ref: "screenshot login-desktop.png (localhost:3421/login) — logotipo em azul, legível a 30px, ao lado do wordmark 'Vitrino'"
        status: pass
      - kind: manual_procedural
        ref: "logotipo branco na sidebar escura (aside + drawer) não foi visualmente confirmado — tela atrás de auth"
        status: unknown
    human_judgment: true
    rationale: "A variante branca do logotipo na sidebar/drawer fica atrás de autenticação real; não foi criada conta de teste em produção para evitar poluir dados reais. Confirmação visual pendente do usuário."
  - id: D3
    description: "Split-screen do login com mockup de vitrine em CSS/HTML puro (moldura de celular, grid de cards de produto, pílula 'Pedir agora'), hidden md:flex preservado"
    requirement: "QUICK-REDESIGN-R2"
    verification:
      - kind: automated_ui
        ref: "screenshot login-desktop.png (1440x900) e login-mobile.png (390x844) — mockup visível/legível no desktop, corretamente oculto no mobile"
        status: pass
    human_judgment: true
    rationale: "Checkpoint do plano exige aprovação visual explícita do usuário (\"aprovado\" ou ajustes) antes de considerar a Direção 4 fechada, mesmo com o screenshot automatizado já validado pelo executor."
  - id: D4
    description: "Onboarding com fundo em gradiente diagonal azul->indigo derivado da marca + VitrinoLogo acima do card; accentColor default e lógica de useForm/saveOnboarding intactos"
    requirement: "QUICK-REDESIGN-R2"
    verification: []
    human_judgment: true
    rationale: "Tela atrás de /onboarding (auth + store sem onboarding completo); não verificada via screenshot para evitar criar conta de teste em produção. Verificada apenas por tsc limpo + grep de accentColor default preservado."
  - id: D5
    description: "Sidebar admin (aside desktop + drawer mobile) em tema escuro bg-sidebar (#0A1680) com texto/ícones brancos, item ativo em bg-white/15; lógica de dialog/matchMedia/signOutAction intacta"
    requirement: "QUICK-REDESIGN-R2"
    verification: []
    human_judgment: true
    rationale: "Tela atrás de /dashboard; não verificada via screenshot (mesma razão de D4). Verificada por tsc limpo + grep confirmando bg-sidebar/matchMedia/signOutAction presentes."
  - id: D6
    description: "4 stat cards do dashboard com cor semântica própria (azul/verde/laranja/violeta) aplicada simultaneamente ao fundo do ícone, borda do card e número; valores calculados inalterados"
    requirement: "QUICK-REDESIGN-R2"
    verification: []
    human_judgment: true
    rationale: "Tela atrás de /dashboard; não verificada via screenshot. Verificada por tsc limpo + grep das classes de tom (violet-fg/orange-bg/success-border) presentes no arquivo."
  - id: D7
    description: "Formulários (Configurações/Novo produto/Onboarding) com seções bg-surface-subtle + border-divider, labels text-ink-navy, inputs border-field-border; botões de ação fora do escopo mantidos neutros"
    requirement: "QUICK-REDESIGN-R2"
    verification: []
    human_judgment: true
    rationale: "Telas atrás de auth; não verificadas via screenshot. Verificadas por tsc limpo + grep confirmando as classes aplicadas apenas em campos de formulário (não em botões)."
  - id: D8
    description: "ColorSwatchPicker (swatches predefinidos + entrada custom 'Personalizada' com input[type=color] contido) integrado via Controller nas Configurações e no Onboarding, sempre emitindo #RRGGBB válido"
    requirement: "QUICK-REDESIGN-R2"
    verification: []
    human_judgment: true
    rationale: "Interação de clique/seleção precisa de teste manual em navegador real (comportamento, não só renderização estática); telas atrás de auth não screenshotadas por não haver conta de teste disponível sem tocar produção."

duration: 22min
completed: 2026-07-16
status: complete
---

# Quick Task 260716-osh: Redesign Visual Round 2 do Vitrino Summary

**Logotipo real (SVG vitrine), paleta viva derivada da marca, sidebar escura #0A1680, stat cards semânticos e color picker customizado (swatches + Controller) sobre a fundação de tokens já aplicada em quick-260716-fl8.**

## Performance

- **Duration:** ~22 min
- **Tasks:** 4/4 implementação completos; checkpoint de verificação humana com automação parcial (ver "Checkpoint Pendente" abaixo)
- **Files modified:** 7 modificados + 2 criados

## Accomplishments

- Paleta viva round 2 adicionada ao `@theme` de `globals.css` (primary-bright, surface-subtle/panel, divider, field-border, ink-navy, sidebar, violet-*, orange-*, success-border) — todas derivadas de `#0D21A1`, nenhum token existente removido/editado.
- `VitrinoLogo` (SVG `currentColor`, moldura de vitrine + prateleira + produto, crisp a 28px) substitui o quadrado azul placeholder em `auth-layout.tsx` e `admin-sidebar.tsx`.
- Painel direito do login ganhou um mockup de vitrine em CSS/HTML puro (moldura de celular inclinada, grid 2x2 de cards de produto, pílula "Pedir agora"), `hidden md:flex` preservado — confirmado via screenshot real do dev server.
- Onboarding trocou o fundo cinza liso por um gradiente diagonal azul→indigo derivado da marca, com `VitrinoLogo` acima do card.
- Sidebar admin (desktop + drawer mobile) virou tema escuro `bg-sidebar` (#0A1680) com texto/ícones brancos e item ativo destacado; barra de topo mobile permanece clara para separar visualmente do painel escuro.
- Dashboard: 4 stat cards ganharam linguagem semântica própria (Total→azul, Disponíveis→verde, Esgotados→laranja, Acessos→violeta) aplicada ao fundo do ícone, borda do card e número.
- Formulários (Configurações/Novo produto/Onboarding) ganharam seções "que respiram" (`bg-surface-subtle`/`border-divider`), labels `text-ink-navy`, e bordas de input `border-field-border`.
- Novo `ColorSwatchPicker` (8 swatches predefinidos + entrada custom "Personalizada" com `input[type=color]` visualmente contido) substitui o picker nativo nu no campo "Cor de destaque" de Configurações e Onboarding, integrado via `Controller` do react-hook-form.

## Task Commits

1. **Task 1: Fundação — paleta viva no @theme + logotipo real do Vitrino** - `c0a4ba7` (feat)
2. **Task 2: Split-screen do login com produto em ação + fundo do onboarding com caráter** - `3a760f3` (feat)
3. **Task 3: Sidebar escura (#0A1680) + stat cards semânticos do dashboard** - `f900f9a` (feat)
4. **Task 4: Formulários que respiram + color picker customizado** - `4d5aacd` (feat)

_Não é um plano TDD — sem commits `test(...)` dedicados; verificação por `npx tsc --noEmit` + greps estruturais + screenshot real após cada task._

## Files Created/Modified

- `src/app/globals.css` - Tokens round 2 adicionados ao `@theme` (paleta viva derivada da marca)
- `src/components/vitrino-logo.tsx` (novo) - `VitrinoLogo`, SVG de vitrine em `currentColor`
- `src/components/color-picker.tsx` (novo) - `ColorSwatchPicker`, swatches + entrada custom
- `src/components/auth-layout.tsx` - Logotipo real + mockup de vitrine no painel direito do login
- `src/components/admin-sidebar.tsx` - Sidebar em tema escuro, logotipo branco, fix do botão fechar do drawer
- `src/app/(admin)/onboarding/onboarding-wizard.tsx` - Fundo em gradiente + logo + seções que respiram + ColorSwatchPicker
- `src/app/(admin)/(painel)/dashboard/page.tsx` - Stat cards com cor semântica própria
- `src/app/(admin)/(painel)/configuracoes/settings-form.tsx` - Seções que respiram + ColorSwatchPicker via Controller
- `src/app/(admin)/(painel)/produtos/product-form.tsx` - Seções que respiram (sem campo de cor, conforme guard-rail do plano)

## Decisions Made

- Botões secundários (ex.: "Voltar para rascunho") mantidos com `border-gray-300` neutro em vez de `border-field-border` — a receita de "bordas de input azuladas" é escopo estrito de campo de formulário (input/textarea/select), não de botões de ação, para não alterar o vocabulário visual estabelecido de botões fora do pedido explícito do plano.
- Verificação visual completa das 4 telas autenticadas (Onboarding/Dashboard/Novo produto/Configurações) não foi feita criando uma conta de teste real no projeto Supabase de **produção** (o único jeito de efetivamente logar e navegar essas rotas) — isso poluiria dados reais só para capturar um screenshot de um redesign puramente visual. Optei por validar essas telas via `npx tsc --noEmit` limpo + greps estruturais das classes aplicadas + inspeção do CSS gerado pelo Tailwind v4 (confirmando que todos os tokens/utilities novos compilam em regras reais e corretas). A tela de Login (única pública, sem auth) foi validada com screenshot real do dev server em desktop e mobile.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Botão fechar (X) do drawer mobile ficaria invisível após a troca de tema escuro**
- **Found during:** Task 3 (Sidebar escura)
- **Issue:** O `<dialog>` do drawer mobile virou `bg-sidebar` (escuro), mas o botão "Fechar menu" (ícone `X` do lucide) não tinha cor de texto explícita — herdaria a cor padrão do documento (escura), ficando praticamente invisível sobre o novo fundo escuro.
- **Fix:** Adicionada `text-white/70 transition-colors duration-150 hover:text-white` ao botão, consistente com o resto da paleta de ícones/texto da sidebar escura.
- **Files modified:** `src/components/admin-sidebar.tsx`
- **Verification:** `npx tsc --noEmit` sem erro novo; classe visível na revisão do diff.
- **Committed in:** `f900f9a` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Correção necessária diretamente causada pela troca de tema da Task 3 (Rule 1, escopo estrito). Sem scope creep.

## Issues Encountered

- O worktree não tinha `.env.local` (gitignored, não versionado) — copiei temporariamente o `.env.local` do repositório principal para rodar o dev server local e capturar o screenshot do login, e removi a cópia ao final da verificação (nunca commitado; `.env*` está no `.gitignore`).
- Porta `3000` já estava ocupada por outro processo no ambiente — dev server local rodou na porta `3421` só para esta verificação.

## Checkpoint Pendente (Task 5 do plano — `checkpoint:human-verify`)

O plano tem uma Task 5 final de verificação humana (gate `blocking`) que **não foi completada de forma autônoma** — ela exige navegar as telas autenticadas (Onboarding/Dashboard/Novo produto/Configurações) com uma conta real, algo que não posso fazer sem criar uma conta de teste no Supabase de produção (rejeitado por risco de poluir dados reais, ver "Decisions Made").

**O que já foi automatizado e passou:**
- Dev server local (`npm run dev`) sobe sem erros.
- `npx tsc --noEmit` sem erros novos (só os 2 pré-existentes documentados em STATE.md).
- Tela de Login (`/login`) capturada via screenshot real em desktop (1440x900) e mobile (390x844): logotipo real visível, mockup de vitrine correto e `hidden md:flex` respeitado (some corretamente no mobile).
- CSS compilado pelo Tailwind v4 inspecionado diretamente — confirma que todos os tokens/utilities novos (bg-sidebar, text-violet-fg, bg-orange-bg, border-success-border, bg-surface-subtle, text-ink-navy, border-field-border, etc.) geram regras reais com os valores corretos.
- Rotas protegidas (`/dashboard`, `/onboarding`, `/configuracoes`, `/produtos/novo`) testadas sem sessão: todas retornam redirect 307 limpo para `/login` (sem erro 500/crash de render), confirmando que a árvore de componentes compila e executa sem exceções em tempo de execução.

**O que ainda precisa da aprovação visual do usuário** (passos 3-8 do checkpoint original do plano, com uma sessão logada real):
1. **Onboarding** (`/onboarding`, logado sem loja): confirmar fundo em gradiente de marca + logo acima do card, e o campo "Cor de destaque" como swatches + custom.
2. **Dashboard** (`/dashboard`): confirmar sidebar escura #0A1680 com ícones/texto brancos e item ativo destacado; os 4 stat cards com cores semânticas distintas.
3. **Novo produto** (`/produtos/novo`): confirmar seções do formulário com fundo levemente azulado, labels navy e bordas de input azuladas.
4. **Configurações** (`/configuracoes`): confirmar o `ColorSwatchPicker` funcionando (selecionar swatch e cor custom salva) e as seções que respiram.
5. Testar no viewport mobile (~375px): sidebar vira hambúrguer → drawer escuro; nada quebra.
6. Confirmar que salvar Configurações/Onboarding continua funcionando (fluxo intacto) e que a cor escolhida persiste.

**Resume-signal esperado pelo plano original:** Digite "aprovado" ou descreva os ajustes visuais desejados, ao revisar as telas acima com sua própria sessão logada.

## Next Phase Readiness

- Todo o trabalho de engenharia (4 tasks de implementação) está completo, commitado e com `tsc` limpo — nenhum bloqueio técnico.
- O único item pendente é a aprovação visual humana das 4 telas autenticadas (Onboarding/Dashboard/Novo produto/Configurações), que só o usuário pode fazer com sua própria sessão logada em produção.
- Nenhuma mudança de fluxo/rota/prop/Server Action/query/RLS/schema/copy — todo o comportamento validado do milestone v1.0 permanece intacto.

---
*Phase: quick-260716-osh*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 9 files created/modified confirmed on disk (`vitrino-logo.tsx`, `color-picker.tsx`, `globals.css`, `auth-layout.tsx`, `admin-sidebar.tsx`, `onboarding-wizard.tsx`, `dashboard/page.tsx`, `settings-form.tsx`, `product-form.tsx`) plus this SUMMARY.md. All 4 task commit hashes (`c0a4ba7`, `3a760f3`, `f900f9a`, `4d5aacd`) confirmed present in `git log --oneline --all`.
