---
phase: quick-260716-osh
plan: 1
type: execute
wave: 1
depends_on: []
autonomous: false
requirements: [QUICK-REDESIGN-R2]
files_modified:
  - src/app/globals.css
  - src/components/vitrino-logo.tsx
  - src/components/color-picker.tsx
  - src/components/auth-layout.tsx
  - src/components/admin-sidebar.tsx
  - src/app/(admin)/onboarding/onboarding-wizard.tsx
  - src/app/(admin)/(painel)/dashboard/page.tsx
  - src/app/(admin)/(painel)/configuracoes/settings-form.tsx
  - src/app/(admin)/(painel)/produtos/product-form.tsx

must_haves:
  truths:
    - "Um logotipo real (SVG do Vitrino, conceito de vitrine/janela) substitui o quadrado azul placeholder em auth-layout.tsx e admin-sidebar.tsx, legivel a 28px e escalavel, usando currentColor (azul no fundo claro, branco na sidebar escura)"
    - "A sidebar do painel (desktop e drawer mobile) tem fundo escuro #0A1680 com icones e texto brancos, visualmente distinta do conteudo branco"
    - "Os 4 stat cards do dashboard tem cor semantica propria (Total->azul, Disponiveis->verde, Esgotados->laranja, Acessos->violeta) aplicada ao fundo do icone, a borda do card e a cor do numero"
    - "O painel direito do split-screen de login mostra o produto em acao via um mockup de vitrine em pura CSS/HTML (sem imagem externa, sem asset pago), escondido no mobile (hidden md:flex)"
    - "O onboarding tem fundo com caracter de marca (gradiente azul->indigo + logotipo), nao mais um cinza liso"
    - "Formularios (Configuracoes, Novo produto, Onboarding) respiram: secoes com fundo azulado #F7F9FF, labels em azul-marinho, bordas de input azuladas em repouso"
    - "O campo 'Cor de destaque' usa um componente customizado (swatches predefinidos + entrada custom) em vez do color picker nativo nu, integrado ao react-hook-form via Controller"
    - "A cor de marca #0D21A1 e #000000 continuam fixas — apenas derivacoes adicionadas; nenhuma prop, Server Action, query, RLS, rota, schema, validacao ou copy alterada"
    - "npx tsc --noEmit nao introduz nenhum erro novo"
  artifacts:
    - "src/app/globals.css com os tokens round 2 no @theme (primary-bright, surface-subtle, surface-panel, divider, field-border, ink-navy, sidebar, violet-*, orange-*, success-border)"
    - "src/components/vitrino-logo.tsx exportando VitrinoLogo (SVG inline, currentColor, props size/className)"
    - "src/components/color-picker.tsx exportando ColorSwatchPicker (swatches + entrada custom, value/onChange)"
    - "auth-layout, admin-sidebar, dashboard, onboarding-wizard, settings-form e product-form re-estilizados com a identidade round 2"
  key_links:
    - "VitrinoLogo usa currentColor e herda a cor do contexto — azul no auth (fundo claro) e branco na sidebar escura, sem duas variantes de arquivo"
    - "ColorSwatchPicker integra ao react-hook-form via Controller (dependencia ja instalada), preservando o campo accentColor e sua validacao zod de formato hex"
    - "Os tokens do @theme (bg-sidebar, bg-surface-subtle, text-violet-fg, border-orange-border, etc.) geram as utilities Tailwind v4 consumidas pelas telas"
---

<objective>
Redesign visual round 2 do Vitrino — implementar as 8 direcoes da auditoria de UI (`.planning/todos/redesign-visual-prompt.md`) mais o color picker customizado, sobre a fundacao de tokens/tipografia ja aplicada na thread anterior (`quick-260716-fl8`). O trabalho e puramente visual: nenhum fluxo, rota, prop, Server Action, query, RLS, validacao ou copy muda.

As 5 telas com problemas apontados na auditoria sao todas do lado admin/auth (Login, Dashboard, Configuracoes, Novo Produto, Onboarding). A vitrine publica (`/loja/[slug]`) NAO teve problemas apontados e ja recebeu o tratamento comercial no round 1 (lift de card no hover, preco em `font-display text-primary`) — por isso a Direcao 3 ("diferenciar admin da vitrine publica") e satisfeita por divergencia: este plano deixa o painel admin mais distintamente profissional (sidebar escura estilo Linear/Vercel, formularios que respiram, cards semanticos) e NAO toca na vitrine publica.

O trabalho tem quatro camadas:
1. **Fundacao (Task 1):** ampliar a paleta viva no `@theme` (derivada da marca, nunca substituta) e criar o logotipo real do Vitrino, ja plugado no auth e na sidebar.
2. **Auth + Onboarding (Task 2):** elevar o split-screen do login com um mockup de vitrine e dar caracter de marca ao fundo do onboarding.
3. **Sidebar escura + cards semanticos (Task 3):** sidebar `#0A1680` e os 4 stat cards com cor semantica propria.
4. **Formularios que respiram + color picker (Task 4):** secoes azuladas, labels navy, e o componente customizado de cor.

