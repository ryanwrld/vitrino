# Ajustes finais de UI/UX do MVP — Vitrino

## Contexto

Este documento consolida duas auditorias independentes de UI/UX feitas em **2026-07-16** sobre o código-fonte do Vitrino (painel admin, vitrine pública e fluxos de auth/onboarding), antes de começar qualquer correção visual. Nenhum ajuste desta lista foi aplicado ainda no momento em que este documento foi criado — é um checklist vivo para acompanhar o progresso ao longo das próximas sessões.

**Origem dos achados:**
- **Auditoria 1 (Claude, leitura via agentes de exploração)**: focada em comportamento/estado/acessibilidade — contraste, atributos `aria-*`, estados de loading/erro/vazio, consistência de padrão entre telas.
- **Auditoria 2 (trazida pelo usuário)**: focada em acabamento visual e identidade de produto — página raiz sendo o boilerplate do `create-next-app`, `lang="en"`, fonte carregada mas nunca aplicada, ausência de marca no onboarding/login, cor de destaque sem curadoria, animação quase inexistente.
- Os 3 achados mais graves da Auditoria 2 foram **verificados diretamente no código** (não só por inferência de `className`): `src/app/page.tsx`, `src/app/layout.tsx:29`, `src/app/globals.css:19` — todos confirmados linha por linha.

**Contexto adicional relevante:** a paleta de cores foi trocada mecanicamente de verde para azul em 2026-07-15 (`.planning/quick/260715-du7-rebrand-de-cores-substituir-a-paleta-ver/`). Os hex continuam **hardcoded e espalhados** pelo código (não tokenizados) — só a cor mudou, a dívida estrutural do achado "paleta 100% em hex" permanece.

## Legenda

- `[ ]` pendente
- `[x]` corrigido — anotar `commit` e `data` ao marcar

---

## 1. Bloqueadores de lançamento (prioridade máxima)

- [ ] **`src/app/page.tsx` é o boilerplate do `create-next-app`, não o Vitrino.** Logo do Next.js, texto "To get started, edit the page.tsx file.", botões "Deploy Now"/"Documentation" apontando pra vercel.com/nextjs.org. Sem redirect pra `/login`, sem nenhuma menção ao Vitrino. Quem acessa o domínio raiz sem saber o link `/loja/[slug]` cai numa página que parece abandonada. Verificado.
- [ ] **`<html lang="en">` num produto 100% em português.** `src/app/layout.tsx:29`. Quebra pronúncia de leitor de tela e a heurística de tradução automática do navegador. Verificado.
- [ ] **Fonte Geist é carregada mas nunca renderizada — o app inteiro usa Arial.** `layout.tsx` importa `Geist`/`Geist_Mono` do Google Fonts e define `--font-geist-sans`/`--font-geist-mono`; `globals.css:12-13` mapeia isso pra `--font-sans`/`--font-mono` via `@theme inline`; mas `globals.css:19` sobrescreve `body { font-family: Arial, Helvetica, sans-serif; }` direto, ignorando a variável. Resultado: banda desperdiçada baixando a fonte, e a tipografia pensada pro produto nunca aparece na tela. Verificado.
- [ ] **WhatsApp não configurado quebra o botão de pedido sem nenhum aviso.** `product-order-panel.tsx:111` (`page.tsx:111` da rota de produto): se `whatsapp_e164` não foi configurado pelo revendedor, o link vira `wa.me/?text=...` sem número — o cliente clica, o WhatsApp abre com erro genérico, e o pedido não acontece. É o core value do produto quebrando silenciosamente.
- [ ] **Contraste `#FF4D4D` (~3.27:1) reprova WCAG AA (4.5:1) e é usado como texto sistematicamente.** Erros de validação e botões destrutivos em quase todo formulário do painel: `settings-form.tsx:96,123,138,173,187`, `product-form.tsx:155,174,189,205,285,326`, `product-list.tsx:172`, `slug-editor.tsx:154,185`.

## 2. Identidade visual / design system

- [x] Login, cadastro e onboarding são idênticos e sem nenhuma marca (sem logo, sem cor de fundo, sem nada que diga "isso é o Vitrino") — momento decisivo de confiança do revendedor, tela comunica zero identidade. — corrigido (quick-260716-0z2, Task 2), 2026-07-16
- [ ] Hero da vitrine pública usa preto puro (`#000000`) como fallback (`store-hero.tsx:25`), desconectado do azul (`#0D21A1`) usado como cor de ação em todo o resto do app — duas "cores de marca" diferentes na mesma tela quando a loja não configura `accent_color`.
- [x] Seletor de "cor de destaque" é o color picker nativo do SO, sem curadoria, sem swatches sugeridos, sem preview de como a cor vai ficar no hero da vitrine (`onboarding-wizard.tsx:109-118`, `settings-form.tsx`) — revendedor escolhe às cegas. — corrigido (quick-260716-0z2, Task 2), 2026-07-16
- [ ] Paleta 100% em hex cru repetido centenas de vezes (`text-[#111111]`, `text-[#6B6B6B]`, `border-[#E7F2FD]`, `bg-[#0D21A1]`, `text-[#FF4D4D]`), nunca um token Tailwind — nenhuma fonte única de verdade, cada arquivo redefine as mesmas strings.
- [x] Animação praticamente inexistente — só o "shake" de erro em `globals.css`. Troca de filtro/página é corte seco; `<dialog>` nativo (menu mobile, confirmações) abre/fecha sem fade/slide/scale; transições de cor/opacidade existem na classe CSS mas não produzem movimento perceptível em nenhum outro lugar. — corrigido (quick-260716-0z2, Task 3), 2026-07-16
- [x] Componentes nativos não estilizados quebram a coerência entre plataformas: todo `<select>` (marca, solado, categoria, status, ordenação) é o dropdown nativo do navegador sem seta customizada; `<dialog>` tem estilização mínima (sombra/foco variam por navegador). — corrigido (quick-260716-0z2, Task 3), 2026-07-16

