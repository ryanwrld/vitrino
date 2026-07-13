---
phase: 3
slug: crud-de-produtos-e-pipeline-de-m-dia
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-12
updated: 2026-07-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (já configurado) |
| **Config file** | `vitest.config.ts` (raiz do projeto) |
| **Quick run command** | `npx vitest run tests/products/<arquivo>.test.ts` |
| **Full suite command** | `npm test` (equivale a `vitest run`, roda todos os `tests/**/*.test.ts`) |
| **Estimated runtime** | ~30-90 segundos (testes de integração reais contra o Supabase remoto de teste) |

Testes são de **integração reais** contra o projeto Supabase remoto (nunca mockam o client Supabase; só mockam `next/headers`/`next/navigation` para simular o ambiente de Server Action). Contas seedadas via `signUp`/`signInWithPassword` reais (`tests/setup/supabase-test.ts`), nunca via service_role.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/products/<arquivo-relevante>.test.ts`
- **After every plan wave:** Run `npm test` (suíte completa)
- **Before `/gsd-verify-work`:** Suíte completa verde
- **Max feedback latency:** ~90 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PROD-01/02 | T-03-01 | RLS por tabela na mesma migration | integration | `grep -q "enable row level security" supabase/migrations/0003_products_schema_rls.sql` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PROD-01/02 | T-03-01 | schema vivo pushado; typegen do banco | integration | `grep -q product_sizes src/lib/database.types.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PROD-01/02 | T-03-01/T-03-02 | isolamento cross-tenant das 3 tabelas | integration | `npx vitest run tests/rls/product-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | PROD-01/02/07 | T-03-05 | preço BRL parseado, obrigatórios revalidados | integration | `npx vitest run tests/products/create-product.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | PROD-01/02 | T-03-05/T-03-06/T-03-07 | saveProduct owner-scoped + Zod servidor | integration | `npx vitest run tests/products/create-product.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | PROD-01/02/07 | T-03-07 | UI de cadastro/listagem | typecheck+lint | `npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | PROD-02/04 | T-03-08/T-03-09 | sizes persistidos, bulk-esgotar isolado | integration | `npx vitest run tests/products/availability.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | PROD-02/04/07 | T-03-08/T-03-09/T-03-SC | size-grid + markProductEsgotado | integration | `npx vitest run tests/products/availability.test.ts && npx tsc --noEmit && npm run lint` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 4 | PROD-03 | T-03-02/T-03-03/T-03-10 | magic bytes, recontagem 5, reorder/remove isolados | integration | `npx vitest run tests/products/photo-upload.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 4 | PROD-03/07 | T-03-02/T-03-03/T-03-10 | Server Actions de foto | integration | `npx vitest run tests/products/photo-upload.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 4 | PROD-03/07 | T-03-SC | uploader + compressão + dnd-kit | typecheck+lint | `npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 03-04-04 | 04 | 4 | PROD-03 | T-03-02 | EXIF/drag/limite no mobile | manual | checkpoint:human-verify | n/a | ⬜ pending |
| 03-05-01 | 05 | 5 | PROD-05 | T-03-11/T-03-04 | editar/excluir(cleanup)/publicar isolados | integration | `npx vitest run tests/products/edit-delete-product.test.ts` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 5 | PROD-05/07 | T-03-11/T-03-04 | Server Actions update/delete/publish | integration | `npx vitest run tests/products/edit-delete-product.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-05-03 | 05 | 5 | PROD-05/07 | T-03-11 | edição pré-preenchida + diálogo + publish | typecheck+lint | `npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 03-06-01 | 06 | 6 | PROD-06 | T-03-13 | busca/filtro/ordenação isolados por loja | integration | `npx vitest run tests/products/list-filter-sort.test.ts` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 6 | PROD-06 | T-03-13 | queryProducts + searchParams | integration | `npx vitest run tests/products/list-filter-sort.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-06-03 | 06 | 6 | PROD-06/07 | T-03-14 | toolbar + rollup de disponibilidade | typecheck+lint | `npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 03-06-04 | 06 | 6 | PROD-01..07 | — | fluxo completo de CRUD no mobile | manual | checkpoint:human-verify | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Esta fase NÃO usa um plano Wave 0 monolítico. Os scaffolds de teste são criados TDD-style como a **primeira task (RED)** de cada plano de slice, antes da implementação que os torna verdes — satisfazendo o Nyquist (todo `<automated>` de task de implementação referencia um teste criado antes, no mesmo plano). Arquivos de teste criados por plano:

- [ ] `tests/rls/product-isolation.test.ts` — Plan 03-01 Task 3 (isolamento das 3 tabelas)
- [ ] `tests/products/create-product.test.ts` — Plan 03-02 Task 1 (PROD-01/02, preço BRL)
- [ ] `tests/products/availability.test.ts` — Plan 03-03 Task 1 (PROD-02 sizes, PROD-04)
- [ ] `tests/products/photo-upload.test.ts` — Plan 03-04 Task 1 (PROD-03, Pitfall 6/1)
- [ ] `tests/products/edit-delete-product.test.ts` — Plan 03-05 Task 1 (PROD-05, cleanup)
- [ ] `tests/products/list-filter-sort.test.ts` — Plan 03-06 Task 1 (PROD-06)
- [ ] Nenhuma nova instalação de framework — Vitest já configurado

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orientação EXIF correta em foto de câmera | PROD-03 | Correção de orientação depende de renderização real do pixel; não observável de forma confiável em teste headless com bytes sintéticos | Plan 03-04 checkpoint: subir foto retrato de celular, confirmar orientação correta |
| Drag-and-drop de fotos por toque (mobile) | PROD-03 (D-12) | Interação de toque/gesto não é exercitável em Vitest; mandato mobile-first exige dispositivo real | Plan 03-04 checkpoint: arrastar foto por toque, confirmar reordenação + badge Capa |
| Feedback de progresso "Enviando…" e toasts visuais | PROD-07 | Toast/overlay são DOM/client-only; o teste cobre o return-shape do Server Action, não o render do toast | Plan 03-06 checkpoint: fluxo completo confirma cada toast |
| Fluxo completo de CRUD no mobile sem layout quebrado | PROD-01..07 | Verificação visual/responsiva end-to-end | Plan 03-06 checkpoint final (Nike/Mercurial/FG) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (tasks de UI usam typecheck+lint; behaviors não-automatizáveis cobertos por checkpoints humanos)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (toda task de implementação tem comando automatizado)
- [x] Wave 0 covers all MISSING references (cada teste é criado como task RED do seu plano)
- [x] No watch-mode flags (todos usam `vitest run`)
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-13
