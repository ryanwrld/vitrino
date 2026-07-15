# Phase 6: Métricas e Dashboard - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

O revendedor consegue visualizar, numa única página `/dashboard`, um resumo do estado da loja (total de produtos, disponíveis, esgotados, acessos) e uma lista de produtos recentes, além de métricas de desempenho por produto (produtos mais visualizados, cliques no botão "Pedir agora" por produto) — agregando eventos coletados nas Fases 4 e 5.

**Descoberta crítica de escopo:** nenhuma tabela ou mecanismo de pageview/acesso existe hoje no codebase, apesar do ROADMAP dizer `Depends on: Phase 4 (pageviews)`. A Fase 4 construiu a vitrine pública mas nunca implementou captura de acesso — não há tabela, Server Action nem coluna de contador em lugar nenhum. Esta fase precisa criar esse mecanismo de captura do zero (schema, RLS, fire-and-forget insert), simetricamente ao que a Fase 5 já fez para `order_clicks` (D-09/D-10 do `05-CONTEXT.md`). `order_clicks` (cliques em "Pedir agora") já existe e só precisa ser consumida/agregada nesta fase, não criada.

O dashboard atual em `src/app/(admin)/dashboard/page.tsx` é um placeholder deliberado da Fase 1 ("Métricas reais e conteúdo completo chegam na Fase 6" — comentário já existente no arquivo) e será substituído.

</domain>

<decisions>
## Implementation Decisions

### O que conta como "acesso" (rastreamento de pageview — a criar do zero)
- **D-01:** "Acessos" (contador geral exibido no card do dashboard) conta **apenas** carregamentos do grid principal da vitrine (`/loja/[slug]`). Visitar a página de detalhe de um produto específico (`/loja/[slug]/[produto]`) **não** soma nesse contador geral — é um evento de pageview separado, que alimenta exclusivamente a métrica "produtos mais visualizados" (ver D-08/D-09).
- **D-02:** Trocar filtro ou termo de busca na vitrine (navegação client-side dentro da mesma página, sem novo carregamento de rota) **não** conta como um novo acesso — só o carregamento inicial da página soma.
- **D-03:** Todos os números de métrica (acessos, produtos mais visualizados, cliques WhatsApp por produto) são **totais desde sempre (all-time)** — sem janela de tempo/data (sem "últimos 7/30 dias"). Consistente com o precedente do PROJECT.md/REQUIREMENTS.md de "contagem simples de eventos" — analytics avançado (funis, retenção, cohort, janelas de tempo) está explicitamente fora de escopo do MVP.

### Layout: uma página só + sidebar de navegação global
- **D-04:** Dashboard (`/dashboard`) é **uma única página** contendo tudo: cards de resumo (total de produtos, disponíveis, esgotados, acessos), lista de produtos recentes, e a seção de desempenho por produto (mais visualizados, cliques WhatsApp por produto). Não existe uma página `/metricas` separada.
- **D-05 (escopo ampliado, decisão explícita do usuário):** Esta fase também cria uma **sidebar de navegação compartilhada** para todo o painel admin (Dashboard/Produtos/Configurações), substituindo a navegação ad-hoc atual (botões soltos no dashboard placeholder). Isso foi sinalizado como maior que o escopo nominal de "Métricas e Dashboard" (afeta o layout do admin inteiro, não só o dashboard), e o usuário confirmou explicitamente que quer incluir de qualquer forma nesta fase, em vez de adiar.
- **D-06:** Comportamento responsivo da sidebar: **desktop** = sidebar fixa lateral; **mobile** = colapsa em menu hambúrguer (ícone que abre drawer/overlay com os mesmos links) — mobile-first, consistente com os demais padrões de navegação já usados no projeto (ex.: chips sticky da vitrine).
- **D-07:** Itens da sidebar: **Dashboard, Produtos, Configurações**, com **"Sair da conta" fixado no rodapé**, separado visualmente dos links de navegação de página. `signOutAction` (já existe em `src/lib/auth/actions.ts`) é reaproveitado, não recriado.