## 3. Acessibilidade

- [ ] Chips de filtro da vitrine (`product-filters.tsx:70`) com ~26-30px de altura real, abaixo do mínimo de toque (44px).
- [ ] Link "Voltar" na página de produto (`product-order-panel.tsx:209-212`) sem altura mínima de toque.
- [ ] Grade de tamanhos com 3 estados visuais mas `aria-pressed` binário (`size-grid.tsx:114`) — "esgotado" x "disponível" não é comunicado a leitor de tela.
- [ ] Todas as fotos no uploader de produto têm `alt=""` vazio (`photo-uploader.tsx:308,311`), mesmo com `product.name` disponível pra compor um alt real.
- [ ] Item ativo da navegação lateral sem `aria-current="page"` (`admin-sidebar.tsx:32-42`).
- [ ] Campo "R$" do preço não amarrado ao input via `aria-describedby` (`product-form.tsx:270-286`).
- [ ] Botão "Pedir agora" desabilitado não é de fato desabilitado: `href="#"` + `preventDefault()`, sem `aria-disabled` nem explicação pra leitor de tela.
- [ ] Erro "Selecione um tamanho" é só visual (tooltip + shake) — sem `role="alert"`/`aria-live`.

## 4. Estados ausentes (loading / erro / vazio)

- [ ] Nenhuma rota do painel ou da vitrine tem `loading.tsx`/`error.tsx` — em conexão lenta (cenário mais comum do cliente final via link de WhatsApp/Instagram no 4G), a tela fica branca até tudo carregar.
- [ ] Nenhum skeleton de imagem em lugar nenhum — enquanto carrega, é só uma caixa azul-clara vazia (`image-with-fallback.tsx:30-37`).
- [ ] Toast de sessão expirada usa `duration: Infinity` (`session-watcher.tsx:29`) sem garantir botão de fechar visível em mobile — pode travar a UI permanentemente.
- [ ] Falha de query cai no error boundary genérico do Next, sem identidade visual nem mensagem em português.
- [ ] Tooltip de "Selecione um tamanho" é uma caixa flutuante desconectada (`product-order-panel.tsx:267-271`), sem seta apontando pro botão, sem tratamento de colisão com a borda da viewport.
- [ ] Empty states genéricos e intercambiáveis — mesma caixa tracejada cinza sem ícone/ilustração em todas as telas vazias e no 404 de produto.

## 5. Hierarquia visual / feedback de formulário

- [x] Erro de formulário só aparece como texto vermelho pequeno abaixo do campo — a borda do input não muda de cor no erro, em nenhum formulário do app (login, cadastro, onboarding, settings, produto). Único estado visual do input é `focus:border-[#0D21A1]`. — corrigido (quick-260716-0z2, Task 1), 2026-07-16
- [x] "Pedir agora" (ação primária) e "Copiar pedido" (secundária) têm mesmo tamanho/raio/largura — a única diferença é fundo cheio vs. contorno. Distinção fraca demais pra ação que define o valor do produto. — corrigido (quick-260716-0z2, Task 1), 2026-07-16
- [x] Pílulas de tamanho "disponível-não-selecionado" vs. "selecionado" diferem pouco (borda-fina vs. fundo-cheio), enquanto "esgotado" empilha três sinais ao mesmo tempo (fundo claro + texto cinza + line-through + opacity-60) — desproporcional considerando que selecionado/disponível é o par que mais precisa ser óbvio. — corrigido (quick-260716-0z2, Task 1), 2026-07-16
- [x] Preço na página de detalhe usa a mesma escala de fonte pequena (`text-sm`) do metadado secundário "marca · linha" — sem destaque, quebra expectativa básica de e-commerce. — corrigido (quick-260716-0z2, Task 1), 2026-07-16

## 6. Inconsistência de design system

