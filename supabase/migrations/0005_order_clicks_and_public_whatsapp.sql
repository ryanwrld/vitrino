-- Migration: fundação de dados da fatia crítica de pedido (Fase 5, D-09/D-10).
-- Cria `order_clicks` (captura bruta de cliques, sem UI/dashboard nesta fase —
-- D-09 enquadra explicitamente como raw capture) e resolve a NOTA EXPLÍCITA
-- deixada em 0004 (rodapé): esta é a migration que finalmente expõe
-- `whatsapp_e164`/`message_template` de `store_settings` ao papel `anon`,
-- restrita a lojas com ao menos um produto publicado.
--
-- Non-negotiable (03-RESEARCH.md Pitfall 2, herdado da Armadilha 4 do
-- 01-RESEARCH.md): toda `create table` é imediatamente seguida de
-- `enable row level security` e sua `create policy`, nunca separado numa
-- migration posterior.
--
-- Esta é a primeira superfície de ESCRITA pública (`anon insert`) do
-- projeto — a segurança real é a RLS, não o código de aplicação (a anon key
-- é pública no bundle do cliente). Por isso o `WITH CHECK` de
-- `public_insert_order_clicks` cruza `product_id`/`store_id` e exige
-- `status = 'published'`, em vez de confiar nos argumentos que a Server
-- Action envia.

-- =============================================================================
-- Tabela: order_clicks
-- =============================================================================
create table order_clicks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  size smallint not null check (size between 36 and 45),
  created_at timestamptz not null default now()
);

create index order_clicks_store_id_idx on order_clicks (store_id);
create index order_clicks_product_id_idx on order_clicks (product_id);

alter table order_clicks enable row level security;

-- Dono lê só os cliques da própria loja (padrão raso, igual a `products`,
-- não o padrão de dois níveis de product_sizes/product_photos, porque
-- store_id já está denormalizado na própria linha de order_clicks).
create policy "owner_read_order_clicks" on order_clicks
  for select
  using (store_id in (select id from stores where owner_id = auth.uid()));

-- Cliente final (anon) só pode INSERIR — nenhuma policy SELECT para anon
-- nesta tabela, por design (Pitfall 2 do 05-RESEARCH.md): o cliente que
-- acabou de registrar seu próprio clique nunca precisa lê-lo de volta, e
-- abrir SELECT para anon vazaria analytics de todas as lojas. O WITH CHECK
-- valida consistência product_id/store_id e que o produto está publicado —
-- defesa em profundidade, já que a anon key é pública.
create policy "public_insert_order_clicks" on order_clicks
  for insert
  to anon
  with check (
    product_id in (
      select id from products
      where store_id = order_clicks.store_id and status = 'published'
    )
  );

-- =============================================================================
-- Exposição pública de store_settings (resolve a NOTA EXPLÍCITA de 0004)
-- Mais restrita que a policy blanket `using(true)` de stores, porque
-- whatsapp_e164 é mais sensível que nome/logo/cor (T-05-02, Information
-- Disclosure) — só lojas com pelo menos um produto publicado.
-- =============================================================================
create policy "public_read_store_settings_for_published_stores" on store_settings
  for select
  to anon
  using (
    store_id in (select store_id from products where status = 'published')
  );
