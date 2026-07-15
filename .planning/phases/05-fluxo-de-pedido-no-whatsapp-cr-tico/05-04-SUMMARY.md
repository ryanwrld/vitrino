---
phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico
plan: 04
subsystem: whatsapp-order-flow
tags: [nextjs, whatsapp, wa.me, open-graph, server-actions, tailwind]

# Dependency graph
requires:
  - phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico (05-01)
    provides: "Tabela order_clicks (anon insert-only) + policy anon de leitura de store_settings (whatsapp_e164/message_template)"
  - phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico (05-02)
    provides: "buildOrderMessage/buildWhatsAppUrl/decideOrderAction (funções puras testadas), getProductImagePublicUrl"
  - phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico (05-03)
    provides: "queryPublicProductDetail (mapa completo de tamanhos + galeria completa de fotos), ProductCard navegável"
provides:
  - "Rota /loja/[slug]/[produto] — Server Component dinâmico com generateMetadata (Open Graph) + not-found.tsx em português"
  - "ProductOrderPanel — pílulas de tamanho com guard mouse+teclado, 'Pedir agora' (anchor wa.me confiável), 'Copiar pedido'"
  - "logOrderClick — Server Action fire-and-forget anon-callable, insert BARE em order_clicks"
  - "buildProductUrl (src/lib/slug/store-url.ts) — URL da página do produto, usada como link 'Foto:' na mensagem (em vez da URL crua da imagem)"
