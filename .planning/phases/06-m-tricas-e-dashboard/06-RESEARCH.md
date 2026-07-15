# Phase 6: Métricas e Dashboard - Research

**Researched:** 2026-07-15
**Domain:** Server-side pageview/analytics capture (Next.js 16 App Router + Supabase/Postgres aggregation) + admin panel navigation shell (sidebar/drawer, no new dependency)
**Confidence:** HIGH

## Summary

Esta fase tem duas partes tecnicamente independentes que só se encontram na página `/dashboard`: (1) criar do zero um mecanismo de captura de pageview simétrico a `order_clicks` (Fase 5), e (2) agregar três fontes de dados (`products`, o novo `pageviews`, `order_clicks`) em cards/listas simples, dentro de um novo shell de navegação (sidebar desktop + drawer mobile) que passa a envolver todo o painel autenticado.

A descoberta mais importante desta pesquisa não estava em nenhuma das perguntas explícitas do CONTEXT.md: **o grupo de rotas `(admin)` hoje é compartilhado por páginas públicas de autenticação (`/login`, `/cadastro`, `/onboarding`, `/esqueci-senha`, `/redefinir-senha`) e pelas páginas protegidas** (`/dashboard`, `/produtos*`, `/configuracoes`) — confirmado tanto pelo comentário explícito em `login/page.tsx` ("Esta página NÃO fica atrás de gate de sessão: é uma entrada pública do grupo `(admin)`") quanto pela ausência de qualquer redirecionamento no próprio `(admin)/layout.tsx`. Adicionar a sidebar diretamente nesse layout vazaria "Dashboard/Produtos/Configurações/Sair da conta" para um visitante não autenticado na tela de login. A correção correta e idiomática do Next.js App Router é um **grupo de rotas aninhado** `(admin)/(painel)/` contendo apenas `dashboard/`, `produtos/` (subárvore inteira) e `configuracoes/`, com um novo `layout.tsx` próprio para a sidebar — sem afetar nenhuma URL (grupos de rotas nunca aparecem na URL). Essa movimentação de diretório quebra um teste existente com caminho hardcoded (`tests/ui/dark-mode-contrast.test.ts`), documentado abaixo com a correção exata.

A segunda descoberta com peso arquitetural é sobre **onde** disparar a captura de pageview. A leitura direta da documentação oficial do Next.js confirma que páginas dinâmicas sem `loading.tsx` (o caso desta vitrine) **não são pré-buscadas (`prefetch`) pelo `<Link>`** — isso elimina o medo de pageviews falsos por hover/scroll no grid. Mas a mesma página de documentação lista **rastreamento de analytics como o exemplo canônico** de efeito colateral que dispara durante prefetch/generateMetadata em cenários gerais, recomendando mover o disparo para um Client Component (`useEffect`) ou Server Action chamada a partir de um Client Component — e este projeto tem um motivo concreto e específico para seguir exatamente essa recomendação: a própria Fase 5 já instrumentou Open Graph (`generateMetadata`) na página de produto especificamente para que o **crawler de preview do WhatsApp** busque essa URL ao gerar o preview da mensagem de pedido. Um crawler de unfurling não executa JavaScript do cliente — então um disparo em Server Component (executado incondicionalmente a cada GET, inclusive de bots) infla "produtos mais visualizados" a cada vez que um pedido é compartilhado no WhatsApp; um disparo client-side (`useEffect`) é naturalmente imune a esse bot específico. A pesquisa recomenda um Client Component "tracker" (`return null`, mesmo formato de `SessionWatcher` já existente) montado num **novo `layout.tsx`** de `/loja/[slug]/` (não dentro de `page.tsx`) — necessário porque componentes renderizados dentro de `page.tsx` são remontados quando `searchParams` muda (confirmado via pesquisa), o que quebraria D-02 (troca de filtro não pode contar como novo acesso) se o tracker vivesse ali.

Para as agregações Top-10 ("mais visualizados", "cliques WhatsApp por produto"), `supabase-js`/PostgREST **não suporta `GROUP BY` nativamente** (confirmado — múltiplas fontes independentes). A solução idiomática e já usada pela comunidade Supabase é uma **VIEW** Postgres, consultável como uma tabela normal pelo client já usado no projeto — mas toda view Postgres **ignora RLS por padrão** (roda com o papel do dono da view) a menos que seja criada com `with (security_invoker = true)` (Postgres 15+, confirmado disponível em projetos Supabase modernos). Esta é uma regra não-negociável nova, paralela à já existente "toda `create table` + `enable row level security` na mesma migration": toda `create view` de agregação nesta fase PRECISA do `security_invoker = true` na mesma declaração, ou a agregação de uma loja vaza para qualquer sessão autenticada de outra loja.