Uma Task 5 final de validacao visual no browser (dev server + revisao das 5 telas) fecha o plano — exigencia explicita do brief.

Restricao de marca (nao-negociavel): `#0D21A1` continua `--color-primary` e `#000000` continua `--color-gray-950`. Toda cor nova e uma DERIVACAO (tons de azul, neutros frios, acentos violeta/laranja para semantica), nunca uma paleta substituta.

Skills obrigatorias: o executor DEVE seguir as duas skills de design instaladas — `impeccable` (`.agents/skills/impeccable/SKILL.md` + `reference/product.md`, `reference/colorize.md`, `reference/layout.md`, `reference/polish.md`) e `frontend-design` (`.agents/skills/frontend-design/SKILL.md`) — para cor, contraste (corpo >=4.5:1, texto grande >=3:1), tipografia, layout, motion e os anti-padroes ("absolute bans": nada de side-stripe borders, gradient text, glassmorphism decorativo por padrao, decorative grid backgrounds, border-radius >=32px em cards). Reduced motion nao e opcional: qualquer animacao precisa de fallback `prefers-reduced-motion`/`motion-safe:`.

Purpose: transformar o painel admin de "template de SaaS generico" numa identidade de vitrine premium e comercial, mantendo intacto todo o comportamento validado do milestone v1.0.
Output: 2 componentes novos (VitrinoLogo, ColorSwatchPicker) + tokens round 2 no `globals.css` + 6 telas re-estilizadas; `npx tsc --noEmit` sem erro novo; checkpoint humano das 5 telas aprovado.
</objective>

<execution_context>
@/Users/ryanlucas/Downloads/VITRINO/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Skills de design (fonte de padroes — ler antes de codar cada task):
@.agents/skills/impeccable/SKILL.md
@.agents/skills/impeccable/reference/product.md
@.agents/skills/frontend-design/SKILL.md

Auditoria visual completa (as 8 direcoes, tela por tela):
@.planning/todos/redesign-visual-prompt.md

Fundacao existente (round 1 — ja aplicada, NAO refazer): `src/app/globals.css` ja tem o `@theme` com escala blue/gray, semanticas success/error/warning, whatsapp, raio, sombra, escala tipografica e keyframes de motion (vt-fade-in/scale-in/slide-up); as fontes Manrope (display) + Inter (corpo) ja estao carregadas em `layout.tsx`; todas as telas ja usam tokens (zero `[#hex]` arbitrario). Este plano ADICIONA por cima.

Estado atual dos placeholders a substituir (confirmado no planejamento):
- `auth-layout.tsx` linha ~26: `<div className="h-[30px] w-[30px] rounded-md bg-primary" />` — quadrado azul placeholder. O painel direito (linhas ~40-58) e so texto sobre azul liso.
- `admin-sidebar.tsx` `LogoMark()` linha ~61: `<div className="h-7 w-7 rounded-md bg-primary" />` — mesmo placeholder. `<aside>` (linha ~135) e o drawer `<dialog>` (linha ~159) tem `bg-white`.
- `dashboard/page.tsx` linhas ~67-90: `statCards` sao 4 objetos identicos (icone `text-gray-400`, numero `text-gray-900`, card `border-gray-200`).
- `settings-form.tsx` linhas ~113-126 e `onboarding-wizard.tsx` linhas ~106-119: campo `accentColor` usa `<input type="color" {...register("accentColor")} className="h-10 w-20 ...">` — o picker nativo nu.
- Secoes de formulario em `settings-form.tsx`/`product-form.tsx`/`onboarding-wizard.tsx`: wrappers `rounded-lg border border-gray-200 bg-white p-5`; labels `text-sm font-medium text-gray-700`.

Guard-rails de dado (NAO alterar — sao valores, nao estilo): `accentColor: "#0D21A1"` (onboarding-wizard defaultValues), `accentColor: store.accentColor ?? "#0D21A1"` (settings-form defaultValues), `backgroundColor: store.accentColor ?? "#000000"` (store-hero, fora de escopo). Toda a logica de `useForm`/`useTransition`/`saveOnboarding`/`saveStoreSettings`/`saveProduct` e a logica do `<dialog>`/`matchMedia`/`useEffect` da sidebar permanecem intactas.
</context>

## Tokens round 2 (conteudo exato para o `@theme` de `globals.css`)

Adicionar DENTRO do bloco `@theme { ... }` existente, logo antes do comentario `/* Raio ... */` (ou em qualquer ponto do bloco). Nao remover nem editar nenhum token existente. Todos derivam da marca `#0D21A1`.

