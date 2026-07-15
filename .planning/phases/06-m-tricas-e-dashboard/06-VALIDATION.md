---
phase: 06
slug: m-tricas-e-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-15
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 [VERIFIED: package.json] |
| **Config file** | `vitest.config.ts` — `environment: "node"` (sem jsdom/@testing-library; nenhum teste de renderização de componente/DOM existe neste projeto — todos os testes são lógica pura ou integração contra um projeto Supabase de teste real) |
| **Quick run command** | `npx vitest run tests/rls/pageviews-rls.test.ts tests/dashboard/metrics-aggregation.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | ~30-60s (consistente com o runtime observado em fases anteriores da suíte) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/rls/pageviews-rls.test.ts tests/dashboard/metrics-aggregation.test.ts`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green + checkpoint manual da sidebar/drawer (não automatizável — projeto sem jsdom/@testing-library)
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

*Populated once PLAN.md task IDs exist (planner/executor fill in Task ID/Plan/Wave columns). Requirement → test mapping already resolved by research below:*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MTR-01 | V4 Access Control | RLS de `pageviews`: anon insert-only, owner read-scoped, isolamento cross-tenant | integration (Supabase real) | `npx vitest run tests/rls/pageviews-rls.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MTR-01 | V4 Access Control | Views `product_pageview_counts`/`product_order_click_counts` retornam Top-10 correto, ordenado, isolado por loja (`security_invoker=true`) | integration (Supabase real) | `npx vitest run tests/dashboard/metrics-aggregation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MTR-01 | — | Sidebar/drawer: abre/fecha, link ativo, "Sair da conta" funciona, responsivo mobile/desktop | manual (checkpoint) | — | manual | ⬜ pending |
| TBD | TBD | TBD | MTR-01 | V4 Access Control | Sidebar não aparece em `/login`/`/cadastro`/`/onboarding` (grupo de rotas aninhado, não lógica runtime) | manual (checkpoint) | — | manual | ⬜ pending |
| TBD | TBD | TBD | MTR-02 | — | Contadores total/disponível/esgotado corretos (reaproveitando `queryProducts`) | integration (Supabase real) | `npx vitest run tests/products/list-filter-sort.test.ts` | ✅ (parcial) | ⬜ pending |
| TBD | TBD | TBD | MTR-02 | — | "Acessos" (count de `product_id is null`) correto | integration (Supabase real) | `npx vitest run tests/dashboard/metrics-aggregation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MTR-02 | — | Lista "produtos recentes" ordenada corretamente | integration (Supabase real) | coberto por `tests/products/list-filter-sort.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/rls/pageviews-rls.test.ts` — cobre MTR-01 (RLS da nova tabela `pageviews`), espelhando `tests/rls/order-clicks-rls.test.ts` linha por linha (anon insert válido, insert com `product_id`/`store_id` inconsistente rejeitado, insert para produto não publicado rejeitado, anon nunca lê, owner lê só a própria loja)
- [ ] `tests/dashboard/metrics-aggregation.test.ts` — cobre MTR-01/MTR-02 (Top-10 corretamente ordenado e truncado, isolamento cross-tenant das duas views `product_pageview_counts`/`product_order_click_counts`, contagem de "acessos" excluindo linhas com `product_id` preenchido)
- [ ] Atualizar `tests/ui/dark-mode-contrast.test.ts` — repontar a entrada `"src/app/(admin)/dashboard/page.tsx"` para o novo `(painel)/layout.tsx` (onde `bg-white` passa a viver após a introdução do layout de sidebar — ver RESEARCH.md Pitfall 5)
- [ ] Nenhuma instalação de framework necessária — Vitest já configurado e em uso

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar desktop fixa + drawer mobile (`<dialog>`) abre/fecha, foco, Escape, link ativo destacado | MTR-01 (D-05/D-06/D-07) | Projeto não tem jsdom/@testing-library — nenhum teste de renderização de componente existe hoje; consistente com a disciplina de checkpoint humano já usada nas Fases 3-5 | Abrir `/dashboard` em viewport mobile e desktop; confirmar hambúrguer abre drawer com foco preso, Escape fecha, links corretos, "Sair da conta" no rodapé funciona |
| Sidebar nunca aparece em `/login`, `/cadastro`, `/onboarding`, `/esqueci-senha`, `/redefinir-senha` | MTR-01 (Pitfall 4) | Verificação visual rápida de navegador — mais rápido que instrumentar teste de rota para uma checagem de ausência de elemento | Visitar cada rota pública de auth deslogado; confirmar ausência de sidebar/hambúrguer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
