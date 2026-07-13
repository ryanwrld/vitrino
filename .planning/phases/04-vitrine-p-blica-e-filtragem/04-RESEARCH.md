# Phase 4: Vitrine Pública e Filtragem - Research

**Researched:** 2026-07-13
**Domain:** Next.js 16 App Router (Server/Client Components, searchParams, Cache Components), Supabase Postgres RLS (leitura pública anônima), next/image error handling, paginação adaptativa por dispositivo
**Confidence:** MEDIUM (achado crítico de RLS é HIGH/verificado por grep direto no repo; padrões de Next 16/next/image são MEDIUM, cruzados com docs oficiais)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Filtros**
- **D-01:** UI dos filtros (marca/solado/modalidade) é em **chips/pills sempre visíveis** — toque direto ativa/desativa, sem abrir dropdown ou drawer.
- **D-02:** Múltipla seleção **dentro da mesma categoria** é permitida (ex.: Nike E Adidas ao mesmo tempo) — não é single-select por categoria.
- **D-03:** A vitrine também tem **busca por texto** (nome do modelo), além dos filtros de categoria.
- **D-04:** Os filtros (chips + busca) ficam **fixos/sticky no topo** enquanto o cliente rola a página.

**Paginação**
- **D-05:** Mecanismo de paginação é **adaptativo por dispositivo**: botão "Carregar mais" no mobile; paginação numerada (anterior/próxima) no desktop. Mobile-first — o botão "Carregar mais" é o comportamento primário/default; a paginação numerada é a variante desktop.
- **D-06:** Mudar um filtro reinicia a paginação do zero (nunca mantém a posição de rolagem/página anterior).
- **D-07:** Carregar mais produtos é **dinâmico, sem reload completo da página** (VITR-04 já exige isso explicitamente).
- **D-08:** **Nenhum contador de produtos** ("23 produtos") aparece na vitrine pública — esse contador já existe e permanece exclusivo do painel admin (Fase 3). Não duplicar essa UI para o cliente final.

**Visibilidade de Produto Esgotado (extensão de escopo sobre VITR-03)**
- **D-09:** A visibilidade de um produto esgotado na vitrine pública é uma **configuração explícita do revendedor**, não um comportamento fixo do sistema. Precisa de: um campo **por produto** (`hide_when_sold_out boolean`) editável em `product-form.tsx`; uma **preferência global da loja** (`hide_sold_out_default boolean` em `stores`) configurável em `/configuracoes`.
- **D-10:** Produto **novo** nasce com o padrão "aparece esmaecido/marcado como esgotado" (nunca oculto por padrão) — decisão conservadora, consistente com D-03 da Fase 3 (nunca esconder/mostrar disponibilidade errada por omissão).
- **D-11:** Quando o revendedor muda a preferência **global** da loja, essa mudança **sobrescreve (apaga) as exceções já configuradas produto a produto** — vira uma regra única aplicada a todos os produtos no momento da mudança. Depois disso, o revendedor pode voltar a configurar exceções por produto individualmente até a próxima mudança global.
- **Nota do usuário:** D-09 exige uma migration tocando duas tabelas (`products`, `stores`) e dois formulários de fases já fechadas (Fase 2 `settings-form.tsx`/`configuracoes`, Fase 3 `product-form.tsx`). Isso é esperado e normal — não é reabrir a verificação daquelas fases, é a Fase 4 estendendo schema/UI existente para sua própria necessidade.

**Identidade da Loja no Topo**
- **D-12:** Hero **proeminente** no topo da vitrine: logo grande, cor de destaque da loja como fundo/acento, frase de apresentação em destaque — reforça a marca do revendedor antes do catálogo.
- **D-13:** A frase de apresentação (campo opcional desde o onboarding da Fase 1) só renderiza se estiver preenchida — sem espaço vazio quando ausente.

### Claude's Discretion
- Layout exato do grid de produtos (colunas no mobile/desktop, o que aparece no card além de foto/nome/marca/preço) não foi discutido em detalhe — seguir os tokens visuais já travados no PROJECT.md e o padrão de card já estabelecido no painel (Fase 3 `product-list.tsx`) como referência de espaçamento/tipografia, adaptado ao contexto público.
- Estrutura técnica exata da paginação adaptativa (Server Component com `searchParams.page` vs. Client Component com `useState`/Intersection Observer para o "Carregar mais") é decisão de implementação, não do usuário.
- Exato texto/ícone do placeholder de imagem com erro (VITR-05) fica a critério da implementação, seguindo a paleta já travada (`#F5F5F3`/`#6B6B6B`).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. A extensão de escopo em D-09/D-10/D-11 (visibilidade de esgotado configurável) é uma clarificação de COMO a Fase 4 exibe o estado de estoque (VITR-03), não uma nova capacidade fora do domínio desta fase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| VITR-01 | Cliente final acessa a vitrine pública via link/slug sem necessidade de login ou cadastro | Pattern 1 (nova policy RLS `to anon`) + Environment/Security Domain — achado crítico: hoje NENHUMA linha é legível por `anon`, migration nova é pré-requisito bloqueante para este requisito funcionar |
| VITR-02 | Cliente final pode filtrar produtos por marca, solado e modalidade | Pattern 3 (`queryPublicProducts` multi-select via `.in()`) + Code Examples (chip multi-select) + Anti-Patterns (multi-select vs. single-select do admin) |
| VITR-03 | Estado de estoque (disponível/esgotado) exibido na vitrine reflete o painel do revendedor com delay máximo de segundos | Pattern 4 (regra hide_when_sold_out resolvida na query) + Pattern 5 (D-11, reset transacional) + State of the Art (Cache Components sem `"use cache"`) |
| VITR-04 | Vitrine carrega produtos paginados (~20 por carga) em vez de renderizar tudo de uma vez | Pattern 6 (paginação adaptativa via CSS) + Pattern 7 (Server Action "carregar mais") + Pitfall 3/4/7 |
| VITR-05 | Imagem com erro de carregamento exibe um placeholder visual padrão, sem quebrar o layout do card | Code Examples (`ImageWithFallback`) + Pitfall 6 |
</phase_requirements>

## Summary

A Fase 4 substitui o placeholder público de `src/app/loja/[slug]/page.tsx` por uma vitrine completa que lê `products`/`product_sizes`/`product_photos` do Supabase sem sessão autenticada. A boa notícia: o padrão de "searchParams como fonte única de verdade" e o `queryProducts` da Fase 3 (`src/lib/products/list.ts`) já resolvem 80% do trabalho de busca/filtro/ordenação — a Fase 4 escreve uma variante pública dessa função (`queryPublicProducts` ou equivalente), sem `store_id` vindo de sessão e com paginação (`limit`/`offset` ou `range`).

**Achado crítico (bloqueante, verificado por grep nas migrations):** nenhuma policy RLS pública/anônima existe hoje em `stores` ou `products`/`product_sizes`/`product_photos`. Todas as policies atuais são `for all using (owner_id = auth.uid())` (ou subquery equivalente) — para um visitante anônimo (sem sessão), `auth.uid()` é `null`, então **nenhuma linha é retornada por nenhuma dessas tabelas hoje**. O bucket de Storage `product-images`/`store-assets` É público (URLs de imagem funcionam diretamente), mas as **linhas de banco** (nome do produto, preço, tamanhos, slug→loja) não são legíveis por `anon`. Isso significa que a Fase 4 precisa de uma **nova migration** adicionando policies `for select to anon using (...)` — não é um "confirmar o que já existe", é implementar do zero. Ver seção Security Domain e Common Pitfalls.

