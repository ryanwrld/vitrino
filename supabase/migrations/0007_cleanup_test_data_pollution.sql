-- Migration de LIMPEZA (não-estrutural): remove lojas de teste que vazaram
-- para produção antes da correção em src/lib/supabase/env.ts (2026-07-23).
--
-- Causa raiz (já corrigida): `src/lib/supabase/server.ts`/`middleware.ts`
-- liam `NEXT_PUBLIC_SUPABASE_URL` (produção) hardcoded. Qualquer teste que
-- chamasse uma Server Action de verdade (`signUpAction`, `saveOnboarding`,
-- etc.) — em vez de só usar o cliente isolado de `tests/setup/supabase-test.ts`
-- — acabava gravando contas/lojas de teste reais em produção a cada
-- `vitest run`. Confirmado pela contagem de `stores` ter ficado travada
-- (707) durante a suíte inteira após o fix.
--
-- Critério de exclusão (validado manualmente, linha por linha, contra os
-- 707 registros reais de produção em 2026-07-23): nome começando com
-- "vitrino." (convenção de `uniqueEmail()`/fixtures usada em TODOS os
-- arquivos de teste) OU slug com o padrão `vitrino-<timestamp>` OU nome
-- contendo "teste"/"test" OU os padrões de fixture específicos de
-- update-slug.test.ts ("loja-b-taken-*", "loja-b-ocupado-*",
-- "slug-novo-*"). Rodar o SELECT abaixo ANTES do DELETE e conferir que o
-- resultado é EXATAMENTE 3: RL Esportes (rlesportes), rlesportes0,
-- TL ESPORES (tlesportes) — essas 3 nunca devem aparecer no SELECT de
-- exclusão nem ser afetadas.
--
-- ON DELETE CASCADE já cobre products/product_sizes/product_photos/
-- pageviews/order_clicks/store_settings (ver migrations 0001/0003/0005/
-- 0006) — um único DELETE em `stores` é suficiente e atômico.
--
-- NÃO remove as linhas correspondentes de `auth.users` (não há FK nessa
-- direção) — as contas de teste ficam órfãs em `auth.users` depois deste
-- DELETE. Isso é aceitável para esta limpeza (não achamos indício de custo
-- por linha órfã em auth.users no tier atual), mas se quiser removê-las
-- também, é uma chamada separada à Admin API (`service_role`), fora do
-- escopo deste script SQL.

-- 1) CONFERÊNCIA — rode isto primeiro e valide a contagem/nomes antes do DELETE.
select count(*) as total_a_excluir
from stores
where
  name ilike 'vitrino.%'
  or slug ilike 'vitrino-%'
  or name ilike '%teste%'
  or name ilike '%test%'
  or slug ilike 'loja-b-taken-%'
  or slug ilike 'loja-b-ocupado-%'
  or slug ilike 'slug-novo-%';

-- deve retornar EXATAMENTE estas 3 linhas (as que sobrevivem à limpeza):
select name, slug, owner_id, created_at
from stores
where not (
  name ilike 'vitrino.%'
  or slug ilike 'vitrino-%'
  or name ilike '%teste%'
  or name ilike '%test%'
  or slug ilike 'loja-b-taken-%'
  or slug ilike 'loja-b-ocupado-%'
  or slug ilike 'slug-novo-%'
)
order by created_at asc;

-- 2) EXCLUSÃO — só rodar depois de validar as duas queries acima.
-- delete from stores
-- where
--   name ilike 'vitrino.%'
--   or slug ilike 'vitrino-%'
--   or name ilike '%teste%'
--   or name ilike '%test%'
--   or slug ilike 'loja-b-taken-%'
--   or slug ilike 'loja-b-ocupado-%'
--   or slug ilike 'slug-novo-%';
