-- Segue a 0007: remove as contas em auth.users que ficaram órfãs (sem
-- `stores`) depois da limpeza das 704 lojas de teste. Não há FK de stores
-- para auth.users, então esse DELETE precisa ser separado.
--
-- Critério: sem loja E email batendo o padrão de fixture de teste
-- (uniqueEmail() gera "vitrino.<arquivo>.<cenário>.<timestamp>.<random>@gmail.com").
-- O filtro por email (não só "sem loja") é a rede de segurança: nunca
-- apagar um usuário real que só ainda não completou o cadastro da loja.

-- 1) CONFERÊNCIA — rode antes do DELETE.
select count(*) as total_a_excluir
from auth.users u
where u.email ilike 'vitrino.%'
  and not exists (select 1 from stores s where s.owner_id = u.id);

-- 2) EXCLUSÃO — só depois de validar a contagem acima.
-- delete from auth.users
-- where email ilike 'vitrino.%'
--   and id not in (select owner_id from stores);
