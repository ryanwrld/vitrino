# Itens Adiados — Fase 3

Itens descobertos durante a execução que estão fora do escopo da task/plan atual (não causados pelas mudanças desta execução), portanto não corrigidos automaticamente.

## Plan 03-01

- **`tests/supabase/server-cookies.test.ts` — erro pré-existente de `tsc --noEmit`** (linhas 23 e 42): `Conversion of type 'SupabaseClient<...>' to type '{ cookies: {...} }' may be a mistake`. Confirmado via `git stash` que o erro já existia antes desta execução (não relacionado à migration 0003 nem ao regenerate de `database.types.ts`). Fora do escopo da Task 2 (arquivo não listado em `files_modified` do plan). Requer investigação separada de tipagem do mock de `SupabaseClient` nesse teste.

## Plan 03-04

- **"Request rate limit reached" do Supabase Auth em execuções cumulativas de `npm test`** — comportamento pré-existente da infraestrutura de testes (sem emulador local de Supabase Auth; cada teste de integração faz `signUp` real contra o projeto Supabase remoto), já documentado em `02-05-SUMMARY.md`. Confirmado não-relacionado às mudanças desta wave: `npx vitest run tests/products/photo-upload.test.ts` (8/8) e `npx vitest run tests/products/` (16/16) passaram integralmente em execuções isoladas logo após cada task; só a suíte completa (`npm test`, que paraleliza arquivos e dispara dezenas de `signUp` quase simultâneos) esgotou a cota de signup do projeto de teste durante esta sessão. Não corrigido — fora de escopo para este plano; reforça o sinalizado em 02-05-SUMMARY.md para uma futura fase considerar um stub local de Supabase Auth para a suíte de testes.