### "Produtos mais visualizados" — critério e quantidade
- **D-08:** Ranking de "produtos mais visualizados" é **contagem direta de pageviews por produto** (`COUNT(*) GROUP BY product_id` sobre o evento de pageview de produto criado em D-01), sem combinar com cliques de WhatsApp num score/fórmula ponderada. Explicitamente rejeitado: qualquer fórmula de "score de interesse" combinando visualizações + cliques — decisão consciente de manter a lógica direta e sem peso arbitrário, alinhada ao mandato de "contagem simples" do PROJECT.md.
- **D-09:** "Cliques no botão WhatsApp por produto" é uma métrica separada e paralela (não um critério de ranking), derivada de `COUNT(*) GROUP BY product_id` sobre `order_clicks` (tabela já existente da Fase 5). Aparece como sua própria lista/coluna no dashboard, lado a lado com "mais visualizados", nunca fundida num único número.
- **D-10:** Ambas as listas ("mais visualizados" e "cliques WhatsApp por produto") mostram **Top 10** produtos.

### Claude's Discretion
- Estrutura exata da nova tabela de pageview (nome da tabela, colunas, índices, se é uma tabela única com `product_id` nullable ou duas tabelas separadas) fica a critério do research/planning — mesmo tratamento dado a `order_clicks` na Fase 5 (D-09 do `05-CONTEXT.md`), desde que capture o essencial (store_id, product_id opcional, timestamp) e respeite RLS multi-tenant (owner lê só os próprios dados; `anon` só insere, nunca lê — mesmo padrão de `order_clicks`).
- "Lista de produtos recentes" no dashboard — critério exato de ordenação (mais recente por `created_at`) e quantidade exibida ficam a critério da implementação; reaproveitar o padrão de ordenação "mais recente" já estabelecido no painel de produtos (Fase 3, `queryProducts`/`list.ts`).
- Estilo visual exato dos cards de resumo, da sidebar e do menu hambúrguer fica a critério do design, seguindo os tokens visuais já travados no PROJECT.md (paleta, tipografia, radius) e os padrões de UI já estabelecidos no painel admin.
- Mecanismo exato de captura do pageview (client-side fetch/beacon vs. Server Component registrando no próprio render da página) é decisão técnica de research/planning, não do usuário — o que foi decidido é o COMPORTAMENTO (o que conta como acesso, D-01/D-02), não a implementação.
- Dado que a loja pode ter zero acessos/produtos (loja nova), o comportamento de estado vazio dos cards/listas (mostrar "0" vs. mensagem de empty state) fica a critério do design, seguindo os padrões de empty state já estabelecidos no painel (Fase 3).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto do Projeto
- `.planning/PROJECT.md` — identidade visual (paleta, tipografia, radius), "Analytics avançado" listado explicitamente em Out of Scope (contagem simples de eventos é suficiente no MVP)
- `.planning/REQUIREMENTS.md` §Métricas — MTR-01, MTR-02 (requisitos desta fase); §Métricas (pós-MVP) — MTR-v2-01 (rastreamento de clique granular por funil, explicitamente fora de escopo aqui)
- `.planning/ROADMAP.md` §Phase 6 — Goal, Success Criteria, `Depends on: Phase 4 (pageviews), Phase 5 (cliques no WhatsApp)`, `Mode: mvp`, `UI hint: yes`

### Fase 5 (dependência direta — dado que esta fase consome, não recria)
- `.planning/phases/05-fluxo-de-pedido-no-whatsapp-cr-tico/05-CONTEXT.md` — D-09 (schema/RLS de `order_clicks`, "sem UI/dashboard nesta fase — só captura o dado bruto para a Fase 6 consumir"), D-10 (padrão fire-and-forget)
- `supabase/migrations/0005_order_clicks_and_public_whatsapp.sql` — schema real de `order_clicks` (store_id, product_id, size, created_at); RLS: owner SELECT via `store_id in (select id from stores where owner_id = auth.uid())`, `anon` só INSERT (sem SELECT para anon, por design)
- `src/lib/products/order-clicks-actions.ts` (`logOrderClick`) — padrão de referência para a nova Server Action de registro de pageview: fire-and-forget, try/catch só com `console.error`, insert BARE sem `.select()` (papel `anon` não tem policy de leitura)

### Fase 4 (vitrine pública — onde o pageview precisa ser instrumentado)
- `src/app/loja/[slug]/page.tsx` — página do grid público; ponto de instrumentação do pageview "acesso à vitrine" (D-01)
- `src/app/loja/[slug]/[produto]/page.tsx` — página de detalhe de produto; ponto de instrumentação do pageview de produto (D-01, alimenta "mais visualizados")
- `src/lib/products/public-list.ts` (`queryPublicProducts`, `isVisible`) — padrão de query pública já estabelecido, reaproveitável para agregações
- `src/lib/products/public-detail.ts` (`queryPublicProductDetail`) — padrão de query pública single-row, mesma disciplina de arquivo separado do owner-scoped

