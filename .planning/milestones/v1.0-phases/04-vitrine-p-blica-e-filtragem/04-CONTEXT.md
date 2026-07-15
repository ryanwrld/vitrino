# Phase 4: Vitrine Pública e Filtragem - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

O cliente final acessa a vitrine pública via link/slug sem login, filtra produtos por marca/solado/modalidade com o estado dos filtros persistido na URL (abrir a URL filtrada reproduz a mesma visualização), navega por carregamento paginado (~20 por carga) e vê o estado de estoque atualizado — sem layout quebrado por imagem com erro de carregamento.

Esta fase substitui o placeholder público em `src/app/loja/[slug]/page.tsx` (criado na Fase 1, sem nenhuma auth) pela vitrine completa. Só produtos com `status='published'` (D-10 da Fase 3) aparecem aqui.

</domain>

<decisions>
## Implementation Decisions

### Filtros
- **D-01:** UI dos filtros (marca/solado/modalidade) é em **chips/pills sempre visíveis** — toque direto ativa/desativa, sem abrir dropdown ou drawer.
- **D-02:** Múltipla seleção **dentro da mesma categoria** é permitida (ex.: Nike E Adidas ao mesmo tempo) — não é single-select por categoria.
- **D-03:** A vitrine também tem **busca por texto** (nome do modelo), além dos filtros de categoria.
- **D-04:** Os filtros (chips + busca) ficam **fixos/sticky no topo** enquanto o cliente rola a página.

### Paginação
- **D-05:** Mecanismo de paginação é **adaptativo por dispositivo**: botão "Carregar mais" no mobile; paginação numerada (anterior/próxima) no desktop. Mobile-first — o botão "Carregar mais" é o comportamento primário/default; a paginação numerada é a variante desktop.
- **D-06:** Mudar um filtro reinicia a paginação do zero (nunca mantém a posição de rolagem/página anterior).
- **D-07:** Carregar mais produtos é **dinâmico, sem reload completo da página** (VITR-04 já exige isso explicitamente).
- **D-08:** **Nenhum contador de produtos** ("23 produtos") aparece na vitrine pública — esse contador já existe e permanece exclusivo do painel admin (Fase 3). Não duplicar essa UI para o cliente final.

### Visibilidade de Produto Esgotado (extensão de escopo sobre VITR-03)
- **D-09:** A visibilidade de um produto esgotado na vitrine pública é uma **configuração explícita do revendedor**, não um comportamento fixo do sistema. Precisa de:
  - Um campo **por produto** (ex.: `hide_when_sold_out boolean`) editável no cadastro/edição de produto (`product-form.tsx`, Fase 3 — este campo NÃO existia até agora e precisa ser adicionado nesta fase).
  - Uma **preferência global da loja** (ex.: `hide_sold_out_default boolean` em `stores`) configurável em `/configuracoes` (Fase 2 — nova seção nesse formulário).
- **D-10:** Produto **novo** nasce com o padrão "aparece esmaecido/marcado como esgotado" (nunca oculto por padrão) — decisão conservadora, consistente com D-03 da Fase 3 (nunca esconder/mostrar disponibilidade errada por omissão).
- **D-11:** Quando o revendedor muda a preferência **global** da loja, essa mudança **sobrescreve (apaga) as exceções já configuradas produto a produto** — vira uma regra única aplicada a todos os produtos no momento da mudança. Depois disso, o revendedor pode voltar a configurar exceções por produto individualmente até a próxima mudança global.
- **Nota para o planner/pesquisador:** D-09 exige uma migration tocando duas tabelas (`products`, `stores`) e dois formulários de fases já fechadas (Fase 2 `settings-form.tsx`/`configuracoes`, Fase 3 `product-form.tsx`). Isso é esperado e normal — não é reabrir a verificação daquelas fases, é a Fase 4 estendendo schema/UI existente para sua própria necessidade.

### Identidade da Loja no Topo
- **D-12:** Hero **proeminente** no topo da vitrine: logo grande, cor de destaque da loja como fundo/acento, frase de apresentação em destaque — reforça a marca do revendedor antes do catálogo.
- **D-13:** A frase de apresentação (campo opcional desde o onboarding da Fase 1) só renderiza se estiver preenchida — sem espaço vazio quando ausente.

