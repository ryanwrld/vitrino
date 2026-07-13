# Itens Adiados — Fase 3

Itens descobertos durante a execução que estão fora do escopo da task/plan atual (não causados pelas mudanças desta execução), portanto não corrigidos automaticamente.

## Plan 03-01

- **`tests/supabase/server-cookies.test.ts` — erro pré-existente de `tsc --noEmit`** (linhas 23 e 42): `Conversion of type 'SupabaseClient<...>' to type '{ cookies: {...} }' may be a mistake`. Confirmado via `git stash` que o erro já existia antes desta execução (não relacionado à migration 0003 nem ao regenerate de `database.types.ts`). Fora do escopo da Task 2 (arquivo não listado em `files_modified` do plan). Requer investigação separada de tipagem do mock de `SupabaseClient` nesse teste.