```css
  /* === Round 2: paleta viva (derivada da marca, nunca a substitui) === */
  --color-primary-bright: #2D4BF0;   /* azul vibrante p/ hover/realce/acento */

  /* Superficies azuladas (formularios que respiram, sidebar escura) */
  --color-surface-subtle: #F7F9FF;   /* fundo de secao de formulario ("respiro") */
  --color-surface-panel:  #F1F4FF;   /* realce claro alternativo */
  --color-divider:        #E4E9FB;   /* divisor/borda azul muito claro */
  --color-field-border:   #D3DCF5;   /* borda de input azulada em repouso */
  --color-ink-navy:       #2A356B;   /* label azul-marinho sutil */
  --color-sidebar:        #0A1680;   /* sidebar escura (texto/icone branco por cima) */

  /* Acento violeta — analytics/trafego ("Acessos") */
  --color-violet-bg:     #EFECFD;
  --color-violet-fg:     #4B2E9E;
  --color-violet-solid:  #6D3EE8;
  --color-violet-border: #D8CEF7;

  /* Laranja — urgencia/atencao ("Esgotados") */
  --color-orange-bg:     #FDECE0;
  --color-orange-fg:     #9A4410;
  --color-orange-solid:  #E56A1C;
  --color-orange-border: #F7D2B8;

  /* Borda tonal clara p/ o stat card verde (Disponiveis) */
  --color-success-border: #BCE9CE;
```