O resto da fase é composição de padrões já estabelecidos no codebase (Fase 3 P06: searchParams → query function pura → renderização; `next/image` com `images.remotePatterns` já configurado) mais duas peças novas: paginação adaptativa por dispositivo (D-05, CSS media query — não JS user-agent sniffing) e um wrapper client-side para fallback de imagem quebrada (`onError` exige Client Component).

**Primary recommendation:** Reaproveitar a arquitetura de `queryProducts`/`ProductToolbar`/searchParams da Fase 3 quase 1:1 para a vitrine pública, adaptando para: (1) escopo por `slug` público sem auth, (2) uma nova policy RLS `to anon` restrita a `status='published'`, (3) paginação via `range()`/`limit`+`offset` do Supabase, com dois componentes de UI (numerado desktop / "carregar mais" mobile) consumindo a mesma função de busca, escondidos/mostrados via CSS (`hidden md:flex` / `flex md:hidden`), nunca JS de detecção de device.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Resolver loja pelo slug (sem auth) | API/Backend (Server Component) | Database (RLS `to anon`) | Leitura pública direta no Postgres via Supabase client anônimo — sem middleware, sem cookie de sessão |
| Listagem/filtro/busca de produtos publicados | API/Backend (Server Component + função pura) | Database (RLS `to anon` + índices) | Mesma responsabilidade de `queryProducts` (Fase 3), mas variante pública; a query em si é a fonte de verdade dos dados, não o client |
| Estado dos filtros (chips/busca) na URL | Browser/Client (searchParams) | Frontend Server (renderiza a partir de `searchParams`) | URL é o único estado — Client Component só traduz clique em `router.push`, nunca guarda estado de filtro paralelo (mesmo padrão da Fase 3 P06) |
| Paginação adaptativa (numerada vs. "carregar mais") | Browser/Client (CSS + pouco JS) | Frontend Server (fornece a página/lote inicial) | Ambos os modos consomem o mesmo Server Component/função de query; a diferença é puramente de apresentação (CSS breakpoint), não dois pipelines de dado |
| "Carregar mais" incremental sem reload | Browser/Client (fetch adicional) | API/Backend (Route Handler ou Server Action que reusa a função de query) | Precisa de uma segunda forma de buscar a "próxima página" sem navegação de página inteira — Server Action ou Route Handler, sempre dinâmico (nunca `"use cache"`) |
| Frescor de estoque (delay de segundos) | Database (fonte de verdade) | API/Backend (sem cache) | Rota inteira permanece dinâmica por omissão (Cache Components do Next 16 são opt-in) — não é preciso Realtime/websocket |
| Fallback de imagem com erro | Browser/Client (`onError`) | — | `onError` exige Client Component; Server Component não pode registrar handler de evento |
| Visibilidade de esgotado (por produto + global da loja) | Database (colunas `hide_when_sold_out`/`hide_sold_out_default`) | API/Backend (query aplica a regra de exibição) | Regra de negócio simples (coluna boolean lida na query pública), não precisa de lógica de aplicação complexa |

## Package Legitimacy Audit

