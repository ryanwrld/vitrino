-- Migration: fundação de dados da Fase 3 (products, product_sizes, product_photos)
-- + RLS habilitada na MESMA migration por tabela + bucket product-images.
-- Non-negotiable (03-RESEARCH.md Pitfall 2, herdado da Armadilha 4 do 01-RESEARCH.md):
-- toda `create table` é imediatamente seguida de `enable row level security` e sua
-- `create policy`, nunca separado numa migration posterior — uma janela de tabela
-- sem proteção é um vazamento de dados silencioso.
--
-- DECISÃO DE SCHEMA (planner, resolve Open Question 1 de 03-RESEARCH.md sem
-- checkpoint bloqueante): NÃO adicionar `check constraint` de enumeração em
-- brand/sole/category/fulfillment — ficam como `text` nullable (exceto `brand`,
-- que é not null, e `status`, que TEM check porque é o portão consumido pela
-- Fase 4 via `status = 'published'`). A enumeração dessas listas fixas é
-- validada só na camada de aplicação (constants.ts + Zod, Plan 03-02), de modo
-- que ajustar a lista de categoria/marca no futuro nunca exija uma migration
-- de correção.

-- =============================================================================
-- Tabela: products
-- =============================================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  brand text not null,
  brand_other text,
  line text,
  sole text,
  category text,
  fulfillment text,
  price numeric(10,2) not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "owner_full_access_products" on products
  for all using (store_id in (select id from stores where owner_id = auth.uid()));

-- =============================================================================
-- Tabela: product_sizes
-- Esgotado por padrão (D-03): `available` nasce `false`, o revendedor confirma
-- o que realmente tem em estoque. O atalho "esgotar produto inteiro" (D-04) é
-- só um UPDATE em lote desta tabela — nenhuma coluna extra é necessária.
-- =============================================================================
create table product_sizes (
  product_id uuid not null references products(id) on delete cascade,
  size smallint not null check (size between 36 and 45),
  available boolean not null default false,
  primary key (product_id, size)
);

alter table product_sizes enable row level security;

create policy "owner_full_access_product_sizes" on product_sizes
  for all using (
    product_id in (
      select id from products where store_id in (select id from stores where owner_id = auth.uid())
    )
  );

-- =============================================================================
-- Tabela: product_photos
-- Posição 1 (índice 0) é a capa (D-11); reordenar via drag-and-drop (D-12) é
-- só um UPDATE da coluna `position`, nunca um rename/move do blob no bucket.
-- =============================================================================
create table product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

alter table product_photos enable row level security;

create policy "owner_full_access_product_photos" on product_photos
  for all using (
    product_id in (
      select id from products where store_id in (select id from stores where owner_id = auth.uid())
    )
  );

-- =============================================================================
-- Storage bucket: product-images (fotos de produto)
-- Bucket público porque a vitrine pública da Fase 4 lê as fotos por URL direta
-- sem sessão (03-RESEARCH.md §Alternatives Considered — bucket público vs
-- signed URL). Path: {owner_id}/{product_id}/{uuid}.{ext} — o primeiro
-- segmento do path é o owner_id, então a checagem foldername[1] funciona sem
-- alteração em relação ao padrão já usado por store-assets em 0001.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "owner_insert_product_images" on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_select_product_images" on storage.objects
  for select
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_update_product_images" on storage.objects
  for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_delete_product_images" on storage.objects
  for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
