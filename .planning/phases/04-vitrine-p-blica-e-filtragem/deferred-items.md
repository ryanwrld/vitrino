# Itens Adiados — Fase 4

Itens descobertos durante a execução que estão fora do escopo da task/plan atual (não causados pelas mudanças desta execução), portanto não corrigidos automaticamente.

## Plan 04-01

- **`tests/supabase/server-cookies.test.ts` — erro pré-existente de `tsc --noEmit`** (linhas 23 e 42): `Conversion of type 'SupabaseClient<...>' to type '{ cookies: {...} }' may be a mistake`. Mesmo erro já documentado em `.planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/deferred-items.md` (Plan 03-01) — confirmado de novo via `git stash` que o erro já existia antes da regeneração de `database.types.ts` desta fase (não relacionado às colunas `hide_when_sold_out`/`hide_sold_out_default`). Fora do escopo da Task 2 (arquivo não listado em `files_modified` do plano). Terceira vez que este mesmo erro é reconfirmado como pré-existente — reforça que precisa de uma correção dedicada de tipagem do mock de `SupabaseClient` nesse teste, fora do ciclo normal de fases.
