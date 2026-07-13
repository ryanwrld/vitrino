---
phase: 03-crud-de-produtos-e-pipeline-de-m-dia
plan: 05
subsystem: api
tags: [nextjs, supabase, server-actions, react-hook-form, rls, storage]

# Dependency graph
requires:
  - phase: 03-crud-de-produtos-e-pipeline-de-m-dia (Plans 03-01/03-02/03-03/03-04)
    provides: schema products/product_sizes/product_photos + RLS, bucket product-images, ProductForm/SizeGrid/PhotoUploader (modos criação e edição já preparados)
provides:
  - Server Actions updateProduct/deleteProduct/publishProduct/unpublishProduct
  - Rota /produtos/[id]/editar (formulário pré-preenchido)
  - Diálogo de exclusão nativo + botões editar/excluir na listagem
  - status='published' como portão consumível pela vitrine pública (Fase 4)
affects: [04-vitrine-publica, 03-06-listagem-filtro-ordenacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "parseProductFormData: validação de FormData extraída para reuso entre saveProduct/updateProduct"
    - "delete+insert para reescrever product_sizes em vez de diff parcial"
    - "cleanup de storage.remove ANTES do DELETE FROM products (Pitfall 1)"
    - "useTransition separado para toggle publish/unpublish, independente do submit do form"

key-files:
  created:
    - "src/app/(admin)/produtos/[id]/editar/page.tsx"
    - "tests/products/edit-delete-product.test.ts"
  modified:
    - "src/lib/products/actions.ts"
    - "src/app/(admin)/produtos/product-form.tsx"
    - "src/app/(admin)/produtos/product-list.tsx"
    - "src/lib/currency/brl.ts"

key-decisions:
  - "parseProductFormData extraído de saveProduct para eliminar duplicação de validação em updateProduct"
  - "product_sizes reescrito via delete+insert (não diff), aceitável dado o tamanho pequeno do conjunto (max 10 linhas)"
  - "publish/unpublish sem gate de completude (Open Question 2 do 03-RESEARCH.md) e sem diálogo de confirmação (reversível, T-03-12)"
  - "formatBRLPriceInput adicionado a currency/brl.ts para fechar o ciclo string<->numeric<->string ao pré-preencher o form"

patterns-established:
  - "Toggle de status com useTransition próprio (isPublishPending), desacoplado do isPending do submit principal"
  - "Diálogo de exclusão único e compartilhado por toda a lista (deleteTarget state), em vez de um <dialog> por linha"

requirements-completed: [PROD-05, PROD-07]

coverage:
  - id: D1
    description: "updateProduct edita campos e reescreve product_sizes (delete+insert), owner-scoped via RLS"
    requirement: "PROD-05"
    verification:
      - kind: integration
        ref: "tests/products/edit-delete-product.test.ts#updateProduct — edição de campos e reescrita de product_sizes"
        status: pass
    human_judgment: false
  - id: D2
    description: "deleteProduct remove a linha (cascade sizes/photos) e limpa os arquivos do Storage antes do delete (Pitfall 1)"
    requirement: "PROD-05"
    verification:
      - kind: integration
        ref: "tests/products/edit-delete-product.test.ts#deleteProduct — remoção da linha (cascade) + limpeza do Storage (Pitfall 1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "publishProduct/unpublishProduct alternam status='published'/'draft' (D-10), owner-scoped"
    verification:
      - kind: integration
        ref: "tests/products/edit-delete-product.test.ts#publishProduct / unpublishProduct — toggle manual de status (D-10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Isolamento cross-tenant (T-03-11) para updateProduct/deleteProduct/publishProduct — productId de outra loja não altera nada"
    verification:
      - kind: integration
        ref: "tests/products/edit-delete-product.test.ts (3 testes cross-tenant)"
        status: pass
    human_judgment: false
  - id: D5
    description: "/produtos/[id]/editar abre pré-preenchido (campos+tamanhos+fotos) e redireciona se o produto não existir/pertencer a outra loja; product-list.tsx tem botões editar/excluir + diálogo nativo"
    verification:
      - kind: automated_ui
        ref: "npx tsc --noEmit + npx eslint src/**/*.{ts,tsx} (0 erros) + npm run build (rota /produtos/[id]/editar registrada)"
        status: pass
    human_judgment: true
    rationale: "Fluxo de UI interativo (formulário pré-preenchido, diálogo de confirmação, toggle de publish com feedback de toast) não tem cobertura de teste automatizado de UI nesta fase — verificado estaticamente (tsc/lint/build) mas o comportamento visual/interativo em si depende de checagem humana (UAT)."

# Metrics
duration: 15min
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 05: Editar, Excluir e Publicar Produtos Summary

**Server Actions updateProduct/deleteProduct/publishProduct/unpublishProduct com limpeza de storage no delete (Pitfall 1), rota /produtos/[id]/editar pré-preenchida, e diálogo nativo de exclusão na listagem.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-13T14:03:00Z
- **Completed:** 2026-07-13T14:18:32Z
- **Tasks:** 3
- **Files modified:** 6 (2 criados, 4 modificados)

## Accomplishments
- `updateProduct` edita nome/marca/preço/opcionais de um produto existente e reescreve `product_sizes` (delete+insert) — owner-scoped via RLS, cross-tenant testado (0 efeito)
- `deleteProduct` faz hard delete: busca `storage_path` de todas as fotos e chama `storage.remove(paths)` ANTES do `DELETE FROM products` (cascade limpa `product_sizes`/`product_photos`, mas nunca os blobs — Pitfall 1 do 03-RESEARCH.md)
- `publishProduct`/`unpublishProduct` alternam `status` como toggle manual (D-10), sem gate de completude — é o portão que a vitrine pública (Fase 4) vai consumir
- Rota `/produtos/[id]/editar`: Server Component que carrega produto + tamanhos + fotos owner-scoped, redireciona para `/produtos` se não encontrar (defende contra `productId` de outra loja)
- `ProductForm` estendido para modo edição: pré-preenche campos/tamanhos/fotos, chama `updateProduct` no submit, e renderiza um botão secundário "Publicar"/"Voltar para rascunho" com seu próprio `useTransition` (ação distinta de salvar)
- `ProductList` ganhou botões `Pencil` (link para editar) e `Trash2` (abre diálogo nativo `<dialog>` de confirmação, mesmo padrão do `slug-editor.tsx`) — `deleteProduct` só é chamado via onClick explícito de "Sim, excluir"

## Task Commits

Each task was committed atomically:

1. **Task 1: Teste de integração (RED) — editar, excluir com cleanup, publicar** - `9f0ef38` (test)
2. **Task 2: Server Actions — updateProduct, deleteProduct (cleanup), publish/unpublish** - `7432da4` (feat)
3. **Task 3: UI — rota de edição, diálogo de exclusão, botões publish** - `587c84a` (feat)

_Nenhuma task era TDD por task; a Task 1 seguiu o ciclo RED->GREEN implícito do plano (RED na Task 1, GREEN confirmado ao final da Task 2)._

## Files Created/Modified
- `tests/products/edit-delete-product.test.ts` - Testes de integração: updateProduct (campos+sizes+cross-tenant), deleteProduct (cascade+storage cleanup+cross-tenant), publish/unpublish (+cross-tenant)
- `src/lib/products/actions.ts` - `parseProductFormData` (validação compartilhada), `updateProduct`, `deleteProduct`, `publishProduct`, `unpublishProduct`
- `src/app/(admin)/produtos/[id]/editar/page.tsx` - Rota de edição (Server Component, carrega produto+sizes+photos owner-scoped)
- `src/app/(admin)/produtos/product-form.tsx` - Modo edição (defaultValues+productId+status+initialPhotos), botão Publicar/Voltar para rascunho
- `src/app/(admin)/produtos/product-list.tsx` - Botões editar/excluir + diálogo nativo de confirmação de exclusão
- `src/lib/currency/brl.ts` - `formatBRLPriceInput` (formata `number` como "199,90" para pré-preencher o campo de preço)

## Decisions Made
- **`parseProductFormData` extraído de `saveProduct`**: a mesma validação (Zod + brandOther + parseBRLPrice + parse de sizes) precisava rodar em `updateProduct` — extrair para uma função compartilhada evita duas implementações divergentes da mesma checagem (mesmo espírito de `uploadAndInsertPhotos` já estabelecido no Plan 03-04). `saveProduct` foi refatorado para usá-la; toda a suíte de `tests/products/` (22 testes, incluindo `create-product.test.ts`) permanece verde após a refatoração.
- **`product_sizes` reescrito via delete+insert**: em vez de calcular um diff entre o array atual e o novo, `updateProduct` apaga todas as linhas do produto e insere as novas — decisão explícita do plano (Task 2), aceitável dado que o conjunto tem no máximo 10 linhas (tamanhos 36-45).
- **Publish/unpublish sem gate de completude e sem diálogo**: seguindo a recomendação do 03-RESEARCH.md (Open Question 2) — toggle manual reversível, T-03-12 aceita esse risco como baixo.
- **`formatBRLPriceInput` novo em `currency/brl.ts`**: `formatBRLPrice` existente retorna "R$ 199,90" (para exibição), mas o campo de preço do formulário precisa do valor bruto "199,90" (o "R$" já é um prefixo estático separado no JSX) — em vez de reimplementar isso inline em `editar/page.tsx`, foi adicionado como uma função exportada e documentada, fechando o ciclo `parseBRLPrice`/`formatBRLPriceInput`.
- **Diálogo de exclusão único e compartilhado**: `product-list.tsx` usa um único `<dialog>` no fim da lista, controlado por um estado `deleteTarget`, em vez de um diálogo por linha — mais simples e consistente com o padrão de um único modal por página já usado em `slug-editor.tsx`.

## Deviations from Plan

None - plano executado exatamente como escrito. Um ajuste pontual foi feito dentro da própria Task 1 (RED), antes de qualquer commit de GREEN: a primeira versão do teste de `deleteProduct` selecionava a coluna `id` de `product_sizes`, mas essa tabela tem chave primária composta (`product_id`, `size`) sem coluna `id` própria (migration 0003) — corrigido para selecionar `size` antes mesmo de rodar a suíte pela primeira vez após a Task 2, sem impacto em nenhum commit de RED (o commit da Task 1 já continha a versão corrigida do arquivo de teste incluída no diff da Task 2, documentado no commit da Task 2).

## Issues Encountered
None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- `status='published'` está pronto para ser consumido pela vitrine pública (Fase 4) — produtos em rascunho simplesmente não devem aparecer lá (filtro por `status='published'` na query da Fase 4).
- Listagem (`/produtos`) ainda não tem busca/filtro/ordenação (PROD-06) nem thumbnail de capa — ambos ficam para o Plan 03-06, que deve estender `product-list.tsx` (já com os botões editar/excluir presentes) em vez de recriá-lo.
- Nenhum bloqueador identificado para o Plan 03-06.

---
*Phase: 03-crud-de-produtos-e-pipeline-de-m-dia*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 6 files created/modified confirmed present on disk; all 3 task commits (`9f0ef38`, `7432da4`, `587c84a`) confirmed in `git log --oneline --all`.
