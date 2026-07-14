---
phase: 4
slug: vitrine-p-blica-e-filtragem
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (já configurado) |
| **Config file** | `vitest.config.ts` (raiz do projeto) |
| **Quick run command** | `npx vitest run tests/storefront/<arquivo>.test.ts` |
| **Full suite command** | `npm test` (equivale a `vitest run`, roda todos os `tests/**/*.test.ts`) |
| **Estimated runtime** | ~30-90 segundos (testes de integração reais contra o Supabase remoto de teste, seguindo o padrão já estabelecido na Fase 3) |

Seguir o mesmo padrão de teste da Fase 3: integração real contra o Supabase remoto de teste (nunca mockar o client Supabase), contas seedadas via `signUp`/`signInWithPassword` reais. Para a vitrine pública, o teste crítico é o **acesso anônimo** (sem sessão) — ver RESEARCH.md achado bloqueante sobre ausência de policy RLS pública.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/storefront/<arquivo-relevante>.test.ts`
- **After every plan wave:** Run `npm test` (suíte completa)
- **Before `/gsd-verify-work`:** Suíte completa verde
- **Max feedback latency:** ~90 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01 T1 | 04-01 | 1 | VITR-01 | T-04-03 | Migration escreve exatamente 4 policies `to anon` `for select` + 2 colunas nullable/default corretas | grep | `grep -c "to anon" ... \| grep -q "^4$"` | ✅ | ⬜ pending |
| 04-01 T2 | 04-01 | 1 | VITR-01 | — | [BLOCKING] push aplicado + typegen reflete colunas novas | integration | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-01 T3 | 04-01 | 1 | VITR-01 | T-04-01, T-04-02 | Client anônimo lê published/stores, nunca draft/store_settings | integration | `npx vitest run tests/storefront/public-access-rls.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-02 T1 | 04-02 | 2 | VITR-01, VITR-04 | T-04-04 | queryPublicProducts filtra published, pagina 20+1, isola por store | integration | `npx vitest run tests/storefront/list-filter-paginate.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-02 T2 | 04-02 | 2 | VITR-01, VITR-03 | T-04-05 | page.tsx resolve loja por slug sem auth, nunca "use cache" | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02 T3 | 04-02 | 2 | VITR-05 | — | Fallback de imagem via onError, sem botões admin no card | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-03 T1 | 04-03 | 3 | VITR-02 | T-04-06, T-04-07 | Filtro multi-select validado contra listas fixas, busca parametrizada | integration | `npx vitest run tests/storefront/list-filter-paginate.test.ts` | ❌ Wave 0 (estende) | ⬜ pending |
| 04-03 T2 | 04-03 | 3 | VITR-02 | — | Chips multi-select, sticky, URL como fonte de verdade, reset de page | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-03 T3 | 04-03 | 3 | VITR-02 | — | searchParams multi-valor parseados, dois empty states distintos | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-04 T1 | 04-04 | 4 | VITR-04 | T-04-09 | fetchNextPage resolve loja por slug (nunca storeId direto), espelha queryPublicProducts | integration | `npx vitest run tests/storefront/load-more-pagination.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-04 T2 | 04-04 | 4 | VITR-04 | — | LoadMoreButton acumula itens, nunca substitui | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-04 T3 | 04-04 | 4 | VITR-04 | — | Paginação adaptativa via CSS, nunca JS de device; sem contador (D-08) | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-05 T1 | 04-05 | 2 | VITR-03 | T-04-10 | hide_when_sold_out validado (enum) e persistido nos 3 estados | integration | `npx vitest run tests/products/hide-when-sold-out.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-05 T2 | 04-05 | 2 | VITR-03 | — | Select de 3 opções no product-form + hidratação correta na edição | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-05 T3 | 04-05 | 2 | VITR-03 | T-04-11 | Reset condicional D-11 escopado por owner_id (RLS) | integration | `npx vitest run tests/settings/hide-sold-out-default.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-06 T1 | 04-06 | 5 | VITR-03 | T-04-12 | Regra hide_when_sold_out/hide_sold_out_default centralizada, matriz de 5 casos | integration | `npx vitest run tests/storefront/sold-out-visibility.test.ts` | ❌ Wave 0 | ⬜ pending |
| 04-06 T2 | 04-06 | 5 | VITR-03 | T-04-13 | page.tsx/fetchNextPage repassam hide_sold_out_default sem cache | typecheck | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/storefront/public-access-rls.test.ts` — acesso anônimo (sem sessão) só enxerga produtos `status='published'` da própria loja; achado crítico do RESEARCH.md (ausência de policy pública hoje) — criado no Plan 04-01 Task 3
- [x] `tests/storefront/list-filter-paginate.test.ts` — `queryPublicProducts` (filtro multi-select por marca/solado/modalidade, busca, paginação) espelhando `tests/products/list-filter-sort.test.ts` da Fase 3 — criado no Plan 04-02 Task 1, estendido no Plan 04-03 Task 1
- [x] `tests/storefront/sold-out-visibility.test.ts` — D-09/D-10/D-11 (campo por produto + preferência global + sobrescrita ao mudar preferência global) — criado no Plan 04-06 Task 1
- [x] `tests/storefront/load-more-pagination.test.ts` — fetchNextPage espelha queryPublicProducts (Pitfall 3) — criado no Plan 04-04 Task 1
- [x] `tests/products/hide-when-sold-out.test.ts` + `tests/settings/hide-sold-out-default.test.ts` — lado de escrita de D-09/D-10/D-11 — criados no Plan 04-05
- [x] Nenhuma nova instalação de framework — Vitest já configurado

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Paginação adaptativa por dispositivo (botão "Carregar mais" no mobile vs. numerada no desktop) | VITR-04 | Diferença de UI por viewport não é exercitável de forma confiável em Vitest headless | Checkpoint: abrir a vitrine em mobile e desktop, confirmar o controle de paginação correto em cada um |
| Placeholder visual em imagem com erro de carregamento | VITR-05 | Depende de renderização real do navegador de uma imagem quebrada | Checkpoint: forçar uma URL de foto inválida, confirmar placeholder sem quebrar o card |
| Hero da loja (logo/cor/frase) no topo da vitrine | D-12/D-13 | Verificação visual de layout | Checkpoint: confirmar hero com e sem frase de apresentação preenchida |
| Fluxo completo de filtro+paginação+estoque no mobile sem layout quebrado | VITR-01..05 | Verificação visual/responsiva end-to-end | Checkpoint final da fase |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (each plan alternates integration-test tasks with typecheck-only UI wiring tasks)
- [x] Wave 0 covers all MISSING references (5 new test files created across Plans 04-01/04-02/04-04/04-05/04-06)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner, at plan-creation time — 2026-07-13)
