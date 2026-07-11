-- Migration: schema multi-tenant fundacional (stores, store_settings) + RLS + bucket store-assets
-- Non-negotiable (Armadilha 4 do 01-RESEARCH.md): RLS habilitado na MESMA migration que cria as
-- tabelas, nunca como passo separado posterior. slug UNIQUE desde esta migration (Armadilha 3),
-- mesmo que a UI de customização de slug só chegue na Fase 2.

-- =============================================================================
-- Tabela: stores
-- =============================================================================
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  accent_color text,
  tagline text check (char_length(tagline) <= 100),
  created_at timestamptz not null default now()
);

alter table stores enable row level security;

create policy "owner_full_access_stores" on stores
  for all using (owner_id = auth.uid());

-- =============================================================================
-- Tabela: store_settings
-- Campo explícito onboarding_completed_at (Pergunta em Aberto #1 do 01-RESEARCH.md):
-- mais barato de checar no guard de rota do Plan 05 do que inferir via campos NULL,
-- e não quebra se um campo obrigatório virar opcional no futuro.
-- =============================================================================
create table store_settings (
  store_id uuid primary key references stores(id) on delete cascade,
  whatsapp_e164 text,
  message_template text,
  onboarding_completed_at timestamptz
);

alter table store_settings enable row level security;

create policy "owner_full_access_settings" on store_settings
  for all using (store_id in (select id from stores where owner_id = auth.uid()));

-- =============================================================================
-- Storage bucket: store-assets (logo da loja)
-- Bucket dedicado, distinto de product-images (Pergunta em Aberto #3 do 01-RESEARCH.md):
-- mantém a política de storage do logo (1 arquivo por loja) estruturalmente separada
-- da política de product-images (N arquivos por produto, Fase 3).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- Restringe INSERT/SELECT/UPDATE/DELETE a objetos cujo primeiro segmento de path
-- seja o auth.uid() do dono: {owner_id}/logo.*
create policy "owner_insert_store_assets" on storage.objects
  for insert
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_select_store_assets" on storage.objects
  for select
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_update_store_assets" on storage.objects
  for update
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner_delete_store_assets" on storage.objects
  for delete
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