### Claude's Discretion
- Layout exato do grid de produtos (colunas no mobile/desktop, o que aparece no card além de foto/nome/marca/preço) não foi discutido em detalhe — seguir os tokens visuais já travados no PROJECT.md e o padrão de card já estabelecido no painel (Fase 3 `product-list.tsx`) como referência de espaçamento/tipografia, adaptado ao contexto público.
- Estrutura técnica exata da paginação adaptativa (Server Component com `searchParams.page` vs. Client Component com `useState`/Intersection Observer para o "Carregar mais") é decisão de implementação, não do usuário.
- Exato texto/ícone do placeholder de imagem com erro (VITR-05) fica a critério da implementação, seguindo a paleta já travada (`#F5F5F3`/`#6B6B6B`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto do Projeto
- `.planning/PROJECT.md` — Identidade visual (paleta, tipografia), alerta crítico #4 (estoque com delay de segundos), perfis de acesso (cliente final sem login)
- `.planning/REQUIREMENTS.md` §Vitrine Pública — VITR-01 a VITR-05 (requisitos desta fase)
- `.planning/ROADMAP.md` §Phase 4 — Goal, Success Criteria, `Depends on: Phase 2`, `UI hint: yes`

### Fase 3 (dependência direta — dados que esta fase consome)
- `.planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/03-CONTEXT.md` — D-10 (status draft/published, ortogonal a disponível/esgotado); D-11/D-12/D-13 (capa = posição 1, fotos)
- `.planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/03-01-SUMMARY.md` — schema `products`/`product_sizes`/`product_photos`, disponibilidade derivada via EXISTS sobre `product_sizes` (decisão de schema pensada especificamente para esta fase consumir)
- `.planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/03-06-SUMMARY.md` — `src/lib/products/list.ts` (`queryProducts`) já implementa busca/filtro/ordenação server-side para o painel — padrão direto a reaproveitar/espelhar para a vitrine pública
- `src/app/(admin)/produtos/product-form.tsx` — formulário de produto onde o novo campo `hide_when_sold_out` (D-09) precisa ser adicionado
- `src/lib/products/actions.ts` — `saveProduct`/`updateProduct`, precisam persistir o novo campo

### Fase 2 (dependência — configuração da loja)
- `.planning/phases/02-link-compartilh-vel-da-vitrine/02-CONTEXT.md` — D-05/D-06/D-07 (rota `/configuracoes`, formulário único por seções)
- `src/app/(admin)/configuracoes/settings-form.tsx` — formulário onde a nova preferência global `hide_sold_out_default` (D-09) precisa ser adicionada
- `src/lib/settings/actions.ts` — action de salvar configurações da loja, precisa persistir o novo campo

### Fase 1 (placeholder a substituir)
- `src/app/loja/[slug]/page.tsx` — placeholder público sem auth (comentário no arquivo já documenta que a Fase 4 o substitui); preservar a garantia estrutural de "nunca bloqueado por auth" ao reescrever

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/products/list.ts` (`queryProducts`) — já implementa filtro por status/brand/sole + busca ilike + ordenação + disponibilidade derivada para o painel admin (Fase 3 P06); a query pública precisa da mesma forma, adaptada para escopo público (sem owner-scoping por auth, filtrando só `status='published'`) e com paginação
- `src/lib/hooks/use-debounce.ts` — hook de debounce já usado no slug-editor e no product-toolbar do painel; reaproveitável na busca por texto da vitrine (D-03)
- `next/image` com `images.remotePatterns` já configurado para o host do Supabase Storage (`next.config.ts`) — mesma infra de imagem pública já funciona para fotos de produto na vitrine

### Established Patterns
- searchParams como fonte única de verdade para filtros (padrão já estabelecido no painel admin na Fase 3 P06, `ProductToolbar` nunca mantém estado próprio) — mesmo padrão deve se aplicar aqui para os filtros da vitrine pública
- Renderização totalmente dinâmica (sem `"use cache"`) para refletir estoque com delay de segundos (mandato do CLAUDE.md/PROJECT.md) — a página da vitrine não deve cachear a lista de produtos

### Integration Points
- Novo campo `hide_when_sold_out` em `products` e `hide_sold_out_default` em `stores` (D-09) — exige migration nova e touca formulários de Fases 2 e 3 já fechadas (ver nota em `<decisions>`)
- `src/app/loja/[slug]/page.tsx` precisa resolver a store pelo slug (RLS/policy pública já definida na Fase 1) e listar produtos publicados dessa store

</code_context>

<specifics>
## Specific Ideas

- Paginação deve se comportar diferente por dispositivo (D-05) — não é a mesma UI para mobile e desktop, ao contrário do resto do projeto que costuma ser um único layout responsivo.
- O contador de produtos é explicitamente um recurso "só do lojista" (painel admin) — não deve vazar para a experiência do cliente final.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. A extensão de escopo em D-09/D-10/D-11 (visibilidade de esgotado configurável) é uma clarificação de COMO a Fase 4 exibe o estado de estoque (VITR-03), não uma nova capacidade fora do domínio desta fase.

</deferred>

---

*Phase: 4-Vitrine Pública e Filtragem*
*Context gathered: 2026-07-13*