Observacao Tailwind v4: cada `--color-<nome>` gera automaticamente as utilities `bg-<nome>`, `text-<nome>`, `border-<nome>`, `ring-<nome>`. `--color-primary-border` (#B9C1F1) ja existe do round 1 e serve de borda do card azul (Total). Contraste conferido: `text-ink-navy` (#2A356B) sobre `bg-surface-subtle` (#F7F9FF) e navy sobre quase-branco (alto contraste, ok para labels); numeros dos stat cards usam os `-fg`/`-solid` escuros sobre `-bg` claro (todos passam >=4.5:1).

## Spec do logotipo (`src/components/vitrino-logo.tsx`)

Componente novo, presentacional puro. Conceito ancorado no subject (frontend-design "ground it in the subject"): o Vitrino e uma **vitrine** — uma janela/moldura de exibicao de produto. O mark deve remeter a isso, NAO ser um quadrado solido.

Requisitos rigidos:
- Server component simples (sem `"use client"`). Export nomeado `VitrinoLogo`.
- Props: `size?: number` (default `28`), `className?: string`. Renderiza um unico `<svg>` inline com `viewBox="0 0 32 32"`, `width={size}`, `height={size}`, `aria-hidden="true"`, `focusable="false"`.
- Usa `currentColor` em fills/strokes (nunca hex embutido) — assim o mesmo componente fica azul no auth (herda `text-primary`) e branco na sidebar escura (herda `text-white`).
- Legivel e crisp a 28px: no maximo ~4 elementos de path/rect/line; strokes >= 2 unidades no grid de 32; cantos arredondados (rx ~6-7 na moldura externa) coerentes com a escala de raio do DS.
- Conceito sugerido (o executor pode refinar via skills, desde que continue lendo como "vitrine" e nao como quadrado chapado): uma moldura de vitrine arredondada (janela) com uma linha de prateleira horizontal e um bloco de produto sobre a prateleira; OU um "V" confiante recortado dentro da moldura. Evitar SVG "sketchy"/hand-drawn (banido pela impeccable).
- Sem dependencia nova; sem `<img>`; sem asset externo.

## Spec do color picker (`src/components/color-picker.tsx`)

Componente novo `"use client"`. Export nomeado `ColorSwatchPicker`. Substitui o `<input type="color">` nu (Direcao extra do brief).

Requisitos rigidos:
- Props: `value: string` (hex `#RRGGBB`), `onChange: (hex: string) => void`, `id?: string`.
- Renderiza uma fileira de swatches circulares predefinidos + uma entrada custom. Swatches derivados da marca e de acentos uteis para vitrine: `#0D21A1` (marca), `#2D4BF0` (azul vibrante), `#0A1680` (indigo), `#1FA860` (verde), `#E56A1C` (laranja), `#6D3EE8` (violeta), `#D82A44` (vermelho), `#000000` (preto). Cada swatch e um `<button type="button">` com `aria-label` da cor e `aria-pressed` quando selecionado; o selecionado ganha um anel (`ring-2 ring-primary-bright ring-offset-2`) e/ou um check (lucide `Check`) em contraste legivel.
- Area de toque mobile: cada controle com no minimo 44px de alvo efetivo (swatch visual ~28-32px com padding suficiente no botao para `min-h-11 min-w-11`).
- Entrada custom: um controle rotulado "Personalizada" que exibe a cor atual e permite escolher qualquer hex. Implementar como um `<label>` estilizado (aparencia integrada ao resto da UI) envolvendo um `<input type="color">` visualmente contido/estilizado (o picker nativo do SO continua acessivel mas deixa de aparecer "nu"), atualizando via `onChange`. Se o `value` atual nao bater com nenhum swatch, o tile custom aparece selecionado.
- Sempre emite `#RRGGBB` valido (compativel com a validacao zod de `accentColor`). Sem dependencia nova (lucide-react ja instalado).

<tasks>

<!-- planner-discipline-allow: 0D21A1 -->
<!-- planner-discipline-allow: 0A1680 -->
<!-- planner-discipline-allow: F7F9FF -->

<task type="auto">
  <name>Task 1: Fundacao — paleta viva no @theme + logotipo real do Vitrino</name>
  <files>src/app/globals.css, src/components/vitrino-logo.tsx, src/components/auth-layout.tsx, src/components/admin-sidebar.tsx</files>
  <action>
Ler primeiro `.agents/skills/impeccable/reference/colorize.md` (estrategia de cor) e a secao Color de `frontend-design/SKILL.md`.

1. `src/app/globals.css`: adicionar os tokens da secao "Tokens round 2" acima DENTRO do bloco `@theme { ... }` existente, sem remover/editar nenhum token atual e sem tocar nos blocos `@theme inline`, `:root`, `body`, nos keyframes `shake` nem nos `vt-*`. So adicao.

2. Criar `src/components/vitrino-logo.tsx` exatamente conforme a "Spec do logotipo" acima: `VitrinoLogo({ size = 28, className })` renderizando um unico `<svg viewBox="0 0 32 32">` com `currentColor`, `aria-hidden`, conceito de vitrine/janela (moldura arredondada + prateleira/produto ou "V" na moldura), crisp a 28px, sem asset externo. Renderizar mentalmente/no browser em 28px para confirmar que nao vira um borrao.

3. `src/components/auth-layout.tsx`: importar `VitrinoLogo` e substituir o `<div className="h-[30px] w-[30px] rounded-md bg-primary" aria-hidden="true" />` por `<VitrinoLogo size={30} className="text-primary" />` (mantendo o wordmark "Vitrino" ao lado e a estrutura do cabecalho). NAO mexer no painel direito ainda (Task 2).

4. `src/components/admin-sidebar.tsx`: importar `VitrinoLogo` e no `LogoMark()` substituir o `<div className="h-7 w-7 rounded-md bg-primary" aria-hidden="true" />` por `<VitrinoLogo size={28} className="text-primary" />`. Deixar a cor do texto/logo da sidebar como esta nesta task — a virada para tema escuro (logo branco) e feita na Task 3 ajustando a classe de cor.

Guard-rail: nenhuma logica muda; adicao de tokens CSS + novo componente + troca de dois placeholders por `<VitrinoLogo>`.
  </action>
  <verify>
    <automated>cd /Users/ryanlucas/Downloads/VITRINO && grep -q "\-\-color-sidebar:" src/app/globals.css && grep -q "\-\-color-surface-subtle:" src/app/globals.css && grep -q "\-\-color-violet-fg:" src/app/globals.css && grep -q "\-\-color-orange-fg:" src/app/globals.css && grep -q "export function VitrinoLogo" src/components/vitrino-logo.tsx && grep -q "viewBox" src/components/vitrino-logo.tsx && grep -q "currentColor" src/components/vitrino-logo.tsx && grep -q "VitrinoLogo" src/components/auth-layout.tsx && grep -q "VitrinoLogo" src/components/admin-sidebar.tsx && npx tsc --noEmit</automated>
  </verify>
  <done>`globals.css` tem os tokens round 2 no `@theme` (sidebar/surface-subtle/violet/orange/etc.) sem remover nenhum token antigo; `vitrino-logo.tsx` exporta `VitrinoLogo` (SVG `currentColor`, conceito de vitrine, crisp a 28px); auth-layout e admin-sidebar renderizam `<VitrinoLogo>` no lugar do quadrado azul; `npx tsc --noEmit` sem erro novo.</done>
</task>

<task type="auto">
  <name>Task 2: Split-screen do login com produto em acao + fundo do onboarding com caracter</name>
  <files>src/components/auth-layout.tsx, src/app/(admin)/onboarding/onboarding-wizard.tsx</files>
  <action>
Ler primeiro a secao "Design principles"/"Restraint" de `frontend-design/SKILL.md` e `impeccable/reference/product.md` (register produto). Respeitar os absolute bans: sem glassmorphism decorativo por padrao, sem grid decorativo, sem border-radius >=32px em cards (a moldura de celular e um dispositivo — arredondamento de device e permitido), sem imagem/asset externo. Reduced motion obrigatorio em qualquer animacao.

1. `auth-layout.tsx` — painel direito (o `<div className="relative hidden flex-1 ... bg-primary md:flex">`): manter `hidden md:flex` (mobile intacto, zero custo em 4G — e desktop-only e puro CSS). Substituir o bloco atual (so 2 paragrafos) por uma composicao que MOSTRE o produto em acao: um **mockup de vitrine em pura CSS/HTML** — uma moldura de celular (wrapper com a classe marcadora `login-mockup`, arredondada tipo device, borda clara, `shadow-lg`, levemente inclinada com `rotate-[-4deg]` opcional) contendo uma mini-vitrine renderizada em blocos: um header de loja (um `<VitrinoLogo>` pequeno OU um ponto + nome de loja ficticio), um grid 2-colunas de "cards de produto" (retangulos `rounded-lg` com um bloco superior colorido representando a foto — usar tons neutros frios/`surface-panel` e um degrade sutil — mais 2 linhas de texto simuladas e um mini-preco), e uma pilula flutuante verde "Pedir agora" (`bg-whatsapp`) evidenciando o nucleo de valor. Sobrepor as camadas de gradiente radial ja existentes. Manter a headline de valor ("Do WhatsApp para uma vitrine profissional.") e o subtexto em `text-white`, reposicionados (acima ou abaixo do mockup). Se aplicar flutuacao/entrada animada, usar prefixo `motion-safe:` e garantir estado estatico legivel sob `prefers-reduced-motion: reduce`. Todo o mockup e `aria-hidden="true"` (decorativo). NAO tocar no formulario a esquerda nem na logica das telas de auth.

2. `onboarding-wizard.tsx` — dar caracter de marca ao fundo (hoje `<main className="... bg-gray-50 ...">`, card branco liso). Trocar o fundo liso por um **gradiente diagonal suave azul->indigo** derivado da marca (ex.: de `--color-surface-subtle`/`--color-surface-panel` para um tom com `--color-primary`/`--color-primary-bright` em baixa intensidade, ou um leve glow radial azul) — escolhido em vez de dot-grid porque a impeccable trata grid decorativo como anti-padrao; um gradiente de marca e mais limpo e distintivo. Adicionar identidade de marca acima do titulo do card: um `<VitrinoLogo size={40} className="text-primary" />` (importar). O card branco central ganha `shadow-lg` e continua legivel sobre o fundo. NAO alterar o default `accentColor: "#0D21A1"`, o schema, nem a logica de `AsYouType`/`saveOnboarding`/`useForm`. (A troca do campo de cor pelo ColorSwatchPicker acontece na Task 4.)

Contraste: garantir que qualquer texto branco no mockup e o texto do onboarding sobre o gradiente mantenham >=4.5:1 (corpo) / >=3:1 (grande).
  </action>
  <verify>
    <automated>cd /Users/ryanlucas/Downloads/VITRINO && grep -q "login-mockup" src/components/auth-layout.tsx && grep -q "hidden" src/components/auth-layout.tsx && grep -q "md:flex" src/components/auth-layout.tsx && grep -q "VitrinoLogo" 'src/app/(admin)/onboarding/onboarding-wizard.tsx' && grep -q 'accentColor: "#0D21A1"' 'src/app/(admin)/onboarding/onboarding-wizard.tsx' && npx tsc --noEmit</automated>
  </verify>
  <done>Painel direito do login mostra um mockup de vitrine em CSS/HTML (wrapper `login-mockup`, header + grid de cards + CTA verde), `hidden md:flex` preservado, decorativo (`aria-hidden`); onboarding tem fundo com gradiente de marca + `<VitrinoLogo>` acima do card; default `accentColor` e logica intactos; animacoes (se houver) com fallback reduced-motion; `npx tsc --noEmit` sem erro novo.</done>
</task>

<task type="auto">
  <name>Task 3: Sidebar escura (#0A1680) + stat cards semanticos do dashboard</name>
  <files>src/components/admin-sidebar.tsx, src/app/(admin)/(painel)/dashboard/page.tsx</files>
  <action>
Ler primeiro `impeccable/reference/product.md` (segunda camada neutra p/ sidebars) e `reference/colorize.md`. Respeitar o ban de side-stripe borders (os stat cards usam borda cheia tonal, nunca `border-left` colorido).

1. `admin-sidebar.tsx` — virar a navegacao para tema ESCURO (preferencia do usuario, Direcao 5), SEM tocar na logica de `<dialog>`/`.showModal()`/`useEffect`/`matchMedia`/`usePathname`/`signOutAction`:
   - `<aside>` (desktop): trocar `bg-white` por `bg-sidebar` e `border-gray-200` por `border-white/10`.
   - Drawer `<dialog>` (mobile): trocar `bg-white` por `bg-sidebar` (mesma consistencia); manter backdrop e a classe `animate-scale-in`.
   - `NavLinks`: inativo -> `text-white/70 hover:bg-white/10 hover:text-white`; ativo -> `bg-white/15 font-semibold text-white` (em vez de `bg-primary-subtle text-primary`, que some no fundo escuro). Manter `transition-colors duration-150` e os icones herdando `currentColor`.
   - `LogoMark`: trocar `text-gray-900` do wordmark por `text-white` e o `<VitrinoLogo>` para `className="text-white"` (branco sobre o navy).
   - `AccountBlock`: `border-t border-gray-200` -> `border-white/15`; chip de iniciais `bg-gray-100 text-gray-500` -> `bg-white/10 text-white`; nome `text-gray-900` -> `text-white`; "revendedor" `text-gray-500` -> `text-white/60`; botao "Sair da conta" `text-gray-500 hover:text-gray-900` -> `text-white/70 hover:text-white`.
   - A barra de topo mobile (`<div className="flex h-14 ... bg-white ...">` com o hamburguer) PODE ficar clara para separar do conteudo: manter `bg-white`, trocar `border-gray-200` por `border-divider`, e o `<Menu>`/hamburguer em `text-gray-900`; o `<VitrinoLogo>` que porventura exista ali fica `text-primary`. (So o painel de navegacao — aside e drawer — fica escuro.)
   - Conferir contraste: branco e `white/70`+ sobre `#0A1680` passam AA para texto de UI.

2. `dashboard/page.tsx` — dar linguagem semantica aos 4 stat cards (Direcao 8), aplicando a cor no **fundo do icone, na borda do card E na cor do numero** (nunca so no icone, nunca side-stripe). Estender o array `statCards` (linhas ~67-72) para carregar um `tone` por card e derivar as classes:
   - Total de produtos -> azul (marca): borda `border-primary-border`, wrap do icone `bg-primary-subtle` + icone `text-primary`, numero `text-primary`.
   - Disponiveis -> verde: borda `border-success-border`, wrap `bg-success-bg` + icone `text-success-solid`, numero `text-success-fg`.
   - Esgotados -> laranja: borda `border-orange-border`, wrap `bg-orange-bg` + icone `text-orange-solid`, numero `text-orange-fg`.
   - Acessos -> violeta: borda `border-violet-border`, wrap `bg-violet-bg` + icone `text-violet-solid`, numero `text-violet-fg`.
   O icone passa a viver num quadrado arredondado tonal (ex.: `flex h-9 w-9 items-center justify-center rounded-md bg-<tone>-bg`); o numero mantem `font-display font-extrabold text-3xl` mas na cor do tom; o label continua `text-gray-500`; a borda do card usa o `border-<tone>-border` tonal (borda cheia). NAO alterar os valores calculados (`totalProdutos`/`disponiveis`/`esgotados`/`acessos`) nem os `Icon` importados nem qualquer query. So o mapeamento presentacional muda. As secoes "Produtos recentes"/"Mais visualizados"/"Cliques no WhatsApp" ficam como estao.
  </action>
  <verify>
    <automated>cd /Users/ryanlucas/Downloads/VITRINO && grep -q "bg-sidebar" src/components/admin-sidebar.tsx && grep -q "matchMedia" src/components/admin-sidebar.tsx && grep -q "signOutAction" src/components/admin-sidebar.tsx && grep -Eq "text-violet-fg|bg-violet-bg|border-violet-border" 'src/app/(admin)/(painel)/dashboard/page.tsx' && grep -Eq "text-orange-fg|bg-orange-bg|border-orange-border" 'src/app/(admin)/(painel)/dashboard/page.tsx' && grep -q "border-success-border" 'src/app/(admin)/(painel)/dashboard/page.tsx' && npx tsc --noEmit</automated>
  </verify>
  <done>Sidebar (aside + drawer) com `bg-sidebar` (#0A1680), texto/icones brancos, item ativo em `bg-white/15 text-white`, logica de `<dialog>`/`matchMedia`/`signOutAction` intacta; os 4 stat cards com cor semantica propria (azul/verde/laranja/violeta) no fundo do icone + borda + numero, valores calculados inalterados; `npx tsc --noEmit` sem erro novo.</done>
</task>

<task type="auto">
  <name>Task 4: Formularios que respiram + color picker customizado</name>
  <files>src/components/color-picker.tsx, src/app/(admin)/(painel)/configuracoes/settings-form.tsx, src/app/(admin)/(painel)/produtos/product-form.tsx, src/app/(admin)/onboarding/onboarding-wizard.tsx</files>
  <action>
Ler primeiro `impeccable/reference/layout.md` (respiro/ritmo) e `reference/polish.md`. Respeitar os bans (sem reinventar affordances padrao alem do picker pedido; `<select>` nativos estilizados permanecem).

1. Criar `src/components/color-picker.tsx` exatamente conforme a "Spec do color picker" acima: `"use client"`, export `ColorSwatchPicker({ value, onChange, id })`, fileira de swatches predefinidos (marca + acentos) como `<button>` com `aria-pressed`/anel no selecionado, mais um tile custom "Personalizada" (um `<label>` estilizado envolvendo um `<input type="color">` contido) que aparece selecionado quando `value` nao casa com nenhum swatch. Alvo de toque >=44px. Sempre emite `#RRGGBB` valido.

2. "Formularios que respiram" (Direcao 6) — aplicar em `settings-form.tsx`, `product-form.tsx` e `onboarding-wizard.tsx`. Em cada wrapper de secao (`<div className="... rounded-lg border border-gray-200 bg-white p-5">`): trocar `border-gray-200` por `border-divider` e `bg-white` por `bg-surface-subtle` (fundo levemente azulado). Labels de campo: `text-sm font-medium text-gray-700` -> `text-sm font-medium text-ink-navy` (azul-marinho sutil). Inputs/textarea/`<select>`: borda de repouso `border-gray-300` -> `border-field-border` (azulada), mantendo `bg-white` (para o campo destacar sobre a secao tinta) e preservando o foco `focus:border-primary focus:ring-2 focus:ring-primary-subtle`. O onboarding usa a mesma receita nos seus campos. (Fazer a troca por regex/substituicao consistente de classe, sem tocar em `{...register(...)}`, `value`, `onChange`, `id`, `htmlFor`, mensagens de erro nem logica.)

3. Trocar o `<input type="color">` nu pelo `ColorSwatchPicker` em `settings-form.tsx` e `onboarding-wizard.tsx`:
   - Importar `Controller` de `react-hook-form` (dependencia ja instalada) e `ColorSwatchPicker`.
   - Adicionar `control` ao destructuring de `useForm(...)` (settings-form hoje desestrutura `register, handleSubmit, watch, formState`; onboarding-wizard idem — acrescentar `control`).
   - Substituir o bloco `<input id="accentColor" type="color" {...register("accentColor")} className="h-10 w-20 ..." />` por um `<Controller control={control} name="accentColor" render={({ field }) => <ColorSwatchPicker id="accentColor" value={field.value ?? "#0D21A1"} onChange={field.onChange} />} />`. Manter o `<label htmlFor="accentColor">` e a exibicao de `errors.accentColor`. Preservar os defaults de dado `accentColor` e a validacao zod de formato hex — o picker sempre emite hex valido.

Guard-rail: `product-form.tsx` NAO tem campo de cor — nele so muda o respiro das secoes (item 2). Nenhuma Server Action/prop/query muda em nenhum dos tres.
  </action>
  <verify>
    <automated>cd /Users/ryanlucas/Downloads/VITRINO && grep -q "export function ColorSwatchPicker" src/components/color-picker.tsx && grep -q "ColorSwatchPicker" 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx' && grep -q "ColorSwatchPicker" 'src/app/(admin)/onboarding/onboarding-wizard.tsx' && grep -q "Controller" 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx' && grep -q "Controller" 'src/app/(admin)/onboarding/onboarding-wizard.tsx' && grep -q "bg-surface-subtle" 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx' && grep -q "bg-surface-subtle" 'src/app/(admin)/(painel)/produtos/product-form.tsx' && grep -q "text-ink-navy" 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx' && grep -q 'accentColor: store.accentColor ?? "#0D21A1"' 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx' && npx tsc --noEmit</automated>
  </verify>
  <done>`color-picker.tsx` exporta `ColorSwatchPicker` (swatches + custom, integrado via Controller); campo "Cor de destaque" em settings-form e onboarding usa o componente custom (sem picker nativo nu); secoes de settings/produto/onboarding com `bg-surface-subtle` + `border-divider`, labels `text-ink-navy` e inputs `border-field-border`; defaults de dado `accentColor` e validacao preservados; `npx tsc --noEmit` sem erro novo.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
As 8 direcoes do redesign round 2 + color picker customizado: logotipo real do Vitrino (auth + sidebar), paleta viva ampliada, split-screen do login com mockup de vitrine, sidebar escura #0A1680, formularios que respiram (fundo azulado, labels navy), fundo do onboarding com gradiente de marca, stat cards semanticos (azul/verde/laranja/violeta) e ColorSwatchPicker nas Configuracoes.
  </what-built>
  <how-to-verify>
Antes de apresentar, o executor deve rodar o dev server e revisar visualmente (screenshot com as ferramentas de browser das skills impeccable/frontend-design, corrigindo qualquer defeito de contraste/alinhamento/anti-padrao antes de passar ao humano).

1. Rodar `cd /Users/ryanlucas/Downloads/VITRINO && npm run dev` (ou o script equivalente) e abrir o app.
2. **Login** (`/login`): confirmar o logotipo real (nao mais quadrado azul) e o painel direito com o mockup de vitrine (celular + cards + CTA verde), visivel so no desktop (>= md).
3. **Onboarding** (`/onboarding`, logado sem loja): confirmar o fundo com gradiente de marca + logo acima do card, e o campo "Cor de destaque" como swatches + custom (nao o picker nativo nu).
4. **Dashboard** (`/dashboard`): confirmar a sidebar escura #0A1680 com icones/texto brancos e item ativo destacado; os 4 stat cards com cores semanticas distintas (Total azul, Disponiveis verde, Esgotados laranja, Acessos violeta) no icone + borda + numero.
5. **Novo produto** (`/produtos/novo`): confirmar as secoes do formulario com fundo levemente azulado, labels navy e bordas de input azuladas.
6. **Configuracoes** (`/configuracoes`): confirmar o ColorSwatchPicker funcionando (selecionar swatch e cor custom salva) e as secoes que respiram.
7. Testar no viewport mobile (DevTools ~375px): sidebar vira hamburguer -> drawer escuro; login mostra so o formulario (mockup escondido); nada quebra.
8. Confirmar que salvar Configuracoes/Onboarding continua funcionando (fluxo intacto) e que a cor escolhida persiste.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os ajustes visuais desejados.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

Nenhuma nova fronteira de confianca. Mudanca puramente de apresentacao (tokens CSS, className, 2 componentes presentacionais, troca de um input nativo por um wrapper controlado do mesmo dado). Sem nova entrada de usuario, endpoint, dependencia nova (VitrinoLogo/ColorSwatchPicker usam React + lucide-react ja instalado; `Controller` faz parte do `react-hook-form` ja instalado), sem alteracao de fluxo de dados, auth, RLS ou controle.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | Edicao de className/estrutura atingir logica (prop/Server Action/handler/schema) por engano | low | mitigate | Cada task lista guard-rails explicitos (nao tocar em dialog/matchMedia/signOutAction, defaults de dado accentColor, Server Actions, valores calculados dos stat cards); verificacao por `npx tsc --noEmit` + greps que confirmam preservacao de `accentColor: "#0D21A1"` e `signOutAction`/`matchMedia` |
| T-quick-02 | Tampering | ColorSwatchPicker emitir hex invalido e quebrar a validacao zod de accentColor | low | mitigate | Spec exige emissao sempre em `#RRGGBB` valido (swatches fixos + `<input type="color">` que so produz hex); validacao zod de formato preservada como rede de seguranca no submit |
| T-quick-SC | Tampering | npm/pip/cargo installs | n/a | accept | Nenhuma instalacao de pacote — React, lucide-react e react-hook-form (Controller) ja fazem parte das dependencias existentes; sem superficie de supply-chain |
</threat_model>

<verification>
Gate final (rodar apos as 4 tasks de implementacao, a partir de /Users/ryanlucas/Downloads/VITRINO):

1. `grep -q "\-\-color-sidebar:" src/app/globals.css && grep -q "\-\-color-surface-subtle:" src/app/globals.css` — tokens round 2 presentes no @theme.
2. `grep -q "\-\-color-primary: #0D21A1" src/app/globals.css && grep -q "\-\-color-gray-950: #000000" src/app/globals.css` — marca preservada como token primario/preto (round 1 intacto).
3. `grep -q "export function VitrinoLogo" src/components/vitrino-logo.tsx && grep -q "export function ColorSwatchPicker" src/components/color-picker.tsx` — os 2 componentes novos existem.
4. `grep -q "bg-sidebar" src/components/admin-sidebar.tsx` — sidebar escura aplicada.
5. `grep -Eq "text-violet-fg|bg-violet-bg" 'src/app/(admin)/(painel)/dashboard/page.tsx'` — stat cards semanticos.
6. `grep -rnE '"#[0-9A-Fa-f]{6}"' 'src/app/(admin)/onboarding/onboarding-wizard.tsx' 'src/app/(admin)/(painel)/configuracoes/settings-form.tsx'` — deve conter as linhas de DADO preservadas (`accentColor: "#0D21A1"` e `accentColor: store.accentColor ?? "#0D21A1"`), confirmando que os defaults nao foram tocados.
7. `npx tsc --noEmit` — sem erros novos (o unico erro pre-existente conhecido esta em `tests/**/server-cookies.test.ts`, ver STATE.md; nao introduzir outros).
8. (Checkpoint humano — Task 5) validacao visual no browser das 5 telas + mobile, conforme os passos do checkpoint.
</verification>

<success_criteria>
- Logotipo real do Vitrino (SVG de vitrine, `currentColor`) substitui o quadrado azul em auth e sidebar, legivel a 28px.
- Paleta viva ampliada no `@theme` (primary-bright, surface-subtle, divider, field-border, ink-navy, sidebar, violet-*, orange-*, success-border), toda derivada da marca; `#0D21A1`/`#000000` intactos.
- Split-screen do login com mockup de vitrine em CSS/HTML mostrando o produto em acao (`hidden md:flex`, sem asset externo).
- Sidebar escura #0A1680 com icones/texto brancos, distinta do conteudo; drawer mobile consistente; logica intacta.
- Formularios (Configuracoes/Novo produto/Onboarding) respiram: secoes `bg-surface-subtle`, labels `text-ink-navy`, inputs `border-field-border`.
- Fundo do onboarding com gradiente de marca + logotipo, nao mais cinza liso.
- 4 stat cards com cor semantica propria (azul/verde/laranja/violeta) no icone + borda + numero.
- ColorSwatchPicker customizado (swatches + custom) integrado via Controller nas Configuracoes e no Onboarding, preservando o dado e a validacao.
- Nenhum fluxo/rota/prop/Server Action/query/RLS/schema/copy alterado; defaults de dado `accentColor` intactos; `npx tsc --noEmit` limpo; skills impeccable + frontend-design seguidas (contraste, anti-padroes, reduced motion).
</success_criteria>

<scope_note>
Cobertura das 8 direcoes do brief + color picker (nada adiado para outra rodada):
1. Logotipo real -> Task 1 (VitrinoLogo)
2. Paleta viva -> Task 1 (tokens round 2)
3. Diferenciar admin da vitrine publica -> Tasks 2-4 (admin fica mais premium/profissional; vitrine publica sem problemas na auditoria e ja comercial no round 1, deliberadamente NAO tocada)
4. Elevar split-screen do login -> Task 2 (mockup de vitrine)
5. Caracter na sidebar (escura #0A1680) -> Task 3
6. Formularios que respiram -> Task 4
7. Fundo com caracter no onboarding -> Task 2
8. Stat cards semanticos -> Task 3
Extra: color picker customizado -> Task 4

Fora de escopo (deliberado, nao e lacuna): a vitrine publica (`/loja/[slug]/*`) — sem problemas apontados na auditoria e ja tratada no round 1; e as demais paginas de auth (cadastro/esqueci-senha/redefinir-senha) herdam automaticamente o logotipo e o mockup via o `AuthLayout` compartilhado (nenhuma edicao propria necessaria).
</scope_note>

<output>
Create `.planning/quick/260716-osh-redesign-visual-round-2-do-vitrino-conti/260716-osh-SUMMARY.md` when done.
</output>
