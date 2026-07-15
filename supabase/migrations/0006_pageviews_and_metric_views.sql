-- Migration: fundação de dados de métricas (Fase 6, MTR-01/MTR-02).
-- Cria `pageviews` (captura bruta de acessos/visualizações — não existia
-- mecanismo algum para isso no codebase, apesar do ROADMAP dizer
-- `Depends on: Phase 4 (pageviews)`; a Fase 4 nunca implementou captura) e
-- duas VIEWs agregadas Top-N que o dashboard (06-03) consome:
-- `product_pageview_counts` e `product_order_click_counts`. `order_clicks`
-- (cliques em "Pedir agora", Fase 5) já existe e é só agregado aqui via
-- view, nunca recriado.
--
-- `pageviews` espelha exatamente o padrão RLS de `order_clicks` (migration
-- 0005): `anon` só INSERE (nenhuma policy SELECT para o papel anon, por
-- design), o dono lê só os próprios dados. A diferença estrutural é que
-- `product_id` é NULLABLE aqui: `product_id IS NULL` = acesso ao grid
-- principal da vitrine (D-01 do 06-CONTEXT.md), `product_id` preenchido =
-- visualização de um produto específico (alimenta o ranking "mais
-- visualizados", D-08).
--
-- Non-negotiable (03-RESEARCH.md Pitfall 2 / 05-RESEARCH.md, herdado da
-- Armadilha 4 do 01-RESEARCH.md): toda `create table` é imediatamente
-- seguida de `enable row level security` e sua `create policy`, nunca
-- separado numa migration posterior.
--
-- Regra não-negociável NOVA desta fase (06-RESEARCH.md Pitfall 6): toda
-- `create view` de agregação leva o modificador invoker-security na MESMA
-- declaração (ver `with (...)` nas duas views abaixo). Views Postgres, por
-- padrão, executam com o papel de quem as criou (bypassando a RLS das
-- tabelas base) — sem esse modificador, qualquer sessão `authenticated`
-- conseguiria ler os agregados de TODAS as lojas, não só a própria. Isso é
-- o análogo, para views, do "enable row level security" obrigatório em
-- tabelas.

-- =============================================================================
-- Tabela: pageviews
-- =============================================================================
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

-- Dono lê só os pageviews da própria loja (mesmo padrão raso de
-- owner_read_order_clicks — store_id já denormalizado na própria linha).
create policy "owner_read_pageviews" on pageviews
  for select
  using (store_id in (select id from stores where owner_id = auth.uid()));

-- Cliente final (anon) só pode INSERIR — nenhuma policy SELECT para anon
-- nesta tabela, por design (mesmo Pitfall 2 de 05-RESEARCH.md): o visitante
-- que acabou de gerar seu próprio pageview nunca precisa lê-lo de volta, e
-- abrir SELECT para anon vazaria analytics de todas as lojas. O WITH CHECK
-- cobre os dois casos (acesso ao grid vs. visualização de produto) e exige
-- sempre que a loja/produto esteja publicado — defesa em profundidade, já
-- que a anon key é pública no bundle do cliente.
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
      -- visualização de produto: mesmo check exato de order_clicks —
      -- cruza product_id/store_id e exige produto publicado
      product_id in (
        select id from products where store_id = pageviews.store_id and status = 'published'
      )
    )
  );

-- =============================================================================
-- Views agregadas Top-N (invoker-security obrigatório — ver nota acima)
-- Nenhuma embute nome de produto: o join de nomes é feito na camada de app (06-03).
-- =============================================================================
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