**Primary recommendation:** Uma tabela nova `pageviews` (schema/RLS espelhando `order_clicks` exatamente) + duas views agregadas (`product_pageview_counts`, `product_order_click_counts`, ambas `security_invoker = true`) + um Client Component tracker montado num novo `layout.tsx` de `/loja/[slug]/` (não em `page.tsx`) + um grupo de rotas aninhado `(admin)/(painel)/` para a nova sidebar — zero dependências novas em todo o escopo.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Decisão de "o que conta como 1 pageview" (dedupe por pathname, imunidade a prefetch/bots) | Browser/Client | — | Só o Client Component sabe se está montado num browser real (não um crawler) e sobrevive a re-renders de `searchParams` sem remontar quando posicionado no `layout.tsx` |
| Persistência do evento de pageview | API/Backend | Database/Storage | Server Action fire-and-forget (mesmo papel de `logOrderClick`) grava via `anon` insert; a segurança real é a RLS na tabela, não o código da Server Action |
| Isolamento multi-tenant dos dados de métrica | Database/Storage | — | RLS em `pageviews`/`order_clicks` + `security_invoker=true` nas views — nenhuma lógica de tenant no app, tudo resolvido no Postgres |
| Agregação Top-10 (mais visualizados, cliques WhatsApp) | Database/Storage | API/Backend | `GROUP BY`/`COUNT` só é eficiente/expressável como view Postgres; o app só faz `.select().eq().order().limit()` contra a view, igual a uma tabela |
| Contadores simples (total/disponível/esgotado/acessos) | API/Backend | Database/Storage | Reaproveita `queryProducts`-style (2 queries + join em memória) + 1 `count:"exact",head:true` novo para acessos — nenhuma SQL de agregação nova necessária |
| Dashboard (cards + listas) | Frontend Server (SSR) | API/Backend | Server Component totalmente dinâmico, sem cache, consumindo as queries acima |
| Sidebar/drawer de navegação | Browser/Client | Frontend Server (SSR) | Estado aberto/fechado do drawer mobile e destaque do link ativo (`usePathname`) são client-side; a estrutura/links em si são renderizados no servidor |
| Escopo de layout (sidebar só nas páginas autenticadas, nunca em login/cadastro) | Frontend Server (SSR) | — | Resolvido por estrutura de rotas (grupo aninhado), não por lógica condicional em runtime — o Next.js App Router não expõe pathname a Server Components de layout (limitação já documentada no próprio `(admin)/layout.tsx`) |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MTR-01 | Revendedor visualiza métricas básicas (acessos à vitrine, produtos mais visualizados, cliques no botão WhatsApp por produto) | Schema/RLS de `pageviews` (Standard Stack, Code Examples); mecanismo de captura imune a prefetch/bots (Common Pitfalls #1-#3); views `product_pageview_counts`/`product_order_click_counts` para os rankings Top-10 (Don't Hand-Roll, Code Examples) |
| MTR-02 | Dashboard exibe métricas resumidas (total de produtos, disponíveis, esgotados, acessos) e lista de produtos recentes | Reaproveitamento de `queryProducts` para total/disponível/esgotado/recentes (Don't Hand-Roll); `count:"exact",head:true` sobre `pageviews` para "acessos" (Code Examples); novo grupo de rotas `(admin)/(painel)/` + sidebar para hospedar a página (Architecture Patterns, Common Pitfalls #4-#5) |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**O que conta como "acesso" (rastreamento de pageview — a criar do zero)**
- **D-01:** "Acessos" (contador geral exibido no card do dashboard) conta **apenas** carregamentos do grid principal da vitrine (`/loja/[slug]`). Visitar a página de detalhe de um produto específico (`/loja/[slug]/[produto]`) **não** soma nesse contador geral — é um evento de pageview separado, que alimenta exclusivamente a métrica "produtos mais visualizados".
- **D-02:** Trocar filtro ou termo de busca na vitrine (navegação client-side dentro da mesma página, sem novo carregamento de rota) **não** conta como um novo acesso — só o carregamento inicial da página soma.
- **D-03:** Todos os números de métrica (acessos, produtos mais visualizados, cliques WhatsApp por produto) são **totais desde sempre (all-time)** — sem janela de tempo/data. Analytics avançado (funis, retenção, cohort, janelas de tempo) está explicitamente fora de escopo do MVP.

**Layout: uma página só + sidebar de navegação global**
- **D-04:** Dashboard (`/dashboard`) é **uma única página** contendo tudo: cards de resumo, lista de produtos recentes, e a seção de desempenho por produto. Não existe uma página `/metricas` separada.
- **D-05 (escopo ampliado, decisão explícita do usuário):** Esta fase também cria uma **sidebar de navegação compartilhada** para todo o painel admin (Dashboard/Produtos/Configurações), substituindo a navegação ad-hoc atual.
- **D-06:** Comportamento responsivo da sidebar: **desktop** = sidebar fixa lateral; **mobile** = colapsa em menu hambúrguer (ícone que abre drawer/overlay com os mesmos links) — mobile-first.
- **D-07:** Itens da sidebar: **Dashboard, Produtos, Configurações**, com **"Sair da conta" fixado no rodapé**, separado visualmente dos links de navegação de página. `signOutAction` (já existe) é reaproveitado, não recriado.

**"Produtos mais visualizados" — critério e quantidade**
- **D-08:** Ranking de "produtos mais visualizados" é **contagem direta de pageviews por produto** (`COUNT(*) GROUP BY product_id`), sem combinar com cliques de WhatsApp num score/fórmula ponderada.
- **D-09:** "Cliques no botão WhatsApp por produto" é uma métrica separada e paralela, derivada de `COUNT(*) GROUP BY product_id` sobre `order_clicks`. Aparece como sua própria lista, nunca fundida num único número.
- **D-10:** Ambas as listas mostram **Top 10** produtos.

### Claude's Discretion
- Estrutura exata da nova tabela de pageview (nome, colunas, índices, tabela única com `product_id` nullable ou duas tabelas) — desde que capture o essencial (store_id, product_id opcional, timestamp) e respeite RLS multi-tenant (owner lê só os próprios dados; `anon` só insere, nunca lê).
- "Lista de produtos recentes" — critério exato de ordenação e quantidade exibida; reaproveitar o padrão "mais recente" já estabelecido (`queryProducts`/`list.ts`).
- Estilo visual exato dos cards de resumo, da sidebar e do menu hambúrguer — segue os tokens visuais já travados no PROJECT.md e os padrões de UI já estabelecidos no painel admin.
- Mecanismo exato de captura do pageview (client-side vs. Server Component) é decisão técnica de research/planning, não do usuário.
- Comportamento de estado vazio dos cards/listas (loja nova, zero acessos/produtos) — segue os padrões de empty state já estabelecidos (Fase 3).

### Deferred Ideas (OUT OF SCOPE)
- Página `/metricas` separada do dashboard — descartada em favor de página única (D-04).
- Score/ranking combinado de "interesse" (visualizações + cliques ponderados) — explicitamente rejeitado (D-08).
- Janela de tempo configurável para métricas (últimos 7/30 dias) — descartada (D-03) em favor de totais all-time.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- Next.js 16 + Tailwind CSS v4 + Supabase (auth + banco + storage) + Vercel — stack já instalado, nenhuma mudança nesta fase.
- Mobile-first obrigatório — sidebar/drawer e cards do dashboard devem funcionar primeiro no mobile.
- Rota pública sem auth: `/loja/[slug]` (e `/loja/[slug]/[produto]`) nunca pode ganhar middleware de autenticação — o novo `layout.tsx` desta subárvore só pode adicionar o resolvedor de `store_id` + tracker, nunca um gate de sessão.
- Performance de imagem / encoding de URL do WhatsApp: não tocados por esta fase (fora de escopo).
- Sem cobrança no MVP: não relevante para esta fase.

## Standard Stack

### Core

Nenhuma dependência nova é necessária nesta fase. Todas as bibliotecas abaixo já estão instaladas (verificado via leitura direta de `package.json`).

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.10 [VERIFIED: package.json] | App Router, Server Components/Actions, `<dialog>`-compatible React 19 runtime | Já instalado; toda a captura de pageview e o dashboard usam só recursos já usados nas Fases 1-5 (Server Components dinâmicos, Server Actions, `next/navigation`) |
| react / react-dom | 19.2.4 [VERIFIED: package.json] | Client Components (tracker, sidebar), `useEffect`/`useTransition`/refs para `<dialog>` | Já instalado |
| @supabase/supabase-js + @supabase/ssr | 2.110.2 / 0.12.0 [VERIFIED: package.json] | Client tipado para a nova tabela `pageviews` e as duas views agregadas | Já instalado; views Postgres são consultadas exatamente como tabelas por este client |
| tailwindcss | ^4 [VERIFIED: package.json] | Estilização do sidebar/drawer/cards, incluindo o variant nativo `backdrop:` para o `<dialog>` | Já instalado; `backdrop:` existe desde Tailwind 3.1 e continua em v4 [CITED: benjamincrozat.com/dialog-backdrop-styling-tailwind-css] |
| lucide-react | ^1.24.0 [VERIFIED: package.json] | Ícones de hambúrguer/fechar (Menu/X) e ícones dos stat cards (ex.: Eye, MessageCircle, Package) | Já instalado; mesma família de ícones do resto do painel |
| clsx + tailwind-merge | ^2.1.1 / ^3.6.0 [VERIFIED: package.json] | Composição condicional de className no sidebar (link ativo) e nos stat cards | Já instalado, mesmo padrão `cn()` já usado em `product-order-panel.tsx`/`size-grid.tsx` |

### Supporting

Nenhuma. Esta fase não introduz nenhuma biblioteca de suporte nova.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<dialog>` nativo para o drawer mobile | Radix UI Dialog/Sheet, Headless UI, vaul | Nenhuma dessas está instalada hoje (verificado em `package.json`) — adicionar qualquer uma quebra o padrão de "sem nova dependência a menos que justificada" já seguido em todo o projeto (nenhum shadcn/Radix/Headless UI em nenhuma fase anterior). `<dialog>` nativo dá focus trap, Escape-to-close e `::backdrop` de graça, sem dependência [CITED: dev.to/olexandra_imereli_c8fc210/using-native-dialog-for-your-react-modal-4ffi]. Reconsiderar Radix só se o produto crescer para precisar de mais primitivos de UI (tooltips, popovers) ao mesmo tempo. |
| VIEW Postgres para agregação Top-10 | RPC (função Postgres/PL-pgSQL) | RPC é mais flexível (parâmetros, lógica condicional) mas introduz um segundo estilo de "código SQL" no projeto (função vs. só tabelas+views+policies até agora). Uma view pura (`CREATE VIEW ... AS SELECT ...`) é uma única declaração SQL, sem corpo de função, mais próxima do estilo das migrations já existentes. |
| Client Component tracker (`useEffect`) | Server Component insert direto no corpo de `page.tsx` | Mais simples de escrever, mas (a) não é imune a bots/crawlers (WhatsApp/Google) que fazem GET real na rota, inflando "mais visualizados" a cada preview de link compartilhado; (b) a própria documentação oficial do Next.js recomenda mover esse tipo de efeito colateral para fora do corpo do Server Component [CITED: nextjs.org/docs/app/guides/prefetching, seção "Troubleshooting"]. |
| Grupo de rotas aninhado `(admin)/(painel)/` | `middleware.ts` para decidir renderizar sidebar por path | O matcher do middleware deste projeto é `/admin/:path*`, que não cobre nenhuma rota real (todas vivem fora de `/admin` literal na URL — grupo de rotas não aparece na URL). Mudar o matcher myself introduziria risco de acoplar auth ao sidebar, contra a disciplina já estabelecida de nunca fundir os dois gates. Grupo de rotas resolve por estrutura de arquivos, sem nenhuma lógica em runtime. |

**Installation:**
```bash
# Nenhuma instalação necessária — todas as dependências já estão em package.json.
```

**Version verification:** Nenhum pacote novo é adicionado nesta fase; todas as versões acima foram confirmadas por leitura direta de `package.json` (mais autoritativo que `npm view` para "o que este projeto usa hoje").

## Package Legitimacy Audit

**Não aplicável — esta fase não instala nenhum pacote novo.** Todo o trabalho (tabela + views Postgres, Server Action, Client Components, grupo de rotas) usa exclusivamente dependências já auditadas/aprovadas em fases anteriores (`lucide-react` já passou pelo gate de legitimidade na Fase 2, ver STATE.md).

**Packages removed due to [SLOP] verdict:** nenhum (nenhum pacote novo avaliado)
**Packages flagged as suspicious [SUS]:** nenhum

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
                         │  Qualquer GET em /loja/[slug]{/[produto]}    │
                         │  (cliente real, Googlebot, crawler WhatsApp) │
                         └───────────────────┬───────────────────────────┘
                                             ▼
                         ┌─────────────────────────────────────────────┐
                         │ src/app/loja/[slug]/layout.tsx  (NOVO)       │
                         │ Server Component — resolve store.id (slug)   │
                         │ renderiza <PageviewTracker storeId=…/>       │
                         └───────────────────┬───────────────────────────┘
                                             │ (hidrata no browser real;
                                             │  crawlers não executam JS)
                                             ▼
                         ┌─────────────────────────────────────────────┐
                         │ PageviewTracker (Client, "use client")       │
                         │ usePathname() → deriva productId (null=grid  │
                         │ /loja/slug ; id=/loja/slug/produto)           │
                         │ useEffect([pathname]) → dispara 1x por       │
                         │ pathname distinto (sobrevive a mudança de    │
                         │ searchParams = filtro, D-02)                  │
                         └───────────────────┬───────────────────────────┘
                                             ▼ startTransition + .catch(()=>{})
                         ┌─────────────────────────────────────────────┐
                         │ logPageview() Server Action ("use server")   │
                         │ INSERT bare em pageviews (fire-and-forget)   │
                         └───────────────────┬───────────────────────────┘
                                             ▼
                         ┌─────────────────────────────────────────────┐
                         │ RLS WITH CHECK: valida product_id/store_id   │
                         │ consistentes + produto publicado (se houver) │
                         │ anon: só INSERT, nunca SELECT                │
                         └───────────────────┬───────────────────────────┘
                                             ▼
                                    tabela `pageviews`
                                    (store_id, product_id?, created_at)
                                             │
        ┌────────────────────────────────────┼────────────────────────────────┐
        ▼                                    ▼                                ▼
 product_pageview_counts VIEW      "acessos" = count(*)              order_clicks (Fase 5,
 (GROUP BY product_id,             where product_id is null          já existe, só consumido)
 security_invoker=true)            (head:true, sem GROUP BY)                   │
        │                                    │                                ▼
        │                                    │                    product_order_click_counts VIEW
        │                                    │                    (GROUP BY product_id,
        │                                    │                     security_invoker=true)
        ▼                                    ▼                                ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│           GET /dashboard  (revendedor autenticado, requireCompletedOnboarding)      │
│  src/app/(admin)/(painel)/layout.tsx (NOVO) → <AdminSidebar/> + <main>{children}     │
│  src/app/(admin)/(painel)/dashboard/page.tsx (REESCRITO) →                          │
│    queryProducts(storeId)        → total / disponível / esgotado / recentes         │
│    count(pageviews, product_id null) → "acessos"                                    │
│    product_pageview_counts.limit(10) + join em memória com products (nomes)         │
│    product_order_click_counts.limit(10) + join em memória com products (nomes)      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
supabase/migrations/
└── 0006_pageviews_and_metric_views.sql   # NOVO: tabela pageviews + RLS + 2 views agregadas

src/lib/
├── products/
│   ├── pageview-actions.ts               # NOVO: logPageview (espelha order-clicks-actions.ts)
│   └── list.ts                           # REAPROVEITADO sem mudança: queryProducts
└── dashboard/
    └── metrics.ts                        # NOVO: queryTopViewedProducts, queryTopOrderClickProducts, queryAccessCount

src/app/loja/[slug]/
├── layout.tsx                            # NOVO: resolve store_id por slug, renderiza tracker
├── pageview-tracker.tsx                  # NOVO: Client Component, usePathname()-driven
└── [produto]/page.tsx                    # SEM MUDANÇA (tracker vive no layout pai)

src/app/(admin)/
├── layout.tsx                            # SEM MUDANÇA — continua compartilhado com páginas públicas de auth
└── (painel)/                             # NOVO grupo de rotas aninhado (invisível na URL)
    ├── layout.tsx                        # NOVO: <AdminSidebar/> + único <main>{children}</main>
    ├── dashboard/page.tsx                # MOVIDO + REESCRITO (raiz vira <div>, não <main> — ver Pitfall 5)
    ├── produtos/                         # MOVIDO como subárvore inteira, conteúdo interno sem mudança
    │   ├── page.tsx
    │   ├── novo/page.tsx
    │   └── [id]/editar/page.tsx
    └── configuracoes/page.tsx            # MOVIDO, conteúdo interno sem mudança

src/components/
└── admin-sidebar.tsx                     # NOVO: Client Component (mesma pasta de session-watcher.tsx)

tests/
├── rls/pageviews-rls.test.ts             # NOVO: espelha order-clicks-rls.test.ts
├── dashboard/metrics-aggregation.test.ts # NOVO: contagens + ranking Top-10 + isolamento cross-tenant
└── ui/dark-mode-contrast.test.ts         # ATUALIZADO: entrada do dashboard repontada para (painel)/layout.tsx
```

### Pattern 1: Tabela de evento com RLS "anon insert-only, owner read-scoped" (espelha `order_clicks`)
**What:** Uma única tabela `pageviews` com `product_id` nullable distingue "acesso ao grid" (`product_id is null`) de "visualização de produto" (`product_id` preenchido) — exatamente o tratamento que CONTEXT.md pede para D-01, e a MESMA estrutura de RLS de `order_clicks` (Fase 5): dono lê só os próprios dados, `anon` só insere.
**When to use:** Sempre que um evento de analytics precisa ser gravado por um visitante sem sessão (papel `anon` no Postgres) e lido só pelo dono da loja.
**Example:**
```sql
-- Source: supabase/migrations/0005_order_clicks_and_public_whatsapp.sql (padrão existente,
-- adaptado para product_id nullable)
create table pageviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid references products(id) on delete cascade, -- NULL = acesso ao grid (D-01)
  created_at timestamptz not null default now()
);

create index pageviews_store_id_idx on pageviews (store_id);
-- índice parcial: só as linhas de visualização de produto entram no ranking (D-08)
create index pageviews_product_id_idx on pageviews (product_id) where product_id is not null;

alter table pageviews enable row level security;

create policy "owner_read_pageviews" on pageviews
  for select
  using (store_id in (select id from stores where owner_id = auth.uid()));

-- anon só insere — nenhuma policy SELECT para anon, por design (mesmo Pitfall 2 de 05-RESEARCH.md)
create policy "public_insert_pageviews" on pageviews
  for insert
  to anon
  with check (
    (
      -- acesso ao grid (D-01): sem product_id, só exige que a loja tenha
      -- pelo menos 1 produto publicado (mesma defesa em profundidade da
      -- policy public_read_store_settings_for_published_stores de 0005)
      product_id is null
      and store_id in (select store_id from products where status = 'published')
    )
    or
    (
      -- visualização de produto: mesmo check exato de order_clicks
      product_id in (
        select id from products where store_id = pageviews.store_id and status = 'published'
      )
    )
  );
```

### Pattern 2: Views agregadas com `security_invoker = true` para ranking Top-N (resolve Open Question 4)
**What:** `supabase-js`/PostgREST não expressam `GROUP BY` [CITED: github.com/orgs/supabase/discussions/19517]. Duas views (uma por métrica, nunca fundidas — D-09) pré-agregam `COUNT(*) GROUP BY product_id`, consultadas pelo app exatamente como uma tabela.
**When to use:** Sempre que o app precisa de um ranking/contagem agrupada que o volume de linhas torna caro de buscar por completo e agregar em memória (diferente do padrão "2 queries + join em memória" já usado para `product_sizes`/`product_photos`, que têm no máximo dezenas de linhas por produto).
**Example:**
```sql
-- Source: supabase.com/docs (security_invoker) + supabase discussions #19517/#626 (padrão de view p/ GROUP BY)
create view product_pageview_counts
  with (security_invoker = true) as
select store_id, product_id, count(*) as views
from pageviews
where product_id is not null
group by store_id, product_id;

create view product_order_click_counts
  with (security_invoker = true) as
select store_id, product_id, count(*) as clicks
from order_clicks
group by store_id, product_id;
```
```typescript
// App layer — consulta a view igual a uma tabela, mesmo padrão de queryProducts
const { data: topViews } = await supabase
  .from("product_pageview_counts")
  .select("product_id, views")
  .eq("store_id", storeId)
  .order("views", { ascending: false })
  .limit(10);

// join em memória com products (nomes) — mesmo padrão de queryProducts/queryPublicProducts,
// NUNCA embutir o nome do produto dentro da view.
const { data: products } = await supabase
  .from("products")
  .select("id, name, brand, brand_other")
  .in("id", (topViews ?? []).map((r) => r.product_id));
```

### Pattern 3: Client Component "tracker" invisível montado no `layout.tsx` (não no `page.tsx`)
**What:** Um Client Component que retorna `null`, montado uma vez por segmento de rota, disparando uma Server Action fire-and-forget dentro de `useEffect`. Mesmo formato de `SessionWatcher` (já existe no projeto), mas reagindo a `usePathname()` em vez de `onAuthStateChange`.
**When to use:** Qualquer captura de evento client-side que precise (a) sobreviver a mudanças de `searchParams` sem re-disparar (D-02) e (b) não disparar para requisições de servidor puras (bots/crawlers que nunca hidratam JS).
**Example:**
```typescript
// Source: mesmo padrão de src/components/session-watcher.tsx (useEffect + return null) +
// mesmo padrão fire-and-forget de src/app/loja/[slug]/[produto]/product-order-panel.tsx
// (startTransition + .catch(() => {}))
"use client";

import { startTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageview } from "@/lib/products/pageview-actions";

export function PageviewTracker({ storeId }: { storeId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // pathname: "/loja/{slug}" (grid, D-01) ou "/loja/{slug}/{produto}" (detalhe)
    const segments = pathname.split("/").filter(Boolean); // ["loja", slug, produto?]
    const productId = segments.length >= 3 ? segments[2] : null;

    startTransition(() => {
      logPageview(storeId, productId).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
```
```typescript
// src/app/loja/[slug]/layout.tsx (NOVO) — resolve store_id 1x, sobrevive a mudança de searchParams
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageviewTracker } from "./pageview-tracker";

export default async function LojaLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase.from("stores").select("id").eq("slug", slug).single();

  return (
    <>
      {store && <PageviewTracker storeId={store.id} />}
      {children}
    </>
  );
}
```

### Pattern 4: Grupo de rotas aninhado para escopar a sidebar só às páginas autenticadas
**What:** `src/app/(admin)/(painel)/` — um segundo grupo de rotas dentro de `(admin)/`, contendo só `dashboard/`, `produtos/` e `configuracoes/`. Grupos de rotas `(nome)` nunca aparecem na URL — `/dashboard` continua `/dashboard`.
**When to use:** Sempre que um subconjunto de rotas dentro de um grupo já existente precisa de um layout adicional (aqui: a sidebar) sem afetar as demais rotas do grupo pai (aqui: `/login`, `/cadastro`, etc.).
**Example:**
```typescript
// src/app/(admin)/(painel)/layout.tsx (NOVO)
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="min-h-dvh flex-1 bg-white">{children}</main>
    </div>
  );
}
```

### Pattern 5: Desktop `<aside>` fixo + mobile `<dialog>` — ambos sempre renderizados, CSS decide visibilidade
**What:** Mesma técnica já usada em `src/app/loja/[slug]/page.tsx` para `PaginationNumbered`/`LoadMoreButton` (`hidden md:flex` / `flex md:hidden`) — aqui aplicada à sidebar/drawer.
**When to use:** Qualquer par desktop/mobile de componentes mutuamente exclusivos, quando o projeto já evita detecção de device via JS.
**Example:**
```typescript
// Source: mesma técnica hidden md:flex / flex md:hidden de src/app/loja/[slug]/page.tsx
// (padrão já estabelecido na Fase 4) + backdrop: (Tailwind, nativo desde 3.1)
// + <dialog>.showModal() (não o atributo `open`, que não dá modal/backdrop/focus-trap)
"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/produtos", label: "Produtos" },
  { href: "/configuracoes", label: "Configurações" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function NavLinks() {
    return (
      <>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? "font-semibold text-[#0D3D2B]" : "text-[#6B6B6B]"}
          >
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      {/* Desktop: sidebar fixa, sempre no DOM, só visível >= md */}
      <aside className="hidden w-56 shrink-0 flex-col gap-4 border-r border-[#F5F5F3] bg-white p-4 md:flex">
        <nav className="flex flex-col gap-3">
          <NavLinks />
        </nav>
        <form action={signOutAction} className="mt-auto">
          <button type="submit" className="text-sm text-[#6B6B6B]">Sair da conta</button>
        </form>
      </aside>

      {/* Mobile: hambúrguer + <dialog> nativo, sempre no DOM, só visível < md */}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex min-h-11 min-w-11 items-center justify-center md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Menu de navegação"
        className="m-0 h-dvh max-h-none w-64 max-w-none bg-white p-4 backdrop:bg-black/50"
        onCancel={() => dialogRef.current?.close()}
      >
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Fechar menu">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <nav className="mt-4 flex flex-col gap-3">
          <NavLinks />
        </nav>
        <form action={signOutAction} className="mt-auto">
          <button type="submit" className="text-sm text-[#6B6B6B]">Sair da conta</button>
        </form>
      </dialog>
    </>
  );
}
```

### Anti-Patterns to Avoid
- **Disparar o pageview dentro do corpo de `page.tsx` (Server Component):** executa a cada GET, inclusive de crawlers/bots (Googlebot, preview do WhatsApp) — infla contadores sem visitante real. Ver Common Pitfall #1/#2.
- **Colocar o tracker dentro de `page.tsx` em vez de `layout.tsx`:** componentes em `page.tsx` remontam quando `searchParams` muda, re-disparando o pageview a cada troca de filtro — quebra D-02 diretamente. Ver Common Pitfall #3.
- **`create view` sem `with (security_invoker = true)`:** a view roda com o papel do dono (geralmente bypassa RLS) — qualquer sessão autenticada conseguiria ler agregados de TODAS as lojas, não só a própria. Ver Common Pitfall #6.
- **Editar `(admin)/layout.tsx` diretamente para adicionar a sidebar:** vaza a sidebar (com "Sair da conta") para `/login`, `/cadastro`, `/onboarding`, `/esqueci-senha`, `/redefinir-senha`. Ver Common Pitfall #4.
- **Dois elementos `<main>` aninhados (um no novo `(painel)/layout.tsx`, outro em cada `page.tsx` movida):** inválido em termos de landmark HTML5/a11y. Ver Common Pitfall #5.
- **Fundir "mais visualizados" e "cliques WhatsApp" num único score/ranking:** explicitamente rejeitado por D-08 — são sempre listas paralelas e separadas.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contagem de total/disponível/esgotado de produtos | Uma nova query SQL agregada (`COUNT` + `EXISTS`/`JOIN`) | Reaproveitar `queryProducts(supabase, storeId, {})` (já existe, já calcula `disponivel: boolean` por produto) e derivar as 3 contagens por `.reduce`/`.filter` em memória sobre o array retornado | `queryProducts` já resolve exatamente essa disponibilidade derivada (EXISTS sobre `product_sizes.available`); reimplementar em SQL duplicaria lógica já testada (`tests/products/list-filter-sort.test.ts`) |
| Lista de "produtos recentes" | Nova query ordenada por `created_at` | O mesmo `queryProducts(supabase, storeId, {})` (sort padrão já é `recente`/`created_at desc`) — `slice(0, N)` do array retornado | Um único chamado de `queryProducts` serve TANTO os contadores quanto a lista de recentes — zero SQL nova para MTR-02 |
| Ranking Top-10 agrupado por produto | Buscar todas as linhas de `pageviews`/`order_clicks` e agrupar/contar em JavaScript | Views Postgres (`product_pageview_counts`/`product_order_click_counts`) com `security_invoker=true`, consultadas via `.select().eq().order().limit(10)` | Buscar todas as linhas cresce sem limite com o tempo (contagem all-time, D-03, sem janela) — uma view com `GROUP BY` empurra o trabalho de agregação para o Postgres, que já é otimizado para isso; o app nunca vê mais que 10 linhas |
| Detecção de bot/crawler no pageview | Parsing de `User-Agent` manual + lista de regex de bots conhecidos | Disparo client-side (`useEffect`) em vez de Server Component | A maioria dos crawlers relevantes para este produto (WhatsApp/Facebook/Telegram unfurl bots) não executa JavaScript — um disparo client-side já os exclui de graça, sem manutenção de lista de UA [ASSUMED — comportamento geral bem documentado de crawlers de unfurling, não verificado neste projeto especificamente] |
| Drawer mobile com focus trap/Escape/backdrop | Um modal customizado com `useState` + listener manual de `keydown` + `div` de overlay | `<dialog>` nativo + `.showModal()` | Focus trap, tecla Escape (evento `cancel`) e `::backdrop` são nativos do browser desde 2022, cobrindo ~96% dos usuários [CITED: dev.to/ilham-bouktir/the-html-dialog-element-your-native-solution-for-accessible-modals-and-popups-308p] — zero JS de acessibilidade para escrever/manter |

**Key insight:** As únicas duas peças genuinamente novas de lógica de agregação nesta fase são as duas views Postgres (Top-10) — tudo o mais (contadores, recentes, drawer, RLS) é reaproveitamento direto de padrões já implementados e testados nas Fases 3-5.

## Common Pitfalls

### Pitfall 1: Prefetch do `<Link>` disparando pageviews falsos ao rolar o grid
**What goes wrong:** Cada card de produto no grid é um `<Link href="/loja/[slug]/[produto]">` (confirmado em `product-card.tsx`) — se o pageview fosse gravado no corpo de `page.tsx`, um usuário rolando a lista poderia "visitar" dezenas de produtos sem clicar em nada.
**Why it happens:** O Next.js pré-busca automaticamente links que entram no viewport.
**How to avoid:** Confirmado via documentação oficial (fetch direto, 2026-06-23): **rotas dinâmicas sem `loading.tsx` NÃO são pré-buscadas** ("No, unless `loading.js`") [CITED: nextjs.org/docs/app/guides/prefetching]. Como nenhuma rota deste projeto tem `loading.tsx` (confirmado — `find` não retornou nenhum arquivo), o prefetch do grid já está, na prática, desligado. Ainda assim, **não** adicionar `loading.tsx` a `/loja/[slug]/[produto]` no futuro sem reconsiderar este ponto — isso ligaria prefetch parcial novamente.
**Warning signs:** Contadores de "mais visualizados" crescendo em ordem de posição no grid (produto 1, 2, 3...) em vez de correlacionar com cliques reais.

### Pitfall 2: Crawlers (WhatsApp/Google/Facebook) inflando "produtos mais visualizados"
**What goes wrong:** A Fase 5 adicionou `generateMetadata`/Open Graph em `/loja/[slug]/[produto]/page.tsx` especificamente para o preview do WhatsApp funcionar bem quando um pedido é compartilhado. Isso significa que o crawler de unfurling do WhatsApp (e potencialmente Googlebot, Facebook, Telegram) faz um GET real nessa URL toda vez que uma mensagem de pedido com o link do produto é enviada/compartilhada — se o pageview disparasse incondicionalmente no Server Component, cada pedido feito infla "mais visualizados" do próprio produto, mesmo sem nenhum visitante humano novo.
**Why it happens:** Do ponto de vista do servidor, um GET de crawler é indistinguível de um GET de navegador real — ambos executam o Server Component inteiro (é assim que o HTML com as tags OG chega ao crawler).
**How to avoid:** Disparar o pageview a partir de um Client Component (`useEffect`), nunca do corpo do Server Component — a documentação oficial do Next.js recomenda exatamente isso, usando rastreamento de analytics como o próprio exemplo do problema [CITED: nextjs.org/docs/app/guides/prefetching, seção "Triggering unwanted side-effects during prefetching"]. Crawlers de unfurling não executam JavaScript do cliente, então nunca chegam a montar o Client Component.
**Warning signs:** Picos de "visualizações" de um produto específico correlacionados no tempo com pedidos feitos daquele produto, sem tráfego correspondente na vitrine.

### Pitfall 3: Tracker dentro de `page.tsx` remonta a cada troca de filtro (quebra D-02)
**What goes wrong:** Componentes definidos dentro de `page.tsx` são remontados quando o próprio `searchParams` (prop que `page.tsx` recebe) muda — confirmado via pesquisa: "State is NOT automatically preserved when searchParams change... the layout router will cause all components on the page to get unmounted and remounted" [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params + discussão da comunidade]. Como os filtros da vitrine (`product-filters.tsx`) mudam a URL via `router.push` para o MESMO pathname com `searchParams` diferente, um tracker posicionado em `page.tsx` dispararia de novo a cada troca de filtro — exatamente o que D-02 proíbe.
**Why it happens:** `page.tsx` recebe `searchParams` como prop; o Next.js precisa re-renderizar esse segmento (e seus filhos) sempre que essa prop muda, mesmo que o `pathname` seja idêntico.
**How to avoid:** Montar o tracker no `layout.tsx` de `/loja/[slug]/` (que só recebe `params`, nunca `searchParams`) — layouts não são remontados por mudança de `searchParams`. Dentro do tracker, usar `usePathname()` (que exclui a query string por definição) como dependência do `useEffect`, garantindo que o efeito só reaja a mudanças reais de rota (novo produto, ou grid↔detalhe), nunca a filtro/busca.
**Warning signs:** Contador de "acessos" crescendo a cada clique num chip de filtro/busca, não só no carregamento inicial da vitrine.

### Pitfall 4: Sidebar vazando para páginas públicas de autenticação
**What goes wrong:** `src/app/(admin)/layout.tsx` hoje envolve TANTO as páginas protegidas (`/dashboard`, `/produtos*`, `/configuracoes`) QUANTO as páginas públicas de auth (`/login`, `/cadastro`, `/onboarding`, `/esqueci-senha`, `/redefinir-senha`) — confirmado pelo comentário explícito em `login/page.tsx`: "Esta página NÃO fica atrás de gate de sessão: é uma entrada pública do grupo `(admin)`". Editar esse layout para incluir a sidebar faria "Dashboard/Produtos/Configurações/Sair da conta" aparecer na tela de login, antes de qualquer sessão existir.
**Why it happens:** O nome do grupo de rotas `(admin)` sugere "área autenticada", mas na prática ele também hospeda o fluxo público de entrada — uma decisão de organização de arquivos da Fase 1, não de auth.
**How to avoid:** Criar um grupo de rotas aninhado `(admin)/(painel)/` contendo só `dashboard/`, `produtos/` (subárvore inteira) e `configuracoes/`, com seu próprio `layout.tsx` para a sidebar. Grupos de rotas nunca aparecem na URL — `/dashboard` continua `/dashboard` depois da mudança. `(admin)/layout.tsx` (SessionWatcher) permanece inalterado e continua envolvendo tudo, inclusive o novo grupo aninhado.
**Warning signs:** Sidebar/hambúrguer visível em `/login` ou `/cadastro` durante verificação manual.

### Pitfall 5: Dois elementos `<main>` aninhados após introduzir o layout da sidebar
**What goes wrong:** `dashboard/page.tsx` (e, pelo padrão consistente observado em `loja/[slug]/page.tsx` e `[produto]/page.tsx`, muito provavelmente `produtos/page.tsx`, `produtos/novo/page.tsx`, `produtos/[id]/editar/page.tsx` e `configuracoes/page.tsx` também) hoje renderizam seu próprio elemento raiz `<main className="bg-white ...">`. Se o novo `(painel)/layout.tsx` também renderizar um `<main>{children}</main>` envolvendo essas páginas, o documento terá dois elementos `<main>` aninhados — inválido como landmark HTML5/a11y (deveria haver só um `<main>` por página).
**Why it happens:** Cada página foi originalmente escrita como página completa e independente (antes de existir um layout de sidebar); introduzir o layout sem ajustar as páginas duplica o landmark.
**How to avoid:** Mover o `<main className="bg-white ...">` para o novo `(painel)/layout.tsx` (um único lugar) e trocar o elemento raiz de cada uma das 5 páginas protegidas de `<main>` para `<div>`/`<section>` (mantendo `bg-white` e as demais classes). **Isso quebra `tests/ui/dark-mode-contrast.test.ts`**, que hoje verifica `src/app/(admin)/dashboard/page.tsx` via regex `<main[^>]*className="([^"]*)"` esperando `bg-white` — a entrada `dashboard/page.tsx` desse teste precisa ser atualizada para apontar para o novo `(painel)/layout.tsx` (onde o `bg-white` passa a viver). As outras 5 entradas do teste (`onboarding-wizard.tsx`, `cadastro`, `login`, `esqueci-senha`, `redefinir-senha`) não são afetadas — continuam fora do grupo `(painel)`, com seu próprio `<main>` inalterado.
**Warning signs:** Warning de acessibilidade "multiple main landmarks" em ferramentas de auditoria (axe/Lighthouse); teste `dark-mode-contrast.test.ts` falhando com `ENOENT` (arquivo movido) ou com o match de regex retornando `null` (elemento raiz não é mais `<main>`).

### Pitfall 6: View de agregação sem `security_invoker = true` vaza dados cross-tenant
**What goes wrong:** Views Postgres, por padrão, executam com o papel de quem CRIOU a view (tipicamente o dono/`postgres`), não de quem a está consultando — isso significa que a view **ignora a RLS das tabelas base** a menos que seja marcada explicitamente. Uma view assim, mesmo sem nenhuma policy própria, deixaria QUALQUER sessão autenticada (`authenticated`) ler as contagens agregadas de TODAS as lojas, não só a própria — quebra o isolamento multi-tenant que é a premissa de segurança #1 do projeto inteiro.
**Why it happens:** Esse é o comportamento padrão do Postgres para views, não um bug do Supabase — mas é surpreendente o suficiente para o próprio linter de segurança do Supabase ter uma regra dedicada para isso [CITED: dev.to/datadeer/postgres-views-the-hidden-security-gotcha-in-supabase-ckd].
**How to avoid:** Toda `create view` de agregação nesta fase DEVE incluir `with (security_invoker = true)` na MESMA declaração (Postgres 15+, disponível em projetos Supabase modernos) [CITED: supabase.com/docs — padrão confirmado por múltiplas fontes independentes]. Isso não é opcional/estilo — é o análogo, para views, do "toda `create table` + `enable row level security` na mesma migration" já não-negociável neste projeto. Views não têm um comando `ENABLE ROW LEVEL SECURITY` próprio (isso é exclusivo de tabelas) — `security_invoker` é o mecanismo correto e único.
**Warning signs:** Um teste de isolamento cross-tenant (mirror de `tests/rls/product-isolation.test.ts`) contra as duas novas views deveria ser o primeiro teste escrito, não o último — se passar sem `security_invoker=true`, o teste está testando a coisa errada (ex.: usando o client anon, que realmente não teria acesso, em vez de um segundo dono autenticado tentando ler a loja de outro dono).

### Pitfall 7: React Strict Mode duplica o disparo do tracker em desenvolvimento (não afeta produção)
**What goes wrong:** Em `next dev`, o Strict Mode do React monta/desmonta/monta componentes de propósito para expor bugs de efeito sem cleanup — isso faz `PageviewTracker` disparar `logPageview` duas vezes por navegação real durante o desenvolvimento local.
**Why it happens:** Comportamento documentado e intencional do React em modo desenvolvimento; não ocorre em build de produção (`next build`/deploy Vercel).
**How to avoid:** Aceitar como ruído de desenvolvimento (não afeta dados de produção) — não vale a complexidade de um guard de deduplicação (ex.: `useRef` companion) só para isso. Se o revendedor olhar o dashboard durante uma sessão de `npm run dev`, os números podem parecer levemente inflados; isso é esperado e não é um bug a corrigir.
**Warning signs:** Contagens exatamente em dobro (ou próximo disso) SÓ ao testar localmente com `npm run dev`, nunca em produção/preview da Vercel.

### Pitfall 8: Esquecer de regenerar `database.types.ts` após a migration
**What goes wrong:** As duas views novas (`product_pageview_counts`, `product_order_click_counts`) e a tabela `pageviews` só ficam disponíveis com tipos corretos em `supabase.from(...)` depois que `supabase gen types typescript` é executado novamente — sem isso, o TypeScript não reconhece esses nomes (ou os trata como `any`), mascarando erros de digitação em nomes de coluna.
**Why it happens:** `database.types.ts` é gerado, não escrito à mão — é fácil aplicar a migration e esquecer o passo de regeneração.
**How to avoid:** Tratar "rodar `supabase gen types typescript` " como parte inseparável da task de migration, igual ao que já é prática implícita do projeto (ferramenta já listada em CLAUDE.md).
**Warning signs:** Erros de tipo `Property 'product_pageview_counts' does not exist` ou `any` implícito nas novas queries.

## Code Examples

Ver seção **Architecture Patterns** acima — todos os exemplos de código relevantes (migration SQL completa, `logPageview`, `PageviewTracker`, `layout.tsx` da vitrine, `(painel)/layout.tsx`, `AdminSidebar` com `<dialog>`) já estão inline nos Patterns 1-5, com a fonte de cada trecho anotada.

### Server Action `logPageview` (espelha `logOrderClick` exatamente)
```typescript
// Source: src/lib/products/order-clicks-actions.ts (padrão existente, adaptado para
// productId opcional)
"use server";

import { createClient } from "@/lib/supabase/server";

export async function logPageview(storeId: string, productId: string | null): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("pageviews").insert({ store_id: storeId, product_id: productId });

    if (error) {
      console.error("logPageview: insert falhou", error);
    }
  } catch (err) {
    console.error("logPageview: erro inesperado", err);
  }
}
```

### Contagem simples "acessos" (sem GROUP BY, reaproveitando o padrão `count:"exact",head:true` já usado em `page.tsx` da vitrine)
```typescript
// Source: mesmo padrão de src/app/loja/[slug]/page.tsx (totalPublished via count:"exact",head:true)
const { count: acessos } = await supabase
  .from("pageviews")
  .select("id", { count: "exact", head: true })
  .eq("store_id", storeId)
  .is("product_id", null); // D-01: só grid loads contam como "acesso"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Agregação `GROUP BY` só via view Postgres | PostgREST agora suporta `count()`/`sum()`/`avg()`/`min()`/`max()` diretamente na query string, mas exige habilitar `pgrst.db_aggregates_enabled` a nível de projeto e ainda não expõe `GROUP BY` dimensional arbitrário | Recurso relativamente recente do PostgREST [CITED: supabase.com/blog/postgrest-aggregate-functions] | Não muda a recomendação desta fase — o caso de uso aqui é especificamente "COUNT agrupado por `product_id`" (uma dimensão), que continua exigindo view ou RPC mesmo com esse recurso habilitado |
| Next.js Pages Router: prefetch sempre buscava a página inteira | App Router: rotas dinâmicas sem `loading.js` **não** são pré-buscadas por padrão | Comportamento do App Router (Next.js 13+, confirmado ainda válido na doc atual do Next 16.2.10) | Reduz drasticamente o risco de pageviews falsos por hover/scroll — mas não elimina o risco de bots/crawlers fazendo GET real (Pitfall 2), que é o cenário dominante de risco para este projeto especificamente |

**Deprecated/outdated:**
- Nenhum — esta fase não usa nenhuma API/biblioteca com substituto mais recente conhecido.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Crawlers de unfurling (WhatsApp/Facebook/Telegram) não executam JavaScript do cliente, portanto um tracker `useEffect` os exclui naturalmente | Common Pitfalls #2, Don't Hand-Roll | Se algum desses crawlers passar a executar JS (comportamento que MUDOU para o Googlebot nos últimos anos), "mais visualizados" volta a inflar por compartilhamentos de pedido — mitigação de fallback: filtro de `User-Agent` no `logPageview`, não implementado por ora por ser desnecessário hoje |
| A2 | O projeto Supabase deste app roda Postgres 15+ (necessário para `security_invoker` em views) | Common Pitfall #6, Standard Stack | Se o projeto estiver em Postgres < 15 (improvável para um projeto criado em 2026), `with (security_invoker = true)` falha na criação da view com erro de sintaxe — verificar com `SHOW server_version;` antes de aplicar a migration 0006 |
| A3 | Produtos/novo/page.tsx, produtos/[id]/editar/page.tsx e configuracoes/page.tsx também têm `<main className="bg-white ...">` como elemento raiz (confirmado diretamente só para `dashboard/page.tsx`, `loja/[slug]/page.tsx` e `[produto]/page.tsx`) | Common Pitfall #5 | Se alguma dessas páginas tiver uma estrutura raiz diferente, o ajuste "trocar `<main>` por `<div>`" precisa ser adaptado por página — recomenda-se um grep rápido (`grep -n "^\s*<main"`) antes de mover os arquivos |
| A4 | Uma view sem `GRANT` explícito herda automaticamente os privilégios que `authenticated`/`anon` já têm no schema `public` (nenhuma das 5 migrations existentes tem um `GRANT` manual) | Code Examples, Pattern 2 | Se a leitura da view retornar "permission denied" em vez de dados filtrados por RLS, pode ser necessário `grant select on product_pageview_counts to authenticated;` explicitamente |

**If this table is empty:** N/A — ver tabela acima.

## Open Questions

1. **Nome exato do grupo de rotas aninhado (`(painel)` vs. outro nome)**
   - What we know: precisa ser um grupo de rotas (parênteses) para não afetar a URL, e precisa envolver exatamente `dashboard/`, `produtos/` e `configuracoes/`.
   - What's unclear: o nome exato (`(painel)`, `(protected)`, `(dashboard)`) é só uma escolha de organização de arquivos, sem impacto funcional.
   - Recommendation: `(painel)` (português, consistente com o resto das rotas do projeto) — mas deixar a critério do planner/executor.

2. **A view de agregação precisa de um `GRANT` explícito?**
   - What we know: nenhuma das migrations existentes usa `GRANT` manual; tabelas funcionam hoje sem isso.
   - What's unclear: se os privilégios padrão do schema `public` (configurados uma vez na criação do projeto Supabase) cobrem automaticamente objetos NOVOS do tipo view, ou só tabelas.
   - Recommendation: aplicar a migration, testar uma leitura simples como owner autenticado; se retornar "permission denied" em vez de dados/vazio, adicionar `grant select on <view> to authenticated;` na mesma migration.

3. **Contagem de "acessos" deve resetar/diminuir se um produto associado for excluído?**
   - What we know: linhas de acesso ao grid (`product_id is null`) nunca referenciam um produto, então exclusão de produto nunca afeta "acessos" — só afeta "mais visualizados" (via `on delete cascade` em `product_id`).
   - What's unclear: se isso é o comportamento desejado a longo prazo (ex.: um produto popular excluído "perde" seu histórico de visualizações) — mas está fora do escopo de D-03 (totais simples, sem histórico/auditoria), então o comportamento padrão do `on delete cascade` (mesmo de `order_clicks`) é aceitável.
   - Recommendation: manter `on delete cascade`, consistente com `order_clicks` — não é uma decisão nova desta fase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase (Postgres + Auth) | Tabela `pageviews`, views agregadas, RLS | ✓ (já em uso desde a Fase 1) | Projeto hospedado, versão não verificada nesta sessão (ver Assumption A2) | — |
| Node.js / npm | Build, testes (Vitest) | ✓ (já em uso) | — | — |
| Supabase CLI | `supabase gen types typescript` após a migration 0006 | ✓ (já listado em devDependencies, `supabase@^2.109.1`) | — | — |

**Missing dependencies with no fallback:** nenhum.
**Missing dependencies with fallback:** nenhum — todas as dependências desta fase já estão disponíveis e em uso desde fases anteriores.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` — `environment: "node"` (sem jsdom/@testing-library — **nenhum teste de renderização de componente/DOM existe neste projeto**, todos os testes são lógica pura ou integração contra um projeto Supabase de teste real) |
| Quick run command | `npx vitest run tests/rls/pageviews-rls.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MTR-01 | RLS de `pageviews`: anon insert-only, owner read-scoped, isolamento cross-tenant | integration (Supabase real) | `npx vitest run tests/rls/pageviews-rls.test.ts` | ❌ Wave 0 (espelhar `tests/rls/order-clicks-rls.test.ts`) |
| MTR-01 | Views `product_pageview_counts`/`product_order_click_counts` retornam Top-10 correto, ordenado, isolado por loja | integration (Supabase real) | `npx vitest run tests/dashboard/metrics-aggregation.test.ts` | ❌ Wave 0 |
| MTR-01 | Sidebar/drawer: abre/fecha, link ativo, "Sair da conta" funciona, responsivo mobile/desktop | manual (checkpoint) | — (sem jsdom, não automatizável neste projeto) | manual — mesma disciplina de checkpoint humano já usada nas Fases 3-5 |
| MTR-01 | Sidebar não aparece em `/login`/`/cadastro`/`/onboarding` | manual (checkpoint) — verificação rápida de navegador | — | manual |
| MTR-02 | Contadores total/disponível/esgotado corretos (reaproveitando `queryProducts`) | integration (Supabase real) | `npx vitest run tests/products/list-filter-sort.test.ts` (já cobre `queryProducts`; adicionar caso novo só se a função ganhar assinatura nova) | ✓ (parcial — cobre `queryProducts`, não a agregação dos 3 números no dashboard) |
| MTR-02 | "Acessos" (count de `product_id is null`) correto | integration (Supabase real) | `npx vitest run tests/dashboard/metrics-aggregation.test.ts` | ❌ Wave 0 (mesmo arquivo do item acima) |
| MTR-02 | Lista "produtos recentes" ordenada corretamente | integration (Supabase real) | coberto por `tests/products/list-filter-sort.test.ts` (mesma função, `slice` é lógica de apresentação) | ✓ |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/rls/pageviews-rls.test.ts tests/dashboard/metrics-aggregation.test.ts`
- **Per wave merge:** `npm test` (suíte completa)
- **Phase gate:** Suíte completa verde + checkpoint manual da sidebar/drawer antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/rls/pageviews-rls.test.ts` — cobre MTR-01 (RLS da nova tabela), espelhando `tests/rls/order-clicks-rls.test.ts` linha por linha (anon insert válido, insert com `product_id`/`store_id` inconsistente rejeitado, insert para produto não publicado rejeitado, anon nunca lê, owner lê só a própria loja)
- [ ] `tests/dashboard/metrics-aggregation.test.ts` — cobre MTR-01/MTR-02 (Top-10 corretamente ordenado e truncado, isolamento cross-tenant das duas views, contagem de "acessos" excluindo linhas com `product_id` preenchido)
- [ ] Atualizar `tests/ui/dark-mode-contrast.test.ts` — repontar a entrada `"src/app/(admin)/dashboard/page.tsx"` para o novo `(painel)/layout.tsx` (ou remover, se a asserção de `bg-white` migrar inteiramente para lá — ver Common Pitfall #5)
- [ ] Nenhuma instalação de framework necessária — Vitest já configurado e em uso

*(Nenhum gap de infraestrutura de teste — só arquivos de teste novos/atualizados a escrever)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não | Nenhuma mudança de autenticação nesta fase (reaproveita `requireCompletedOnboarding`/`signOutAction` existentes) |
| V3 Session Management | não | Sem mudança |
| V4 Access Control | sim | RLS owner-scoped em `pageviews` (mesma disciplina de `order_clicks`) + `security_invoker=true` nas duas views agregadas — nenhuma agregação cross-tenant deve ser legível por outra loja |
| V5 Input Validation | sim | `WITH CHECK` na policy de insert de `pageviews` valida consistência `product_id`/`store_id` e status `published`, mirrorando `order_clicks`; o limite Top-10 é uma constante fixa no código (`limit(10)`), nunca aceito via input do usuário, prevenindo enumeração/DoS por um valor de limite arbitrariamente grande |
| V6 Cryptography | não | Nenhuma operação de criptografia nova |

### Known Threat Patterns for Next.js 16 + Supabase (multi-tenant RLS)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Vazamento de métricas cross-tenant via view sem `security_invoker` | Information Disclosure | `with (security_invoker = true)` em toda `create view` nova (Common Pitfall #6) — não-negociável, paralelo à regra de `enable row level security` em tabelas |
| Inflação de contadores via múltiplos `anon insert` diretos (a chave `anon` é pública no bundle do cliente, mesma exposição já aceita para `order_clicks` desde a Fase 5) | Denial of Service / Repudiation (dado falso, não indisponibilidade) | **Aceito como risco conhecido, consistente com a decisão já tomada na Fase 5** — D-03 (métricas MVP simples, sem anti-fraude) e a exclusão explícita de "Analytics avançado" no PROJECT.md tornam rate-limiting/CAPTCHA fora de escopo; a defesa existente é só a RLS `WITH CHECK` (rejeita inserts logicamente inconsistentes, não spam de inserts válidos) |
| Vazamento de existência de produto rascunho/oculto via tentativa de pageview em URL adivinhada | Information Disclosure | Já coberto de graça: o `WITH CHECK` da policy de insert rejeita silenciosamente (fire-and-forget engole o erro) qualquer `product_id` que não seja de um produto `published` daquela loja — nenhum pageview é gravado para produtos inexistentes/rascunho/ocultos por regra de esgotado, sem nenhuma lógica extra no app |
| Sidebar vazando controles autenticados (`Sair da conta`) para páginas públicas de auth | Access Control (UI, não dado) | Estrutura de rotas (grupo aninhado `(painel)`), não lógica condicional em runtime — ver Common Pitfall #4 |

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte deste projeto: `06-CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `config.json`, `supabase/migrations/0001-0005*.sql`, `src/lib/products/order-clicks-actions.ts`, `src/lib/products/list.ts`, `src/lib/products/public-list.ts`, `src/lib/products/public-detail.ts`, `src/app/loja/[slug]/page.tsx`, `src/app/loja/[slug]/[produto]/page.tsx`, `src/app/loja/[slug]/product-card.tsx`, `src/app/loja/[slug]/product-filters.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/dashboard/page.tsx`, `src/app/(admin)/login/page.tsx`, `src/app/(admin)/produtos/page.tsx`, `src/app/(admin)/configuracoes/page.tsx`, `src/app/(admin)/produtos/[id]/editar/page.tsx`, `src/components/session-watcher.tsx`, `src/lib/auth/actions.ts`, `src/lib/auth/onboarding-guard.ts`, `tests/rls/order-clicks-rls.test.ts`, `tests/ui/dark-mode-contrast.test.ts`, `tests/setup/supabase-test.ts`, `vitest.config.ts`, `package.json`, `next.config.ts` — todas as afirmações sobre convenções, schema e estrutura existentes vêm daqui.
- [nextjs.org/docs/app/guides/prefetching](https://nextjs.org/docs/app/guides/prefetching) — fetch direto, versão 16.2.10, "lastUpdated: 2026-06-23" — comportamento de prefetch em rotas dinâmicas sem `loading.js`, e a seção "Triggering unwanted side-effects during prefetching" (analytics como exemplo canônico).

### Secondary (MEDIUM confidence)
- [github.com/orgs/supabase/discussions/19517](https://github.com/orgs/supabase/discussions/19517) e [discussions/626](https://github.com/orgs/supabase/discussions/626) — `GROUP BY` não suportado nativamente por `supabase-js`; view/RPC como soluções recomendadas pela comunidade.
- [supabase.com/blog/postgrest-aggregate-functions](https://supabase.com/blog/postgrest-aggregate-functions) — suporte a agregados simples (`count`/`sum`/etc.) via flag de projeto, sem `GROUP BY` dimensional.
- [dev.to/datadeer/postgres-views-the-hidden-security-gotcha-in-supabase-ckd](https://dev.to/datadeer/postgres-views-the-hidden-security-gotcha-in-supabase-ckd) e busca cruzada confirmando `security_invoker = true` (Postgres 15+) como mecanismo de correção.
- Busca cruzada (múltiplos resultados independentes) sobre remount de componentes em mudança de `searchParams` no App Router — comportamento de `page.tsx` vs. `layout.tsx`.
- [dev.to/ilham-bouktir/the-html-dialog-element-your-native-solution-for-accessible-modals-and-popups-308p](https://dev.to/ilham-bouktir/the-html-dialog-element-your-native-solution-for-accessible-modals-and-popups-308p), [dev.to/olexandra_imereli_c8fc210/using-native-dialog-for-your-react-modal-4ffi](https://dev.to/olexandra_imereli_c8fc210/using-native-dialog-for-your-react-modal-4ffi), [uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) — pitfalls do `<dialog>` nativo (`showModal()` vs. atributo `open`, tratamento de Escape/`onCancel`, clique em backdrop).
- [benjamincrozat.com/dialog-backdrop-styling-tailwind-css](https://benjamincrozat.com/dialog-backdrop-styling-tailwind-css) — variant `backdrop:` do Tailwind (nativo desde 3.1, presente em v4).

### Tertiary (LOW confidence)
- Comportamento de crawlers de unfurling (WhatsApp/Facebook/Telegram) não executarem JavaScript do cliente — conhecimento geral bem estabelecido sobre bots de preview de link, não verificado especificamente para este projeto nesta sessão (ver Assumption A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, todas as versões confirmadas por leitura direta de `package.json`
- Architecture (mecanismo de captura + grupo de rotas aninhado): HIGH — decisões centrais verificadas via fetch direto da documentação oficial do Next.js + leitura direta do código-fonte existente (incluindo a descoberta do vazamento de layout e da quebra de teste, ambas confirmadas por grep/leitura direta, não inferência)
- Aggregação (views + security_invoker): MEDIUM-HIGH — padrão confirmado por múltiplas fontes independentes da comunidade Supabase, mas não testado neste projeto especificamente (Assumption A2 sobre versão do Postgres)
- Pitfalls: HIGH — a maioria dos pitfalls críticos (prefetch, remount por searchParams, vazamento de layout, `<main>` duplicado, security_invoker) foi verificada por fetch/leitura direta, não assumida

**Research date:** 2026-07-15
**Valid until:** 30 dias (stack estável; a única parte "fast-moving" seria mudança de comportamento de crawlers executarem JS, que não muda em semanas)