Nenhum pacote novo é necessário nesta fase. Toda a implementação usa dependências já instaladas e aprovadas em fases anteriores (`next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `clsx`/`tailwind-merge`) — não há `npm install` nesta fase. `browser-image-compression`, `qrcode`, `@dnd-kit/*` (já no `package.json`) não são usados aqui. A paginação "carregar mais" e o fallback de imagem não requerem biblioteca externa (Intersection Observer é API nativa do browser; `onError` é prop nativa do `next/image`).

**Packages removed due to [SLOP] verdict:** none — nenhum pacote avaliado.
**Packages flagged as suspicious [SUS]:** none.

## Standard Stack

### Core
Nenhuma adição de stack — reaproveita 100% do já instalado (`next@16.2.10`, `react@19.2.4`, `@supabase/supabase-js@^2.110.2`, `@supabase/ssr@^0.12.0`, `zod@^4.4.3`) [VERIFIED: npm view local package.json + npm registry, confirmado 2026-07-13].

### Supporting
| Library | Versão | Propósito | Quando Usar |
|---------|--------|-----------|-------------|
| `lucide-react` | ^1.24.0 | Ícone de placeholder de imagem quebrada (`ImageOff`, já usado em `product-list.tsx` no admin) | Componente de fallback de foto (VITR-05) |
| `clsx`/`tailwind-merge` | ^2.1.1 / ^3.6.0 | Composição condicional de classe para chips ativos/inativos (D-01/D-02) | UI de filtros em chips |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS breakpoint para paginação adaptativa (`hidden md:block`) | `useMediaQuery`/detecção de user-agent no servidor | User-agent sniffing é frágil (falso device, sem SSR confiável) e adiciona complexidade; CSS puro renderiza ambos os blocos no servidor e o browser decide o que mostrar — zero JS extra, sem layout shift |
| Server Action para "carregar mais" | Route Handler (`/api/loja/[slug]/produtos`) dedicado | Route Handler é mais explícito para uma chamada de "próxima página" chamada por `fetch()` client-side repetidamente; Server Action funciona igualmente bem chamada via `startTransition` a partir de um Client Component — ambos ficam fora de qualquer `"use cache"`. Escolha é discricionária do planner; Server Action mantém consistência com o resto do projeto (nenhum Route Handler existe ainda no codebase) |
| RLS `to anon` direto nas tabelas | Uma RPC `SECURITY DEFINER` (como `is_slug_available`) | Uma policy `for select to anon using (status = 'published')` é suficiente e mais simples — não há necessidade de mascarar colunas nem agregar dados sensíveis (produtos publicados já são para consumo público). RPC só seria necessário se a leitura pública precisasse decidir algo além de "está published?" com lógica que não pode virar `USING (...)` (não é o caso aqui) |

**Installation:** Nenhuma — sem novos pacotes.

## Architecture Patterns

### System Architecture Diagram

```
Cliente final (browser, sem sessão)
  │
  │  GET /loja/[slug]?brand=Nike&brand=Adidas&sole=FG&q=merc&page=2
  ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js 16 App Router — Server Component (page.tsx)          │
│ (SEM middleware — matcher /admin/:path* não intercepta aqui)  │
│                                                                │
│  1. await searchParams  → { brand: string[], sole: string[], │
│                              q, page }                        │
│  2. Supabase client ANÔNIMO (createClient() ainda funciona,   │
│     mas sem sessão → role `anon` no Postgres)                 │
│  3. Resolve store por slug  ──────────────┐                   │
│  4. queryPublicProducts(supabase,          │                  │
│       storeId, params, page)  ─────────────┼──► Postgres      │
│                                             │    (RLS: nova    │
│                                             │    policy        │
│                                             │    `to anon`     │
│                                             │    status=       │
│                                             │    'published')  │
│  5. Aplica regra hide_when_sold_out /       │                  │
│     hide_sold_out_default na query/pós-proc │                  │
└─────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
                                   product_sizes / product_photos
                                   (mesma RLS `to anon`, subquery
                                   via products.status='published')
                                               │
  ┌────────────────────────────────────────────┘
  ▼
┌───────────────────────────────────────────────────────────────┐
│ Render: Hero (D-12/D-13) → Filtros sticky (chips + busca, D-04)│
│  → Grid de produtos (Server Component, HTML já paginado)       │
│                                                                 │
│  Desktop (md:block): <PaginacaoNumerada /> — <Link> para        │
│    ?page=N, nova navegação de página inteira (Server Component  │
│    recalcula do zero, sem cache)                                │
│                                                                 │
│  Mobile (md:hidden): <CarregarMaisButton /> (Client Component)  │
│    → onClick chama Server Action queryPublicProducts(page+1)    │
│    → startTransition → append ao array local de produtos        │
│    → nunca substitui o que já foi renderizado pelo servidor      │
└───────────────────────────────────────────────────────────────┘
                     │
                     ▼
         <ProductCard> com <ImageWithFallback> (Client Component,
         onError troca src para placeholder #F5F5F3/#6B6B6B, VITR-05)
```

### Recommended Project Structure
```
src/app/loja/[slug]/
├── page.tsx                  # Server Component — resolve slug, lê searchParams, chama query, renderiza hero+filtros+grid+paginação numerada
├── store-hero.tsx            # Server Component (ou puro em page.tsx) — logo/cor/tagline (D-12/D-13)
├── product-filters.tsx       # Client Component — chips de marca/solado/modalidade + busca (D-01..D-04), nunca guarda estado próprio, só router.push
├── product-grid.tsx          # Server Component — grid de cards, recebe produtos já paginados
├── product-card.tsx          # Server Component — foto/nome/marca/preço + <ImageWithFallback>
├── image-with-fallback.tsx   # Client Component — onError troca src (VITR-05)
├── load-more-button.tsx      # Client Component — botão mobile, chama Server Action, appenda resultados (D-05/D-07)
└── pagination-numbered.tsx   # Server Component — <Link href="?page=N"> desktop (D-05)

src/lib/products/
├── list.ts                   # já existe (queryProducts, admin) — NÃO modificar assinatura
└── public-list.ts            # NOVO — queryPublicProducts(supabase, storeId, params, page): mesmo esqueleto de list.ts, sem status admin (fixo 'published'), com paginação e regra hide_when_sold_out

supabase/migrations/
└── 0004_public_storefront_rls_and_visibility.sql   # NOVO — policies `to anon`, colunas hide_when_sold_out/hide_sold_out_default
```

### Pattern 1: Policy RLS pública restrita a `status='published'` (NOVA — não existe ainda)

**What:** Uma policy adicional (não substitui a existente) em cada tabela que o visitante anônimo precisa ler: `stores` (para resolver o slug), `products` (só publicados), `product_sizes`/`product_photos` (só de produtos publicados).
**When to use:** Toda leitura da rota `/loja/[slug]`.
**Example:**
```sql
-- Migration 0004 (a escrever nesta fase) — segue a mesma disciplina de
-- 0001/0003: nunca separar `create policy` de `alter table ... enable row
-- level security` (aqui já está habilitado; é só uma policy adicional).
-- Policies RLS são aditivas (OR'd) por operação — esta NÃO enfraquece
-- "owner_full_access_products" existente, apenas adiciona um caminho extra
-- de leitura restrito a `anon` + `status = 'published'`.

create policy "public_read_published_stores" on stores
  for select
  to anon
  using (true); -- necessário para resolver slug -> id; nenhuma coluna sensível
                -- (stores não tem coluna de segredo; whatsapp fica em store_settings,
                -- que NÃO deve ganhar policy anon aqui — ver Pitfall abaixo)

create policy "public_read_published_products" on products
  for select
  to anon
  using (status = 'published');

create policy "public_read_published_product_sizes" on product_sizes
  for select
  to anon
  using (
    product_id in (select id from products where status = 'published')
  );

create policy "public_read_published_product_photos" on product_photos
  for select
  to anon
  using (
    product_id in (select id from products where status = 'published')
  );
```
[ASSUMED — padrão de policy `to anon` é conhecimento de treinamento cruzado com resultados de busca, não confirmado via Context7/docs oficiais nesta sessão por indisponibilidade da ferramenta MCP; a mecânica de policies aditivas (múltiplas policies do mesmo `for select` são combinadas com OR) é comportamento documentado do Postgres e deve ser confirmada no Supabase Dashboard/SQL editor antes de aplicar em produção]

### Pattern 2: `store_settings` (WhatsApp) — NÃO exige policy pública nesta fase

**What:** `store_settings.whatsapp_e164`/`message_template` são consumidos pelo botão "Pedir agora" — mas isso é escopo da **Fase 5** (PED-03), não desta fase. A Fase 4 só precisa exibir produtos; se o card do produto/CTA de pedido usar o WhatsApp da loja nesta fase (para preparar terreno), então `store_settings` também precisa de uma policy `to anon` restrita às colunas necessárias. **Decisão do planner:** se VITR-01..05 não exigem exibir/usar o WhatsApp ainda (isso é PED-03, Fase 5), não adicionar policy pública em `store_settings` nesta fase — princípio de menor privilégio, adicionar só quando o dado for de fato consumido.
**When to use:** Confirmar com o ROADMAP se o hero da vitrine (D-12) usa `store_settings` para algo — pela leitura de PROJECT.md/CONTEXT.md, o hero usa `stores.logo_url`/`accent_color`/`tagline`, não `store_settings`.

### Pattern 3: `queryPublicProducts` — variante pública de `queryProducts` (Fase 3)

**What:** Espelha `src/lib/products/list.ts` (duas queries separadas: `products` filtrado + `product_sizes`/`product_photos` via `.in(productIds)`, join em memória), mas:
- Filtra sempre `status = 'published'` (fixo, nunca vindo de `searchParams` — não expor esse controle ao cliente final).
- `brand`/`sole`/`fulfillment` (modalidade) viram **multi-valor** (VITR-02 + D-02: múltipla seleção na mesma categoria) — usar `.in("brand", brands)` em vez de `.eq("brand", brand)` (mudança direta de assinatura em relação ao admin, que é single-select por campo).
- Adiciona paginação: `.range(offset, offset + PAGE_SIZE - 1)` (Supabase-js) em vez de retornar tudo.
- Aplica a regra de visibilidade de esgotado (D-09/D-10/D-11): produtos com `disponivel = false` E `hide_when_sold_out = true` (ou `hide_when_sold_out = null` herdando `hide_sold_out_default` da loja) são excluídos do resultado — ver Pattern 4.

**Example (esqueleto adaptado de `list.ts`):**
```typescript
// src/lib/products/public-list.ts
export type QueryPublicProductsParams = {
  q?: string;
  brand?: string[];   // multi-valor (D-02) — searchParams.getAll("brand")
  sole?: string[];
  fulfillment?: string[];
  page?: number;      // 1-based
};

const PAGE_SIZE = 20; // VITR-04

export async function queryPublicProducts(
  supabase: SupabaseClient<Database>,
  storeId: string,
  params: QueryPublicProductsParams
): Promise<{ products: PublicProduct[]; hasMore: boolean }> {
  const page = params.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select("id, name, brand, brand_other, line, price, hide_when_sold_out", { count: "exact" })
    .eq("store_id", storeId)
    .eq("status", "published"); // fixo — nunca aceitar de searchParams

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.brand?.length) query = query.in("brand", params.brand);
  if (params.sole?.length) query = query.in("sole", params.sole);
  if (params.fulfillment?.length) query = query.in("fulfillment", params.fulfillment);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: products, count, error } = await query;
  // ... resto espelha list.ts (sizes/photos em lote, disponibilidade via EXISTS,
  // aplicação da regra hide_when_sold_out, hasMore = count > to + 1)
}
```
[ASSUMED — esqueleto de código derivado por analogia direta com `src/lib/products/list.ts` já lido neste repositório; não testado, o planner/executor deve tratar como ponto de partida, não como código pronto]

### Pattern 4: Regra "esconder esgotado" (D-09/D-10/D-11) resolvida na query, não na UI

**What:** Em vez de buscar tudo e filtrar no componente, resolver a visibilidade dentro de `queryPublicProducts`:
```typescript
// Pseudocódigo da regra de visibilidade (D-09/D-10/D-11):
// produto.disponivel = EXISTS(product_sizes.available=true) — já existe (Fase 3)
// efetivo_hide = produto.hide_when_sold_out ?? loja.hide_sold_out_default
// produto aparece se: disponivel === true OU efetivo_hide === false
```
`hide_when_sold_out` em `products` deve ser `boolean nullable` (D-10: produto novo nasce SEM exceção própria — herda o padrão global até o revendedor configurar algo diferente) — **não** `boolean not null default false`, porque D-11 exige que uma mudança global "apague" as exceções por produto, e a forma mais simples de modelar "sem exceção configurada" é `null`, distinto de "exceção configurada = false".
**When to use:** Sempre na função de query pública — nunca deixar essa lógica vazar para o componente de apresentação (senão o placeholder teria que replicá-la em dois lugares).

### Pattern 5: D-11 — mudança global apaga exceções por produto

**What:** Ao salvar `hide_sold_out_default` em `/configuracoes`, a Server Action correspondente deve, na mesma transação lógica, rodar `UPDATE products SET hide_when_sold_out = null WHERE store_id = $1` — resetando toda exceção por produto para "sem exceção" (que passa a herdar o novo padrão global).
**Example:**
```typescript
// src/lib/settings/actions.ts — dentro de saveStoreSettings (ou uma action
// dedicada), quando hide_sold_out_default MUDA em relação ao valor atual:
const { error: storeUpdateError } = await owned.supabase
  .from("stores")
  .update({ hide_sold_out_default: parsed.data.hideSoldOutDefault })
  .eq("id", owned.storeId);

if (!storeUpdateError) {
  // D-11: sobrescreve/apaga TODAS as exceções por produto desta loja —
  // efeito colateral esperado e documentado, não um bug.
  await owned.supabase
    .from("products")
    .update({ hide_when_sold_out: null })
    .eq("store_id", owned.storeId);
}
```
Supabase-js não abre transação multi-statement explícita por padrão (sem `BEGIN`/`COMMIT` do client REST) — para atomicidade real entre as duas escritas, considerar uma função Postgres (`plpgsql`) chamada via RPC que faz os dois UPDATEs numa única transação de banco. Para o volume esperado deste MVP (poucas dezenas de produtos por loja), o risco de inconsistência entre as duas chamadas sequenciais é baixo, mas **deve ser sinalizado ao planner como decisão consciente de escopo** (RPC transacional vs. dois updates sequenciais) — não decidir silenciosamente.
[ASSUMED — mecanismo de transação é conhecimento geral de Postgres/Supabase-js, não verificado via Context7 nesta sessão]

### Pattern 6: Paginação adaptativa por CSS, não por JS de detecção de device

**What:** Renderizar AMBOS os controles de paginação no HTML (Server Component), escondendo um deles via Tailwind (`hidden md:flex` para o numerado desktop, `flex md:hidden` para o botão mobile) — nunca detectar o dispositivo via `user-agent` no servidor nem `window.innerWidth` no cliente para decidir qual renderizar.
**When to use:** Sempre — é o único jeito de evitar hydration mismatch (servidor não sabe o viewport do cliente) e layout shift.
**Example:**
```tsx
<div className="hidden md:flex">
  <PaginationNumbered currentPage={page} hasMore={hasMore} slug={slug} searchParams={params} />
</div>
<div className="flex md:hidden">
  <LoadMoreButton slug={slug} page={page} searchParams={params} hasMore={hasMore} />
</div>
```
**Fonte:** raciocínio de arquitetura direto (mobile-first + Tailwind `md:` já é a convenção do projeto inteiro) — nenhuma pesquisa externa necessária, é a aplicação do padrão de breakpoint já usado em todo o codebase.

### Pattern 7: "Carregar mais" sem reload — Server Action chamada de Client Component, sempre dinâmica

**What:** O botão mobile chama uma Server Action (não um Route Handler, para consistência com o resto do projeto que já usa só Server Actions) que roda `queryPublicProducts` com `page+1` e retorna os produtos da próxima página; o Client Component faz `setState` appendando ao array já renderizado pelo servidor.
**Example:**
```tsx
"use client";
// load-more-button.tsx
export function LoadMoreButton({ slug, page, searchParams, initialHasMore }: Props) {
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [currentPage, setCurrentPage] = useState(page);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await fetchNextPage(slug, searchParams, currentPage + 1); // Server Action
      setItems((prev) => [...prev, ...result.products]);
      setCurrentPage((p) => p + 1);
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
      {hasMore && (
        <button onClick={handleLoadMore} disabled={isPending} className="...">
          {isPending ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </>
  );
}
```
**Gotcha confirmado (Cache Components):** essa Server Action **nunca** deve ter `"use cache"` nem ser chamada a partir de um contexto marcado como cacheado — como o projeto inteiro já segue a disciplina de nunca usar `"use cache"` na vitrine (mandato do PROJECT.md/CLAUDE.md), isso é automaticamente satisfeito por omissão. Server Actions não são afetadas pelo `cacheComponents` da mesma forma que Server Components (não há "use cache" implícito em Server Actions) — mas o dado que ela lê (Postgres via `queryPublicProducts`) precisa continuar sem nenhum `unstable_cache`/`fetch` com `next: { revalidate }` custom. [CITED: nextjs.org/docs/app/api-reference/directives/use-cache — "by default, all dynamic code runs at request time" com `cacheComponents: true`]

### Anti-Patterns to Avoid
- **Detectar mobile/desktop via `navigator.userAgent` no servidor:** não confiável (proxies, DevTools, user-agents desatualizados) e quebra o SSR determinístico — usar CSS.
- **Guardar os filtros em `useState` no Client Component e só sincronizar com a URL "depois":** viola diretamente o must_have "abrir a URL filtrada reproduz a mesma visualização" (D-06) — a URL sempre lidera, nunca um estado React paralelo (mesma disciplina de `ProductToolbar` da Fase 3, que este componente deve espelhar).
- **Um único `<select>` por categoria de filtro (como no admin):** o admin é single-select por campo (`.eq`); a vitrine pública precisa multi-select (D-02, "Nike E Adidas ao mesmo tempo") — chips com múltiplos valores marcados simultaneamente por categoria, `searchParams.getAll("brand")` em vez de `searchParams.get("brand")`.
- **RLS `for all using (true)` na tabela `products` para "resolver rápido" o problema de leitura pública:** enfraquece a policy existente ao ponto de qualquer request anônimo poder também fazer INSERT/UPDATE/DELETE se mal configurado — sempre `for select` (nunca `for all`) e sempre `to anon` explicitamente (nunca omitir o `TO`, que faz a policy valer para todo mundo incluindo `authenticated`, o que também seria incorreto aqui pois o dono já tem sua própria policy).
- **Esquecer que RLS policies são aditivas (OR):** ao adicionar a policy `to anon`, não é preciso (nem correto) remover ou modificar `owner_full_access_products` — as duas convivem, cada uma cobrindo um papel diferente.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce da busca por texto (D-03) | Novo hook de debounce | `useDebouncedValue` (`src/lib/hooks/use-debounce.ts`, já existe) | Mesmo hook já usado no slug-editor e no ProductToolbar do admin — zero motivo para reimplementar |
| Detecção de "qual paginação mostrar" | JS de media query customizado | CSS `hidden md:flex` / `flex md:hidden` (Tailwind, já em uso em todo o projeto) | Resolve no CSS, sem JS extra, sem hydration mismatch |
| Fallback de imagem quebrada | Lógica de retry/preload customizada | `next/image` `onError` + estado local simples (`useState<boolean>`) num Client Component dedicado | Padrão simples e bem documentado; qualquer coisa mais sofisticada (retry, CDN fallback) é escopo além do que VITR-05 pede |
| Multi-select de filtro por categoria | Componente de dropdown multi-select de uma lib de UI | Chips/pills nativos (`<button>` com `aria-pressed`, toggle via `searchParams.getAll`) | D-01 já decidiu explicitamente "chips sempre visíveis, sem dropdown/drawer" — trazer uma lib de multi-select contradiria a decisão do usuário |

**Key insight:** Esta fase é, na prática, uma extensão do padrão já provado na Fase 3 (searchParams como fonte de verdade + função de query pura testável) para um contexto sem autenticação — o risco real não está em inventar UI nova, está em (a) esquecer a policy RLS pública (bloqueia TUDO silenciosamente — a página renderizaria "vazia" sem erro óbvio) e (b) misturar a lógica de visibilidade de esgotado dentro do componente em vez de centralizá-la na query.

## Common Pitfalls

### Pitfall 1: Vitrine pública "vazia" sem nenhum erro visível (RLS bloqueando silenciosamente)
**What goes wrong:** O desenvolvedor implementa `page.tsx` chamando `queryPublicProducts`, tudo compila, mas a vitrine sempre mostra "nenhum produto encontrado" mesmo com produtos publicados no banco — porque a query retorna `[]` (não um erro) quando RLS bloqueia todas as linhas para o papel `anon`.
**Why it happens:** Supabase/Postgrest, sob RLS, não distingue "tabela vazia" de "sem permissão para ver nenhuma linha" — ambos retornam `[]` com `error: null`. Sem a nova policy `to anon` (Pattern 1), isso é o comportamento padrão hoje.
**How to avoid:** Escrever e aplicar a migration 0004 (policies `to anon`) ANTES de testar a página; validar com um teste de integração que faz uma query como cliente anônimo (`createClient` sem sessão/cookies, chave `anon`) contra um produto `published` seed e espera recebê-lo de volta — mesma disciplina dos testes de isolamento RLS já usados no projeto (`tests/rls/product-isolation.test.ts`), mas testando o caminho inverso (acesso permitido, não bloqueado).
**Warning signs:** Toda query retorna array vazio mesmo com dados confirmados via `service_role`/painel do Supabase; nenhum erro no console/log.

### Pitfall 2: Expor `store_settings` (WhatsApp) publicamente antes da hora
**What goes wrong:** Ao criar a policy pública para `stores` (necessária para resolver o slug), é fácil "aproveitar" e criar uma policy igual em `store_settings` "para já deixar pronto para a Fase 5" — isso expõe o número de WhatsApp do revendedor a qualquer requisição anônima antes que a Fase 5 (que decide como/quando esse dado é usado no CTA) exista.
**Why it happens:** Parece economia de esforço, mas é escopo de outra fase decidindo sozinho.
**How to avoid:** Só adicionar policy `to anon` nas tabelas que VITR-01..05 realmente precisam ler (`stores` para nome/logo/cor/tagline, `products`/`product_sizes`/`product_photos`) — deixar `store_settings` fora desta migration; a Fase 5 adiciona sua própria policy escopada (ex.: só a coluna `message_template`, nunca todas) quando de fato precisar.
**Warning signs:** Migration desta fase toca `store_settings`.

### Pitfall 3: Paginação numerada e "carregar mais" divergindo de comportamento sob os mesmos filtros
**What goes wrong:** Implementar duas funções de busca ligeiramente diferentes (uma para a primeira carga do Server Component, outra para o "carregar mais") e elas divergirem sutilmente (ordenação diferente, contagem de `hasMore` calculada diferente) — usuário no mobile vê produtos duplicados ou pulados ao clicar "carregar mais" depois de já ter navegado numa página numerada (se o mesmo usuário mudar de dispositivo/viewport).
**Why it happens:** Copiar-colar a lógica de paginação em dois lugares em vez de uma única função parametrizada por `page`.
**How to avoid:** Uma única `queryPublicProducts(supabase, storeId, params)` que recebe `page` e é chamada tanto pelo Server Component (primeira carga) quanto pela Server Action do botão "carregar mais" — nunca duas implementações (mesmo princípio já aplicado a `uploadAndInsertPhotos`/`parseProductFormData` na Fase 3).
**Warning signs:** Dois arquivos com lógica de `.range()`/`.order()` quase idêntica.

### Pitfall 4: Mudar um filtro sem resetar a página (D-06)
**What goes wrong:** Usuário está na página 3 (desktop) ou já clicou "carregar mais" 3 vezes (mobile), muda um filtro, e o resultado mantém `page=3` na URL — mostrando "nenhum resultado" mesmo quando existem produtos que batem com o novo filtro (porque a página 3 do novo filtro pode não existir).
**Why it happens:** O componente de filtro reconstrói a URL preservando todos os params antigos, incluindo `page`, ao adicionar/remover um chip.
**How to avoid:** Ao alterar qualquer filtro (chip ou busca), o `router.push` deve explicitamente **omitir** `page` (ou setar `page=1`) — nunca herdar o valor de paginação anterior. Mesmo padrão de `navigate()` em `ProductToolbar` (Fase 3), mas adicionando essa remoção explícita.
**Warning signs:** Testar: aplicar filtro na página 2+ e observar se volta para o topo/página 1.

### Pitfall 5: `hide_when_sold_out` como `not null default false` em vez de `nullable`
**What goes wrong:** Se a coluna for `not null default false`, não há como distinguir "revendedor decidiu explicitamente mostrar esgotados para este produto" de "nunca configurou, deve herdar o padrão global" — D-11 (mudança global apaga exceções) fica impossível de implementar corretamente, porque `false` já é um valor "configurado" indistinguível do padrão herdado.
**Why it happens:** `boolean not null default false` é o reflexo automático ao criar uma coluna boolean sem pensar no caso "ainda não configurado" como um terceiro estado.
**How to avoid:** `hide_when_sold_out boolean` **nullable**, sem default (ou `default null` explícito); a query pública resolve `produto.hide_when_sold_out ?? loja.hide_sold_out_default` em tempo de leitura.
**Warning signs:** Migration com `hide_when_sold_out boolean not null default false`.

### Pitfall 6: `next/image` `onError` não disparando de forma confiável em imagens já quebradas no cache do browser
**What goes wrong:** Em alguns casos (imagem já "quebrada" antes do React hidratar, cache do browser), o evento `onError` pode não disparar do jeito esperado, deixando o placeholder de fallback sem aparecer.
**Why it happens:** Comportamento documentado de forma inconsistente entre implementações de `<img>`/`next/image` quando a imagem falha antes da hidratação completa.
**How to avoid:** Além de `onError` trocando o `src`/estado, considerar checar `imgRef.current?.complete && imgRef.current?.naturalWidth === 0` num `useEffect` no mount, como camada de defesa adicional — mas para o MVP, `onError` sozinho (mais simples) é aceitável como primeira implementação; documentar como possível ponto de UAT manual (testar com uma URL de foto deliberadamente quebrada).
**Warning signs:** Foto com `storage_path` inválido não mostra nem a imagem nem o placeholder — some completamente do card.

### Pitfall 7: Renderizar mais de 20 produtos de uma vez no primeiro carregamento "carregar mais"
**What goes wrong:** Ao implementar o `LoadMoreButton`, é comum inicializar o array `items` já com os primeiros 20 produtos vindos do Server Component E depois, ao clicar "carregar mais", buscar a página 2 — mas se o cálculo de offset estiver errado (ex.: `page` começando em 0 num lugar e em 1 em outro), o usuário recebe produtos duplicados ou pula um lote inteiro.
**Why it happens:** Inconsistência de convenção 0-based vs. 1-based entre o Server Component inicial e a Server Action de "carregar mais".
**How to avoid:** Fixar `page` como 1-based em toda a stack (mesma convenção que a paginação numerada desktop usa naturalmente via `searchParams.page`), documentar isso no comentário da função `queryPublicProducts`.

## Code Examples

### Ler múltiplos valores do mesmo filtro via searchParams (multi-select, D-02)
```typescript
// page.tsx (Server Component) — Next.js 16, searchParams é sempre Promise
type LojaSearchParams = {
  q?: string;
  brand?: string | string[];
  sole?: string | string[];
  modalidade?: string | string[];
  page?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function LojaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<LojaSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brands = toArray(sp.brand);
  const soles = toArray(sp.sole);
  const page = Number(sp.page ?? "1") || 1;
  // ...
}
```
[ASSUMED — Next.js normaliza múltiplos valores do mesmo query param como array em `searchParams` do App Router; comportamento consistente com versões anteriores do Next.js, não reverificado especificamente para 16.2.10 nesta sessão via docs oficiais]

### Chip de filtro multi-select (Client Component, sem estado próprio)
```tsx
"use client";
function BrandChip({ brand, active, currentBrands, slug, restParams }: Props) {
  const router = useRouter();
  function toggle() {
    const next = active ? currentBrands.filter((b) => b !== brand) : [...currentBrands, brand];
    const search = new URLSearchParams(restParams);
    search.delete("brand");
    next.forEach((b) => search.append("brand", b));
    search.delete("page"); // D-06 — todo filtro reseta a paginação
    router.push(`/loja/${slug}?${search.toString()}`);
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={toggle}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active ? "border-[#00C46A] bg-[#00C46A] text-white" : "border-[#F5F5F3] bg-white text-[#111111]"
      )}
    >
      {brand}
    </button>
  );
}
```

### Fallback de imagem (VITR-05)
```tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

export function ImageWithFallback({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(!src);
  if (errored || !src) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#F5F5F3]">
        <ImageOff className="h-8 w-8 text-[#6B6B6B]" aria-hidden="true" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="rounded-xl object-cover"
      onError={() => setErrored(true)}
    />
  );
}
```
Fonte: padrão consolidado a partir de múltiplos resultados de busca (dev.to, medium, GitHub Discussions do vercel/next.js) — [CITED: nextjs.org/docs/app/api-reference/components/image] para a API do componente em si; a necessidade de Client Component para `onError` é documentada e consistente entre as fontes consultadas.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Cache implícito de rotas (Next.js ≤15, `fetch` cacheado por padrão) | Cache Components — tudo dinâmico por padrão, `"use cache"` explícito para cachear | Next.js 16 (2025) | A vitrine pública satisfaz "estoque com delay de segundos" apenas por NÃO usar `"use cache"` — nenhuma configuração extra necessária, mas também nenhuma proteção contra um dev futuro adicionar `"use cache"` por engano numa rota de estoque; vale um comentário de aviso explícito no topo do arquivo (mesmo padrão já usado em `page.tsx` do admin) |
| `params`/`searchParams` síncronos | `params`/`searchParams` são sempre `Promise` no App Router | Next.js 15+ (já em uso desde a Fase 1 no placeholder) | Já reconhecido pelo placeholder atual (`params: Promise<{ slug: string }>`) — manter a mesma convenção |

**Deprecated/outdated:** Nenhum item específico de deprecação identificado além do que já documentado no CLAUDE.md (Next 14, `middleware.ts` legado, `images.domains`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Sintaxe exata de policy RLS `to anon using (...)` funciona sem ajuste adicional no projeto Supabase remoto atual (versão de Postgres/Supabase usada) | Pattern 1 | Baixo-médio — sintaxe é padrão SQL/Postgres amplamente estável; testar com `supabase db push` + query real como confirmação, mesmo fluxo já usado nas 3 migrations anteriores |
| A2 | `searchParams` com múltiplos valores do mesmo nome (`?brand=Nike&brand=Adidas`) chega como array em Next.js 16 App Router | Code Examples | Médio — se o comportamento mudou, o parsing de multi-select quebra silenciosamente (só o último valor sobrevive); validar com um teste manual/automatizado cedo no plano, antes de construir toda a UI de chips em cima disso |
| A3 | Transação atômica de duas escritas (D-11) pode ser feita com dois `update()` sequenciais do Supabase-js sem risco relevante para o volume esperado do MVP | Pattern 5 | Baixo — path de escrita raro (revendedor mexe na config global ocasionalmente, não em alta frequência); se uma das duas escritas falhar no meio, o pior caso é um estado transitório inconsistente corrigível numa nova tentativa, não corrupção permanente |
| A4 | `onError` de `next/image` é suficiente sem a checagem adicional de `naturalWidth === 0` no mount | Pitfall 6 | Baixo — layout não quebra mesmo se o placeholder não aparecer no caso raro (o `<Image fill>` dentro de um container com altura fixa não colapsa); pior caso é UX levemente pior (ícone quebrado do browser em vez do placeholder customizado), não uma quebra de layout (que é o que VITR-05 exige) |

**Se esta tabela parecer grande:** é esperado — esta fase envolve tanto código novo de infraestrutura (RLS pública, nunca feita antes no projeto) quanto padrões de Next.js 16 relativamente recentes (Cache Components, lançado há poucos meses) onde a pesquisa não teve acesso a Context7/docs oficiais nesta sessão (ferramenta MCP indisponível, fallback para WebSearch). Recomenda-se ao planner inserir pelo menos um `checkpoint:human-verify` cobrindo a query pública com filtros multi-select antes de considerar a fase pronta para produção.

## Open Questions

1. **A vitrine usa `store_settings` (WhatsApp) nesta fase ou só na Fase 5?**
   - What we know: CONTEXT.md da Fase 4 não menciona WhatsApp/CTA "Pedir agora" — isso é PED-01..04, Fase 5, conforme REQUIREMENTS.md.
   - What's unclear: Se o card de produto desta fase já vai ter ALGUM placeholder de botão (mesmo que desabilitado) que precise ler o WhatsApp.
   - Recommendation: Assumir que NÃO — o card desta fase mostra só foto/nome/marca/preço/tamanhos disponíveis (leitura do próprio Success Criteria da fase, que fala só de filtro/paginação/estoque/imagem, nunca de CTA de pedido). Confirmar com o planner antes de tocar `store_settings`.

2. **`hide_when_sold_out`/`hide_sold_out_default` entram nesta migration junto com as policies `to anon`, ou em uma migration separada?**
   - What we know: São mudanças de schema logicamente distintas (uma é RLS de leitura pública, outra é uma feature de visibilidade configurável) mas ambas nascem do mesmo requisito desta fase (D-09).
   - What's unclear: Convenção do projeto até agora é uma migration por fase que agrupa tudo (0001 = Fase 1, 0002 = Fase 2, 0003 = Fase 3) — seguir esse padrão sugere UMA migration 0004 para tudo desta fase.
   - Recommendation: Uma única migration `0004_public_storefront_rls_and_visibility.sql` cobrindo (a) policies `to anon`, (b) `alter table products add column hide_when_sold_out boolean`, (c) `alter table stores add column hide_sold_out_default boolean not null default false` (D-10: produto novo nasce sem exceção = null, mas a LOJA precisa de um valor padrão inicial não-nulo desde a criação — `false` = "mostrar esmaecido/esgotado", nunca ocultar por padrão, consistente com D-10).

3. **A contagem exata (`count: "exact"`) do Supabase em toda página é cara o suficiente para evitar em paginação incremental?**
   - What we know: `count: "exact"` faz um `COUNT(*)` real no Postgres a cada chamada; para volumes de "dezenas de produtos por loja" (contexto do MVP), o custo é irrelevante.
   - What's unclear: Se em algum momento o volume crescer, isso pode exigir `count: "estimated"` ou remover a contagem exata e usar "buscar `PAGE_SIZE + 1` e checar se voltou o extra" como proxy de `hasMore` sem contar tudo.
   - Recommendation: Para o MVP, usar a técnica "buscar 21, mostrar 20, `hasMore = length > 20`" é mais barata que `count: "exact"` e evita uma segunda query — recomendado ao planner como abordagem preferida em vez de `count: "exact"`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime do Next.js | ✓ | v26.3.0 (>= 20.9 exigido pelo Next 16) | — |
| npm | Gerência de pacotes | ✓ | 11.16.0 | — |
| Supabase CLI | Migrations/typegen | ✓ | 2.109.1 | — |
| Projeto Supabase remoto (produção) | RLS/Postgres real, sem emulador local de Auth | ✓ (confirmado por Fases 1-3, projeto `yuyprdjzeslanxbgcemj`) | — | Nenhum — todas as fases anteriores já rodam contra o remoto |
| `next` (registro) | Framework | ✓ | 16.2.10 (igual ao instalado) [VERIFIED: npm view] | — |

**Missing dependencies with no fallback:** nenhuma.
**Missing dependencies with fallback:** nenhuma — ambiente já validado pelas 3 fases anteriores, nada novo introduzido.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (já configurado, `npm test` = `vitest run`) |
| Config file | `vitest.config.ts` (já existe, usado pelas Fases 1-3) |
| Quick run command | `npx vitest run tests/products/public-list.test.ts` (arquivo a criar) |
| Full suite command | `npm test` (⚠ ver Bloqueador herdado abaixo) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VITR-01 | Vitrine acessível sem sessão/cookie de auth | integration | `npx vitest run tests/public/storefront-access.test.ts` | ❌ Wave 0 |
| VITR-02 | Filtro multi-select por marca/solado/modalidade + busca, persistido na URL | integration + manual_procedural (navegação real) | `npx vitest run tests/products/public-list.test.ts` | ❌ Wave 0 |
| VITR-03 | Disponível/esgotado refletido sem cache, incluindo regra hide_when_sold_out/hide_sold_out_default | integration | `npx vitest run tests/products/public-list.test.ts` (casos de visibilidade) | ❌ Wave 0 |
| VITR-04 | Paginação ~20 por carga, sem reload completo | integration (contagem/offset) + manual_procedural (clique real "carregar mais"/numerada) | `npx vitest run tests/products/public-list.test.ts` (paginação) | ❌ Wave 0 |
| VITR-05 | Placeholder de imagem quebrada sem quebrar layout | manual_procedural (visual) | checkpoint humano — não automatizável com `vitest` puro | — |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/products/public-list.test.ts` (ou o arquivo específico da task)
- **Per wave merge:** `npm test` (ciente do bloqueador de rate-limit abaixo)
- **Phase gate:** Checkpoint humano final cobrindo VITR-01..05 em dispositivo móvel real (mesma disciplina da Fase 3 P06), incluindo teste explícito de URL compartilhada com filtros (D-06) e reload/segunda aba para VITR-03.

### Wave 0 Gaps
- [ ] `tests/rls/public-storefront-access.test.ts` — prova que um client SEM sessão (chave anon, sem `auth.uid()`) consegue ler `stores`/`products published` e NÃO consegue ler `products draft`/`store_settings` — este teste é o gate mais crítico da fase, deve rodar ANTES de qualquer UI ser construída em cima da query pública.
- [ ] `tests/products/public-list.test.ts` — espelha `tests/products/list-filter-sort.test.ts` (Fase 3), cobrindo multi-select de marca/solado/modalidade, paginação (`page`/`hasMore`), e a regra de visibilidade `hide_when_sold_out`/`hide_sold_out_default` (incluindo o caso D-11: mudar o padrão global reseta exceções).
- [ ] Framework: nenhum install necessário — Vitest já configurado.

**Bloqueador herdado (não desta fase, documentado desde a Fase 3):** a suíte completa `npm test` falha por rate-limit de `signUp` do Supabase Auth (sem emulador local) quando rodada inteira — os testes de RLS pública desta fase usam um client SEM `signUp` (chave anon pura, sem criar conta), então NÃO deveriam ser afetados por esse rate-limit; ainda assim, rodar o arquivo isolado (`npx vitest run tests/rls/public-storefront-access.test.ts`) em vez da suíte completa para validação rápida durante o desenvolvimento.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Não | Rota pública, por design (SC-7 do PROJECT.md) — nenhuma autenticação aplicável aqui |
| V3 Session Management | Não | Sem sessão nesta rota |
| V4 Access Control | **Sim — o achado central desta pesquisa** | RLS Postgres com policy `to anon` restrita a `status='published'`, escopo mínimo (só as 4 tabelas necessárias: `stores`, `products`, `product_sizes`, `product_photos`; explicitamente NÃO `store_settings`) |
| V5 Input Validation | Sim | `searchParams` (brand/sole/modalidade/q/page) devem ser validados contra as listas fixas (`BRANDS`/`SOLES`/`FULFILLMENTS` já existentes em `src/lib/products/constants.ts`) antes de ir para a query — nunca interpolar string livre de `searchParams` diretamente numa cláusula SQL; usar sempre `.in()`/`.eq()`/`.ilike()` parametrizados do Supabase-js (já é o padrão do projeto, nenhuma mudança necessária) |
| V6 Cryptography | Não aplicável | Nenhum dado criptografado nesta fase |

### Known Threat Patterns for esta stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Vazamento de dados de rascunho (produtos `draft` ou de outra loja) via policy `to anon` mal escrita (ex.: `using (true)` em vez de `using (status = 'published')`) | Information Disclosure | Policy explícita e testada (`tests/rls/public-storefront-access.test.ts`) confirmando que `draft` NUNCA retorna para `anon`, e que produtos de OUTRA loja com slug diferente não vazam entre si — mesmo teste de isolamento cross-tenant já feito para o admin (Fase 3), aplicado ao caminho anônimo |
| Enumeração de slugs / scraping em massa de todas as lojas via a mesma rota pública sem rate-limit | Denial of Service (parcial) | Fora de escopo desta fase (MVP com "dezenas" de lojas, tráfego baixo) — não construir rate-limiting agora; registrar como item de atenção futura se o produto crescer (Vercel Hobby/Pro não têm WAF nativo configurado) |
| SQL injection via `searchParams` não validado indo direto para filtro | Tampering | Supabase-js já parametriza toda chamada (`.eq`/`.in`/`.ilike`) — nunca construir SQL cru a partir de `searchParams`; validar contra listas fixas antes de usar, rejeitando silenciosamente (ignorar valor inválido) em vez de propagar erro para o cliente final |
| Policy `to anon` acidentalmente aplicada a `store_settings` (exposição de WhatsApp antes da hora) | Information Disclosure | Ver Pitfall 2 — escopo explícito da migration 0004 documentado para excluir `store_settings` |

## Sources

### Primary (HIGH confidence)
- Grep direto em `supabase/migrations/0001_init_stores_rls.sql`, `0002_slug_availability_rpc.sql`, `0003_products_schema_rls.sql` (arquivos deste repositório) — confirma que NENHUMA policy `to anon`/`using (true)` existe hoje; toda policy atual é `owner_full_access_*` escopada por `auth.uid()`. [VERIFIED: grep no repositório, 2026-07-13]
- `npm view next version` → `16.2.10`, igual ao `package.json` do projeto. [VERIFIED: npm registry, 2026-07-13]
- Leitura direta de `src/lib/products/list.ts`, `src/app/(admin)/produtos/page.tsx`, `src/app/(admin)/produtos/product-toolbar.tsx`, `src/lib/products/actions.ts`, `src/lib/products/constants.ts`, `src/lib/hooks/use-debounce.ts`, `src/app/loja/[slug]/page.tsx`, `next.config.ts`, `src/middleware.ts` — padrões já estabelecidos no codebase, base direta desta pesquisa.

### Secondary (MEDIUM confidence)
- [Directives: use cache | Next.js](https://nextjs.org/docs/app/api-reference/directives/use-cache) — comportamento opt-in de cache no Next 16, cruzado via WebSearch.
- [Guides: Migrating to Cache Components | Next.js](https://nextjs.org/docs/app/guides/migrating-to-cache-components) — comportamento de `searchParams` fora de Suspense sob Cache Components.
- [Components: Image Component | Next.js](https://nextjs.org/docs/app/api-reference/components/image) — API oficial de `next/image`.
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — mecânica de `TO anon`/`TO authenticated` e policies aditivas.

### Tertiary (LOW confidence)
- Blogs/Medium/dev.to sobre Next.js 16 Cache Components e padrão de fallback de `next/image` (múltiplos, cruzados entre si mas não oficiais) — usados só para confirmar consenso de padrão de implementação, não como fonte normativa.
- Nota de ferramenta: Context7 MCP não estava disponível nesta sessão (não presente na lista de ferramentas); todas as consultas que o seam `research-plan` roteou para `context7` foram substituídas por `WebSearch` conforme a regra de fallback do protocolo.

## Project Constraints (from CLAUDE.md)

Diretivas do `.claude/CLAUDE.md` diretamente aplicáveis a esta fase (tratar com a mesma autoridade de decisões travadas):

- **Rota pública sem auth:** `/loja/[slug]` não pode ter nenhum middleware de autenticação — já garantido estruturalmente pelo `matcher: ['/admin/:path*']` de `src/middleware.ts`; a Fase 4 não deve adicionar nenhuma checagem de sessão nesta rota.
- **Mobile-first:** qualquer feature que quebre no mobile não vai para produção — paginação "carregar mais" é o comportamento primário (D-05), não a variante numerada.
- **Performance de imagem:** fallback visual sempre presente (VITR-05) — já é requisito explícito desta fase.
- **Next.js 16 (Cache Components) para frescor de estoque:** a vitrine pública nunca deve usar `"use cache"` — delay de segundos, nunca minutos, é satisfeito só por permanecer totalmente dinâmica.
- **`next/image` com `images.remotePatterns`** (não `images.domains`, depreciado) — já configurado em `next.config.ts`, reaproveitar sem alteração.
- **Sem gateway de pagamento/checkout/carrinho:** fora de escopo, não introduzir nesta fase.
- **Stack travada:** Next.js 16.2.x, Tailwind v4, Supabase (`@supabase/supabase-js`/`@supabase/ssr`), sem novas bibliotecas de UI para filtros/paginação (usar chips/CSS nativos, conforme D-01 e Pattern 6).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, tudo já instalado e versionado no projeto.
- Arquitetura/RLS pública: HIGH para o achado (ausência de policy, verificado por grep) / MEDIUM para a sintaxe exata recomendada (não verificada via Context7/docs oficiais nesta sessão, cruzada só via WebSearch).
- Pitfalls: MEDIUM-HIGH — a maioria deriva diretamente de decisões já registradas em CONTEXT.md (D-06, D-09/10/11) e do padrão já testado na Fase 3, não de fontes externas incertas.

**Research date:** 2026-07-13
**Valid until:** 30 dias (stack estável; Cache Components do Next 16 é relativamente recente — revalidar se a fase for retomada após um upgrade de versão do Next.js)
