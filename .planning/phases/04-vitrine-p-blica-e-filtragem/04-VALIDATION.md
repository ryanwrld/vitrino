---
phase: 4
slug: vitrine-p-blica-e-filtragem
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| *(preenchido pelo planner ao criar os PLAN.md desta fase — ver 03-VALIDATION.md como modelo de formato)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/storefront/public-access-rls.test.ts` — acesso anônimo (sem sessão) só enxerga produtos `status='published'` da própria loja; achado crítico do RESEARCH.md (ausência de policy pública hoje)
- [ ] `tests/storefront/list-filter-paginate.test.ts` — `queryPublicProducts` (filtro multi-select por marca/solado/modalidade, busca, paginação) espelhando `tests/products/list-filter-sort.test.ts` da Fase 3
- [ ] `tests/storefront/sold-out-visibility.test.ts` — D-09/D-10/D-11 (campo por produto + preferência global + sobrescrita ao mudar preferência global)
- [ ] Nenhuma nova instalação de framework — Vitest já configurado

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
