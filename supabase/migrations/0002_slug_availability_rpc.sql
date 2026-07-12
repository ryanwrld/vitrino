-- Migration: RPC de verificação de unicidade de slug (SECURITY DEFINER)
-- A policy RLS de `stores` (`owner_full_access_stores … using (owner_id = auth.uid())`,
-- de 0001_init_stores_rls.sql) restringe TODO `select` às linhas do próprio dono —
-- por isso uma checagem cross-tenant de slug via `.from('stores').select()` sempre
-- reportaria "disponível" para um slug de outro revendedor (Pitfall 1 do
-- 02-RESEARCH.md). A correção é esta função `SECURITY DEFINER`, estreita e explícita:
-- roda com privilégios elevados apenas para responder uma pergunta booleana, nunca
-- expondo dados de linha (nome, logo, owner_id) de outros tenants. Nenhuma policy
-- RLS existente é enfraquecida por esta migration.
--
-- `search_path` fixado (`set search_path = public, pg_temp`) mitiga a classe de
-- vulnerabilidade de elevação de privilégio por hijack de search_path em funções
-- SECURITY DEFINER (02-RESEARCH.md §Security Domain, T-02-04).
--
-- Grant apenas para `authenticated` (não `anon`) — a tela /configuracoes só é
-- alcançável por um revendedor autenticado (02-RESEARCH.md Open Question 1).
create or replace function public.is_slug_available(candidate_slug text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from stores where slug = candidate_slug
  );
$$;

grant execute on function public.is_slug_available(text) to authenticated;