affects: ["fase-6-metricas (order_clicks já sendo populado)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generateMetadata() por rota para dar Open Graph a uma URL usada como link de preview dentro de uma mensagem externa (WhatsApp) — primeiro uso deste padrão no projeto"
    - "Shake/tooltip de feedback de validação rastreado por-elemento (não global) quando múltiplos CTAs compartilham o mesmo guard"

key-files:
  created:
    - src/app/loja/[slug]/[produto]/page.tsx
    - src/app/loja/[slug]/[produto]/not-found.tsx
    - src/app/loja/[slug]/[produto]/product-order-panel.tsx
    - src/lib/products/order-clicks-actions.ts
  modified:
    - src/app/globals.css
    - src/lib/slug/store-url.ts
    - next.config.ts

key-decisions:
  - "fotoUrl da mensagem de pedido é buildProductUrl(slug, productId) (a página do produto, com Open Graph), NUNCA a URL crua do arquivo de imagem no Storage — achado do checkpoint manual: no iOS, um link wa.me cujo texto termina numa URL image/* dispara o fluxo nativo de 'compartilhar como foto', pulando a composição da mensagem inteira"
  - "'Copiar mensagem' renomeado para 'Copiar pedido' (toast 'Pedido copiado!') e passou a exigir tamanho selecionado (reusa decideOrderAction) — decisão do usuário no checkpoint manual, diverge do UI-SPEC original (que previa cópia da mensagem base mesmo sem tamanho)"
  - "shake/tooltip 'Selecione um tamanho' rastreado por-botão (orderShakeKey/copyShakeKey/tooltipTarget) em vez de um único estado global — achado do checkpoint manual: os dois CTAs sacodiam juntos e o tooltip sempre aparecia só acima do 'Pedir agora'"
  - "productUrl é uma prop nova e separada de coverUrl/galleryUrls — a galeria de fotos continua usando as URLs cruas do Storage normalmente; só o link dentro da mensagem de texto mudou"

patterns-established:
  - "Server Action pública/anônima em arquivo separado de actions.ts (owner-scoped), nunca importa getOwnedStore() — mesma disciplina de public-actions.ts (Fase 4)"

requirements-completed: [PED-01, PED-02, PED-03, PED-04]

coverage:
  - id: D1
    description: "Rota /loja/[slug]/[produto] é Server Component totalmente dinâmico (sem 'use cache'), resolve loja->produto->tamanhos->fotos->store_settings e chama notFound() para inexistente/rascunho/oculto-por-esgotado"
    requirement: "PED-01"
    verification:
      - kind: other
        ref: "npm run build (rota /loja/[slug]/[produto] listada como ƒ dynamic, sem diretiva de cache)"
        status: pass
      - kind: integration
        ref: "tests/storefront/product-detail.test.ts (05-03) — cobre as 4 combinações de queryPublicProductDetail, consumida verbatim por page.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "'Pedir agora' é sempre um <a href> real (nunca disabled); href alterna entre '#' e a URL wa.me real conforme tamanho selecionado; clique válido NÃO chama preventDefault (navegação nativa, nunca window.open)"
    requirement: "PED-01"
    verification:
      - kind: unit
        ref: "tests/products/order-button-guard.test.ts#decideOrderAction (05-02, reusada verbatim pelo componente)"
        status: pass
      - kind: manual_procedural
        ref: "Checkpoint Task 4 — matriz Android Chrome/Samsung Internet/Firefox, iOS Safari/Chrome, Instagram in-app, WhatsApp in-app — aprovado pelo usuário"
        status: pass
    human_judgment: true
    rationale: "Confiabilidade de navegação real em webviews in-app só é verificável em dispositivos físicos — não há jsdom no projeto; a matriz manual do ROADMAP é o bloqueador de encerramento da fase, já executada e aprovada pelo usuário."
  - id: D3
    description: "Pílula de tamanho esgotado tem pointer-events-none + line-through + tabIndex=-1; handler early-returns quando indisponível (bloqueia mouse E teclado Enter/Space, inclusive clique rápido/duplo)"
    requirement: "PED-02"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint Task 4 — critério PED-02 (Tab+Enter/Space, clique rápido/duplo) confirmado em todas as plataformas"
        status: pass
    human_judgment: true
    rationale: "Interação de teclado/toque real só é verificável manualmente; já validada e aprovada no checkpoint da fase."
  - id: D4
    description: "Mensagem de pedido codificada corretamente (encodeURIComponent único sobre a string completa), com acentos preservados; link 'Foto:' aponta pra página do produto (Open Graph) em vez da URL crua da imagem, evitando o desvio de compartilhamento nativo no iOS"
    requirement: "PED-03"
    verification:
      - kind: unit
        ref: "tests/products/order-message.test.ts (05-02) — encoding único, round-trip de acentos, linha de foto presente/ausente"
        status: pass
      - kind: manual_procedural
        ref: "Checkpoint Task 4 — critério PED-03 (nome acentuado, template multi-linha, preview de imagem) confirmado; bug do desvio iOS encontrado e corrigido nesta rodada"
        status: pass
    human_judgment: true
    rationale: "Renderização real da mensagem/preview dentro do app do WhatsApp só é verificável manualmente; o bug do link de foto só foi descoberto por este teste."
  - id: D5
    description: "Clique em 'Pedir agora' sem tamanho dispara shake + tooltip 'Selecione um tamanho' isolados no próprio botão, sem abrir o WhatsApp; repetir rápido re-dispara o shake"
    requirement: "PED-04"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint Task 4 — critério PED-04 confirmado em todas as plataformas; refatoração de shake/tooltip por-botão feita nesta rodada após achado de UX"
        status: pass
    human_judgment: true
    rationale: "Feedback visual/CSS (shake, timing do tooltip) só é verificável observando o dispositivo real; já validado e aprovado no checkpoint."
  - id: D6
    description: "'Copiar pedido' sempre visível, chama copyText como primeiro await, toasts 'Pedido copiado!'/'Não foi possível copiar. Tente novamente.'; logOrderClick registra o clique via insert BARE sem nunca atrasar a navegação ao wa.me"
    verification:
      - kind: integration
        ref: "tests/rls/order-clicks-rls.test.ts (05-01) — insert válido/rejeitado, isolamento cross-tenant do owner"
        status: unknown
      - kind: manual_procedural
        ref: "Checkpoint Task 4 — critérios D-07/D-08/D-10 confirmados (toast, texto colado com URL da página do produto, WhatsApp abre sem delay, linha registrada em order_clicks)"
        status: pass
    human_judgment: true
    rationale: "tests/rls/order-clicks-rls.test.ts não pôde rodar nesta sessão (TEST_SUPABASE_SERVICE_ROLE_KEY inválida no .env.local do worktree, gap de ambiente pré-existente e documentado, não uma falha de código); a cobertura funcional real veio da matriz manual, já aprovada."

# Metrics
duration: ~7min (Tasks 1-3) + sessão de achados/fixes do checkpoint manual (Task 4)
completed: 2026-07-14
status: complete
---

# Phase 5 Plan 4: Fluxo de Pedido no WhatsApp (rota de detalhe + painel + registro de clique) Summary

**Rota `/loja/[slug]/[produto]` dinâmica com `ProductOrderPanel` (pílulas de tamanho com guard mouse+teclado, `<a href>` real ao `wa.me` com `preventDefault` condicional, "Copiar pedido") e `logOrderClick` fire-and-forget — mais um fix crítico descoberto no checkpoint manual: o link "Foto:" da mensagem agora aponta para a própria página do produto (com Open Graph), não para a URL crua da imagem, evitando que o iOS desvie o clique para o fluxo nativo de "compartilhar foto" e pule a mensagem pré-formatada inteira.**

## Performance

- **Duration:** ~7 min para as Tasks 1-3 (implementação original do plano); sessão adicional para os achados/fixes descobertos durante a matriz manual de dispositivos (Task 4, aprovada pelo usuário)
- **Completed:** 2026-07-14
- **Tasks:** 4 (3 `auto` + 1 `checkpoint:human-verify`, todos concluídos)
- **Files modified:** 7 (4 criados nas Tasks 1-3, 3 modificados + 1 dos 4 criados re-modificado nos fixes do checkpoint)

## Accomplishments
- `page.tsx`: Server Component totalmente dinâmico (sem `"use cache"`) que resolve loja→produto→tamanhos→fotos→`store_settings`, com `generateMetadata()` novo (Open Graph) para a própria página do produto
- `not-found.tsx`: primeiro 404 do projeto, copy travada em português, cobre inexistente/rascunho/oculto-por-esgotado com uma única mensagem (sem vazar qual caso é qual)
- `ProductOrderPanel`: pílulas de tamanho (guard mouse+teclado via early-return + `tabIndex=-1`), "Pedir agora" (`<a href>` real, nunca `disabled`, navegação nativa quando válido), "Copiar pedido" (sempre visível, `copyText` como primeiro `await`)
- `logOrderClick`: Server Action anon-callable, insert BARE em `order_clicks` (sem `.select()`), fire-and-forget via `startTransition`, nunca importa `getOwnedStore()`
- **Achados do checkpoint manual (Task 4, ver Deviations):** bug crítico de iOS no link "Foto:" corrigido (`buildProductUrl` + `generateMetadata`), shake/tooltip refatorado de global para por-botão, bug de layout (`w-full` perdido) corrigido, e mudança de copy/comportamento do "Copiar pedido" pedida pelo usuário
- `PED-01`, `PED-02`, `PED-03`, `PED-04` marcados como Completo em `REQUIREMENTS.md` — este é o plano que entrega o comportamento visível ao usuário (05-01/05-02/05-03 deliberadamente não marcaram, conforme já documentado nos respectivos SUMMARYs)

## Task Commits

Each task was committed atomically:

1. **Task 1: ProductOrderPanel (pílulas + Pedir agora + Copiar mensagem)** - `3064aaf` (feat)
2. **Task 2: Rota de detalhe page.tsx (SSR dinâmico) + not-found.tsx** - `960712f` (feat)
3. **Task 3: Server Action logOrderClick (fire-and-forget) + fiação no painel** - `bd9096b` (feat)
4. **Task 4 [CHECKPOINT]: achados e fixes da matriz manual de dispositivos/navegadores** - `dcf218c` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/app/loja/[slug]/[produto]/page.tsx` - Server Component dinâmico + `generateMetadata()` (Open Graph)
- `src/app/loja/[slug]/[produto]/not-found.tsx` - 404 em português, escopado à rota
- `src/app/loja/[slug]/[produto]/product-order-panel.tsx` - pílulas, "Pedir agora", "Copiar pedido", shake/tooltip por-botão
- `src/lib/products/order-clicks-actions.ts` - `logOrderClick()` fire-and-forget, anon-callable
- `src/lib/slug/store-url.ts` - nova `buildProductUrl(slug, productId)`
- `src/app/globals.css` - keyframes `shake` + classe utilitária `.animate-shake`
- `next.config.ts` - `allowedDevOrigins` ganhou IP de rede local usado no checkpoint mobile (entrada de túnel trycloudflare.com removida — já desativado)

## Decisions Made
- `modelo` interpola `product.name` com `product.line` "folded in" via `" - "` quando presente (A1, 05-RESEARCH.md); `solado` cai para string vazia quando `product.sole` é `null` (A2)
- Indicador "Foto N de M" da galeria é rastreado por scroll real (`IntersectionObserver`-like via `onScroll` + `scrollLeft/clientWidth`), não hardcoded — sem analog direto no codebase, decisão do executor para manter o indicador correto
- Ver frontmatter `key-decisions` para as decisões descobertas durante o checkpoint manual (link de foto, copy/comportamento de "Copiar pedido", shake/tooltip por-botão)

## Deviations from Plan

### Auto-fixed Issues

Nenhuma durante a implementação original das Tasks 1-3 — plano executado como escrito.

### Achados e correções do checkpoint manual (Task 4)

Estas NÃO são deviations do executor original — foram descobertas pelo usuário durante a matriz manual obrigatória de dispositivos/navegadores (o próprio propósito da Task 4) e as correções foram aplicadas diretamente pelo orquestrador no worktree, revisadas e commitadas nesta sessão de fechamento do plano.

**1. [Bug crítico, achado no checkpoint] Link "Foto:" cru causava desvio de "compartilhar como foto" no iOS, pulando a mensagem inteira**
- **Found during:** Task 4 (matriz manual — iOS Safari/Chrome/in-app)
- **Issue:** Um link `wa.me` cujo parâmetro `text` termina numa URL que resolve como `image/*` (a URL crua do Storage) dispara o fluxo nativo do iOS de "compartilhar como foto" em vez de abrir a composição de texto — o revendedor nunca via a mensagem pré-formatada (modelo/solado/tamanho/preço), só recebia a foto.
- **Fix:** Nova função `buildProductUrl(slug, productId)` em `src/lib/slug/store-url.ts`; `page.tsx` ganhou `generateMetadata()` (Open Graph: title/description/og:image/og:url) para a própria página do produto; `buildOrderMessage` passou a receber `fotoUrl: productUrl` em vez de `fotoUrl: coverUrl` — o WhatsApp ainda gera preview visual da foto via Open Graph, mas o texto do link é HTML, não uma imagem direta, então o desvio nunca é acionado. `coverUrl`/`galleryUrls` continuam usados normalmente na galeria visual da página.
- **Files modified:** `src/lib/slug/store-url.ts`, `src/app/loja/[slug]/[produto]/page.tsx`, `src/app/loja/[slug]/[produto]/product-order-panel.tsx`
- **Verification:** `npx tsc --noEmit` e `npm run build` limpos; reconfirmado nesta sessão de fechamento; validado no dispositivo real durante o checkpoint (iOS Safari + WhatsApp in-app)
- **Committed in:** `dcf218c`

**2. [Bug de UX, achado no checkpoint] Shake+tooltip globais sacodiam os dois botões juntos**
- **Found during:** Task 4 (matriz manual)
- **Issue:** `shakeKey`/`showTooltip` eram estado único compartilhado — clicar em qualquer um dos dois CTAs sacodia ambos e o tooltip sempre aparecia só acima do "Pedir agora", mesmo quando o clique inválido era no "Copiar pedido".
- **Fix:** Estado dividido em `orderShakeKey`/`copyShakeKey`/`tooltipTarget` ("order" | "copy" | null); cada `<a>`/`<button>` ganhou um wrapper `<div className="relative">` próprio para posicionar seu próprio tooltip; `triggerSizeRequiredFeedback(target)` centraliza a lógica de incrementar a key certa e limpar o tooltip só se ainda for o alvo atual (guarda contra timer antigo apagando um tooltip mais novo).
- **Files modified:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx`
- **Verification:** `npx tsc --noEmit`/`npm run build` limpos; validado no checkpoint em todas as plataformas
- **Committed in:** `dcf218c`

**3. [Bug de layout, achado no checkpoint] `<a>` do "Pedir agora" perdeu `w-full` ao ganhar wrapper individual**
- **Found during:** Task 4 (matriz manual)
- **Issue:** `<a>` é `inline` por padrão — ao ser envolvido no novo wrapper `<div className="relative">` (fix #2), `w-full` parou de ter efeito, encolhendo o botão ao tamanho do texto.
- **Fix:** Adicionada a classe `block` ao `<a>`.
- **Files modified:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx`
- **Verification:** validado visualmente no checkpoint mobile
- **Committed in:** `dcf218c`

**4. [Mudança de comportamento/copy, decisão explícita do usuário] "Copiar mensagem" virou "Copiar pedido" e passou a exigir tamanho selecionado**
- **Found during:** Task 4 (matriz manual)
- **Issue:** N/A — não é um bug, é uma decisão de produto tomada pelo usuário ao ver o fluxo funcionando de verdade no checkpoint. O plano/UI-SPEC originais previam "Copiar mensagem" sempre copiando (mesmo sem tamanho, com o placeholder de tamanho vazio) — o usuário decidiu que copiar um pedido incompleto não fazia sentido, e que "Copiar pedido" é uma label mais clara pro cliente final que "Copiar mensagem".
- **Fix:** Botão renomeado ("Copiar pedido"), toast de sucesso ajustado ("Pedido copiado!"), `handleCopy` agora chama `decideOrderAction(selectedSize)` (mesmo guard do "Pedir agora") e só copia quando há tamanho — sem tamanho, sacode + mostra o tooltip "Selecione um tamanho" (reusando o mesmo `triggerSizeRequiredFeedback`) em vez de copiar.
- **Files modified:** `src/app/loja/[slug]/[produto]/product-order-panel.tsx`
- **Verification:** `npx tsc --noEmit`/`npm run build` limpos; comportamento aprovado pelo usuário no checkpoint
- **Committed in:** `dcf218c`
- **Nota:** este é um desvio intencional do texto travado em `05-UI-SPEC.md` ("Copy-success toast: 'Mensagem copiada!' — locked verbatim by CONTEXT.md D-07"). A trava original refletia a intenção antes do teste real com o usuário; a decisão tomada durante o checkpoint (autoridade máxima do produto) tem precedência. `05-UI-SPEC.md` não foi editado retroativamente — este SUMMARY é o registro canônico da mudança para futuras fases que consultarem a Fase 5.

**5. [Limpeza de configuração, achado no checkpoint] `next.config.ts` com entrada de túnel de desenvolvimento já desativada**
- **Found during:** revisão pós-checkpoint desta sessão
- **Issue:** `allowedDevOrigins` tinha um hostname `trycloudflare.com` de um túnel temporário usado durante parte dos testes manuais, já desativado.
- **Fix:** Entrada removida; IPs de rede local usados no checkpoint mobile foram mantidos.
- **Files modified:** `next.config.ts`
- **Verification:** `npx tsc --noEmit`/`npm run build` limpos
- **Committed in:** `dcf218c`

---

**Total deviations:** 5 (4 achados/fixes do checkpoint manual — 2 bugs reais + 1 bug de layout + 1 mudança de comportamento por decisão explícita do usuário; 1 limpeza de configuração)
**Impact on plan:** Nenhum desvio de escopo do plano original (Tasks 1-3 executadas exatamente como escritas). Os achados da Task 4 são exatamente o valor esperado de um checkpoint de verificação manual real — um bug crítico de confiabilidade no iOS (o próprio risco central desta fase, T-05-11) só era detectável em dispositivo físico, e foi encontrado e corrigido antes do fechamento do plano, não depois.

## Issues Encountered
- `npx vitest run tests/rls/order-clicks-rls.test.ts` falhou com `Invalid API key` ao tentar `seedAuthenticatedAccount` — gap de ambiente pré-existente e já documentado (`TEST_SUPABASE_SERVICE_ROLE_KEY` inválida em `.env.local`, sendo corrigida em sessão paralela separada do usuário), não uma falha de código deste plano. `npx tsc --noEmit` e `npm run build` não são afetados por essa credencial e passaram limpos em toda a execução (só o erro pré-existente e documentado em `tests/supabase/server-cookies.test.ts` permanece).
- `.env.local` e `supabase/.temp` foram copiados do repositório principal para este worktree (ambos gitignored, não commitados) — necessário para rodar build/testes, mesmo precedente já estabelecido pelos planos 05-01/05-02/05-03 desta fase.

## User Setup Required

None - nenhuma configuração externa manual necessária. A migration de `order_clicks`/`store_settings` já foi aplicada em produção pelo Plan 05-01.

## Next Phase Readiness
- Fluxo de pedido no WhatsApp está completo ponta a ponta e validado na matriz manual obrigatória do ROADMAP (bloqueador de encerramento da Fase 5 resolvido)
- `order_clicks` já está sendo populado em produção via `logOrderClick` — pronto para a Fase 6 (métricas) consumir
- `05-UI-SPEC.md` ficou desatualizado em dois pontos pontuais (label/toast de "Copiar mensagem"/"Copiar pedido" e o comportamento de cópia sem tamanho) — este SUMMARY é o registro canônico da divergência; não bloqueia a Fase 6, mas vale considerar uma atualização retroativa do UI-SPEC se ele for reutilizado como referência

---
*Phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico*
*Completed: 2026-07-14*

## Self-Check: PASSED

All created/modified files verified present on disk (`page.tsx`, `not-found.tsx`, `product-order-panel.tsx`, `order-clicks-actions.ts`, `store-url.ts`, this SUMMARY.md) and all 4 task commit hashes (`3064aaf`, `960712f`, `bd9096b`, `dcf218c`) verified present in `git log`.