### Painel Admin (dashboard placeholder a substituir + navegação a criar)
- `src/app/(admin)/dashboard/page.tsx` — placeholder atual da Fase 1 (`requireCompletedOnboarding`, saudação, atalhos, logout) a ser substituído pelo dashboard real desta fase; comentário no próprio arquivo já antecipa "Métricas reais e conteúdo completo chegam na Fase 6"
- `src/app/(admin)/layout.tsx` — layout compartilhado do route group admin; ponto de integração da nova sidebar (D-05/D-06/D-07)
- `src/lib/auth/actions.ts` (`signOutAction`) — action de logout já existente, reaproveitada no rodapé da sidebar (D-07), nunca recriada
- `src/lib/products/list.ts` (`queryProducts`) — padrão de query owner-scoped (filtro/ordenação/paginação) já estabelecido no painel de produtos (Fase 3), referência para "produtos recentes" e para os contadores de total/disponível/esgotado

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/products/order-clicks-actions.ts` (`logOrderClick`) — template de Server Action fire-and-forget pública, a espelhar para o novo evento de pageview
- `src/app/(admin)/dashboard/page.tsx` — já tem o gate `requireCompletedOnboarding()` funcionando; mantido ao reescrever a página
- `src/lib/auth/actions.ts` (`signOutAction`) — reaproveitado no rodapé da sidebar

### Established Patterns
- Tabela de evento mínima com RLS "owner lê, anon só insere" (padrão `order_clicks`, Fase 5) — mesmo padrão a seguir para a nova tabela de pageview
- Toda `create table` é imediatamente seguida de `enable row level security` e sua `create policy` na mesma migration, nunca separado (regra não-negociável herdada de `05-RESEARCH.md`/`03-RESEARCH.md`)
- Renderização totalmente dinâmica (sem `"use cache"`) — os componentes de dashboard/vitrine leem direto do Supabase a cada requisição, sem cache (mandato do CLAUDE.md, já seguido em todas as fases anteriores)
- Server Components owner-scoped autenticados (painel) vs. Server Actions públicas `anon` — sempre arquivos separados, nunca uma função compartilhada entre os dois contextos (padrão de `list.ts` vs. `public-list.ts`/`order-clicks-actions.ts`)

### Integration Points
- Nova tabela de pageview (nome exato a definir no planning) precisa de migration nova, seguindo a numeração sequencial (`0006_...sql`)
- `src/app/loja/[slug]/page.tsx` e `src/app/loja/[slug]/[produto]/page.tsx` precisam disparar o registro de pageview (fire-and-forget, sem bloquear render)
- `src/app/(admin)/dashboard/page.tsx` é reescrito do zero para consumir as agregações (cards de resumo + recentes + mais visualizados + cliques por produto)
- `src/app/(admin)/layout.tsx` precisa da nova sidebar/hambúrguer envolvendo todas as páginas do route group `(admin)`

</code_context>

<specifics>
## Specific Ideas

- Exemplo dado pelo usuário ao pedir a sidebar: quer navegação estruturada (Dashboard/Produtos/Configurações) em vez dos botões soltos atuais, com comportamento hambúrguer no mobile — sem especificar biblioteca ou estilo visual exato, deixado a critério da implementação.

</specifics>

<deferred>
## Deferred Ideas

- Página `/metricas` separada do dashboard — considerada e descartada nesta discussão em favor de uma página única (D-04). Pode ser revisitado no futuro se o dashboard ficar sobrecarregado.
- Score/ranking combinado de "interesse" (visualizações + cliques ponderados) — considerado e explicitamente rejeitado (D-08) por adicionar complexidade de fórmula sem dado histórico para calibrar; mantém-se com contadores diretos e separados.
- Janela de tempo configurável para métricas (últimos 7/30 dias) — considerada e descartada (D-03) em favor de totais all-time, mais simples e alinhado ao MVP.

None — nenhuma outra ideia de escopo novo surgiu fora do que está registrado acima.

</deferred>

---

*Phase: 6-Métricas e Dashboard*
*Context gathered: 2026-07-15*