- [x] Botão de logout é o único submit do painel sem estado de "carregando" (`admin-sidebar.tsx:87-90,126-129`) — clique duplo pode disparar duas submissões. — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] Botão "Salvar alterações" de Configurações não é full-width (`settings-form.tsx:195`), diferente de todo outro CTA primário do painel. — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] QR Code panel usa dois estilos de botão diferentes pra duas ações equivalentes (baixar = outline preto, copiar = preenchido azul). — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] Nenhuma cor distingue "Publicado" de "Rascunho" na lista de produtos (`product-list.tsx:128-130`) — mesma pill cinza pros dois. — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] Duplicação confirmada pelo próprio comentário do código entre `onboarding-wizard.tsx` e `configuracoes/settings-form.tsx` — mesmos campos, escritos do zero. — corrigido (quick-260716-0z2, Task 5), 2026-07-16
- [x] `PaginationNumbered` não tem números — só Anterior/Próxima, nome não bate com o comportamento. — corrigido (quick-260716-0z2, Task 5), 2026-07-16
- [x] `text-[28px]` hardcoded nos stat cards do dashboard (`dashboard/page.tsx:85`), fora da escala tipográfica do Tailwind. — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] "Onboarding wizard" não tem indicador de progresso, apesar do nome sugerir multi-etapa. — corrigido (quick-260716-0z2, Task 5), 2026-07-16
- [x] Páginas de login/cadastro/esqueci-senha usam `<a href>` em vez de `<Link>`, forçando reload completo — único ponto do app assim. — corrigido (quick-260716-0z2, Task 5), 2026-07-16
- [x] Publicar/despublicar produto (efeito público imediato) não tem confirmação, mas excluir produto e trocar slug têm. — corrigido (quick-260716-0z2, Task 5), 2026-07-16
- [x] Marca do produto some na página de detalhe — só aparece no card do grid. — corrigido (quick-260716-0z2, Task 4), 2026-07-16
- [x] Nav ativo na sidebar é só borda de 2px + cor de texto (`admin-sidebar.tsx:36-39`), muito sutil, enquanto o resto do app usa pílulas cheias pra indicar seleção (filtros, tamanhos) — dois sistemas de "selecionado" diferentes convivendo no mesmo produto. — corrigido (quick-260716-0z2, Task 5), 2026-07-16

## 7. Responsividade / desktop

- [ ] Zero breakpoints `lg:`/`xl:` em todo o painel — conteúdo travado em `max-w-md`/`max-w-2xl` mesmo em telas grandes, sidebar deixa um vazio enorme que cresce com a largura da tela.
- [ ] Form de produto é uma rolagem vertical de 8 seções sem sumário nem progresso.
- [ ] Grid de fotos fixo em 5 colunas sem breakpoint (`photo-uploader.tsx:248`) — aperta em telas de 320px.
- [ ] Canvas do QR code fixo em 240×240px sem `max-w-full` (`qr-code-panel.tsx:75`).
- [ ] Galeria de fotos sem setas de navegação, só swipe — ruim pra desktop (mouse não faz gesto de swipe confortável).

## 8. Detalhes mobile específicos

- [ ] Alça de reordenar foto é um círculo de 24px com fundo `bg-white/85` sobre a miniatura — em fotos de produto claras (chuteiras brancas/creme são comuns no nicho), o contraste fica baixo e não há texto visível indicando que dá pra arrastar (só `aria-label`, invisível).
- [ ] Galeria de fotos da página de produto não tem indicador de posição visível sobre a imagem (dots) — só legenda de texto cinza pequeno "Foto 2 de 3" abaixo (`product-order-panel.tsx:230-233`).
- [ ] Altura do hero da vitrine varia dependendo se a loja preencheu "frase de apresentação" (`store-hero.tsx:31`, `<p>` condicional sem altura reservada) — fonte de layout shift em conexão lenta.

## 9. Outros pontos menores

- [ ] Nenhum footer em nenhuma tela da vitrine pública.
- [ ] Sem indicador de filtros ativos nem botão "limpar filtros" na vitrine — só dá pra desmarcar chip por chip.
- [ ] Editar produto inexistente redireciona silenciosamente (`[id]/editar/page.tsx:51-53`), sem toast explicando o motivo.
- [ ] Tela de redefinir senha sem nenhum link de saída se a sessão de recovery expirar.
- [ ] Regras de senha só aparecem depois do erro, nunca antes.
- [ ] Campo de logo em Configurações não mostra preview da imagem atual nem da nova antes de salvar.
- [ ] Diálogo de exclusão de produto é compartilhado entre todos os itens da lista — cliques rápidos em produtos diferentes podem piscar o nome errado por um frame.

---

## Fontes

- Auditoria 1: leitura integral via 2 agentes de exploração (`src/app/(admin)/**`, `src/components/**`, `src/app/loja/[slug]/**`), 2026-07-16.
- Auditoria 2: leitura estática trazida pelo usuário, com os 3 achados mais graves re-verificados diretamente no código nesta sessão (`src/app/page.tsx`, `src/app/layout.tsx:29`, `src/app/globals.css:19`).
- Nenhum arquivo de código foi modificado até a criação deste documento.

## Como usar este documento

Atualizar marcando `[x]` conforme cada item for corrigido, anotando commit e data ao lado do item. Não é um artefato estático — deve refletir o estado real do código a cada sessão de trabalho nesta lista.
