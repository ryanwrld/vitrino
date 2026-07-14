-- Migration: acesso público (anon) à vitrine (Fase 4) + colunas de visibilidade
-- de esgotado (D-09/D-10/D-11, 04-CONTEXT.md).
--
-- Esta migration NÃO cria tabelas novas. Ela adiciona:
--   (a) quatro policies RLS ADITIVAS restritas ao papel anônimo, sempre
--       limitadas à operação de leitura (Antipadrão do 04-RESEARCH.md/
--       T-04-03: liberar todas as operações para o papel anônimo permitiria
--       escrita indevida via esse mesmo papel);
--   (b) duas colunas nullable/default para a regra de visibilidade de
--       produto esgotado.
--
-- Policies do mesmo `for select` são combinadas com OR pelo Postgres — as
-- policies `owner_full_access_*` já existentes (0001/0003) continuam
-- intactas, nunca removidas nem alteradas. Um dono autenticado continua
-- enxergando tudo via sua própria policy; um visitante anônimo só enxerga o
-- que as policies novas abaixo permitem.
--
-- Achado crítico (04-RESEARCH.md, verificado por grep nas migrations 0001/
-- 0003): hoje NENHUMA policy pública para o papel anônimo existe — toda
-- leitura anônima retorna [] silenciosamente (RLS bloqueando não é
-- distinguível de "tabela vazia"). Sem esta migration a vitrine pública
-- nunca funciona.

-- =============================================================================
-- Policy: stores — resolver slug -> id sem sessão
-- `using (true)`: stores não tem coluna sensível (WhatsApp fica em
-- store_settings, que esta migration NÃO toca — ver nota no final do arquivo).
-- =============================================================================
create policy "public_read_published_stores" on stores
  for select
  to anon
  using (true);

-- =============================================================================
-- Policy: products — só produtos publicados
-- =============================================================================
create policy "public_read_published_products" on products
  for select
  to anon
  using (status = 'published');

-- =============================================================================
-- Policy: product_sizes — só tamanhos de produtos publicados
-- =============================================================================
create policy "public_read_published_product_sizes" on product_sizes
  for select
  to anon
  using (
    product_id in (select id from products where status = 'published')
  );

-- =============================================================================
-- Policy: product_photos — só fotos de produtos publicados
-- =============================================================================
create policy "public_read_published_product_photos" on product_photos
  for select
  to anon
  using (
    product_id in (select id from products where status = 'published')
  );

-- =============================================================================
-- Colunas de visibilidade de esgotado (D-09/D-10/D-11)
--
-- hide_when_sold_out: NULLABLE, sem default. D-10 — produto novo nasce SEM
-- exceção própria (null = "herda o padrão global da loja"), nunca `false`
-- por default (04-RESEARCH.md Pitfall 5: `false` já seria um valor
-- "configurado", tornando D-11 — resetar exceções — impossível de distinguir
-- de "revendedor escolheu explicitamente mostrar").
--
-- hide_sold_out_default: NOT NULL DEFAULT false. A LOJA precisa de um valor
-- inicial não-nulo desde a criação (D-10 — nunca ocultar por padrão; `false`
-- = "mostrar esmaecido/esgotado").
-- =============================================================================
alter table products add column hide_when_sold_out boolean;
alter table stores add column hide_sold_out_default boolean not null default false;

-- =============================================================================
-- NOTA EXPLÍCITA (04-RESEARCH.md Pitfall 2): esta migration NÃO adiciona
-- nenhuma policy pública em `store_settings`. O WhatsApp (whatsapp_e164,
-- message_template) só será exposto publicamente quando a Fase 5 decidir
-- como/quando esse dado é consumido no CTA "Pedir agora" — princípio de
-- menor privilégio, nunca "adiantar" uma policy pública para uma tabela que
-- esta fase não precisa ler.
-- =============================================================================
