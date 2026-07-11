---
phase: 1
slug: funda-o-conta-e-isolamento-multi-tenant
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-10
---

# Fase 1 — Estratégia de Validação

> Contrato de validação por fase para amostragem de feedback durante a execução.

---

## Infraestrutura de Teste

| Propriedade | Valor |
|----------|-------|
| **Framework** | vitest (recomendado — nenhum framework de teste existe ainda, projeto greenfield) |
| **Config file** | nenhum — Wave 0 instala e configura |
| **Comando de execução rápida** | a definir no Wave 0 (ex: `vitest run tests/phone/normalize-br.test.ts`) |
| **Comando de suíte completa** | a definir no Wave 0 (ex: `vitest run`) |
| **Tempo estimado** | ~10-20 segundos |

---

## Taxa de Amostragem

- **Após cada commit de task:** Rodar os testes unitários relevantes ao arquivo alterado
- **Após cada wave do plano:** Rodar a suíte completa
- **Antes de `/gsd:verify-work`:** Suíte completa deve estar verde, mais os itens `manual-only` (AUTH-02, AUTH-04) confirmados via checklist manual documentado no PLAN.md
- **Latência máxima de feedback:** ~20 segundos

---

## Mapa de Verificação por Requisito

| Requisito | Comportamento | Tipo de Teste | Comando Automatizado | Arquivo Existe | Status |
|-----------|----------------|-----------------|--------------------------|-------------------|--------|
| AUTH-01 | Cadastro cria usuário e redireciona para onboarding | integração | `vitest run tests/auth/signup.test.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-02 | Sessão persiste após refresh do navegador | manual-only (requer navegador real com cookies persistidos) | checklist manual documentado no PLAN.md | ❌ Wave 0 | ⬜ pending |
| AUTH-03 | Logout de qualquer página encerra a sessão | unitário/integração | `vitest run tests/auth/signout.test.ts` | ❌ Wave 0 | ⬜ pending |
| AUTH-04 | Renovação silenciosa (`TOKEN_REFRESHED`); aviso só se falhar (`SIGNED_OUT`) | manual-only (requer simular expiração real) | checklist manual documentado no PLAN.md | ❌ Wave 0 | ⬜ pending |
| AUTH-05 | Link de reset de senha estabelece sessão e permite `updateUser` | integração | `vitest run tests/auth/reset-password.test.ts` | ❌ Wave 0 | ⬜ pending |
| LOJA-01 | Onboarding salva nome/logo/cor/frase (frase ≤100 caracteres) | unitário (Zod) + integração | `vitest run tests/onboarding/store-settings.test.ts` | ❌ Wave 0 | ⬜ pending |
| WPP-01 | Número normalizado para E.164; entradas malformadas rejeitadas | unitário | `vitest run tests/phone/normalize-br.test.ts` | ❌ Wave 0 | ⬜ pending |
| WPP-02 | Template salvo contém os placeholders esperados | unitário (Zod) | `vitest run tests/onboarding/message-template.test.ts` | ❌ Wave 0 | ⬜ pending |
| Isolamento RLS (D-05) | Loja A não lê/escreve dados de Loja B | integração, duas contas seedadas reais | `vitest run tests/rls/isolation.test.ts` | ❌ Wave 0 | ⬜ pending |
| Middleware | Matcher não corresponde a nada fora de `/admin` | unitário | `vitest run tests/middleware/matcher.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requisitos do Wave 0

- [ ] Instalar e configurar vitest (`npm install -D vitest`) — nenhum framework de teste existe ainda
- [ ] `tests/auth/*.test.ts` — cobre AUTH-01, AUTH-03, AUTH-05
- [ ] `tests/onboarding/*.test.ts` — cobre LOJA-01, WPP-02
- [ ] `tests/phone/normalize-br.test.ts` — cobre WPP-01, incluindo casos malformados (parênteses, traços, zero à esquerda, sem DDI)
- [ ] `tests/rls/isolation.test.ts` — cobre isolamento com duas contas seedadas; requer Supabase local (`supabase start`) ou projeto de teste dedicado
- [ ] `tests/middleware/matcher.test.ts` — cobre a garantia estrutural do escopo `/admin/:path*`
- [ ] Provisionar projeto Supabase (local via CLI ou projeto de teste dedicado) para os testes de integração/RLS

---

## Verificações Somente Manuais

| Comportamento | Requisito | Por Que É Manual | Instruções de Teste |
|----------|-------------|------------|-------------------|
| Sessão persiste após refresh real do navegador | AUTH-02 | Requer navegador real com cookies persistidos entre reloads — difícil de automatizar de forma confiável | Fazer login, aguardar, dar refresh (F5) na página do painel, confirmar que permanece autenticado |
| Aviso de sessão só aparece se a renovação falhar de verdade | AUTH-04 | Requer simular expiração real de token/perda de conectividade | Deixar sessão ociosa além do tempo de expiração do token; confirmar que renovação é silenciosa em uso normal e que só aparece aviso quando a renovação falha (ex: offline) |

---

## Validation Sign-Off

- [ ] Todas as tasks têm verificação automatizada ou dependência de Wave 0
- [ ] Continuidade de amostragem: nenhuma sequência de 3 tasks sem verificação automatizada
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Sem flags de watch-mode
- [ ] Latência de feedback < 20s
- [ ] `nyquist_compliant: true` definido no frontmatter

**Aprovação:** pendente
