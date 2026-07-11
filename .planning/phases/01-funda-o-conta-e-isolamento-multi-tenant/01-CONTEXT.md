# Fase 1: Fundação, Conta e Isolamento Multi-Tenant - Contexto

**Coletado em:** 2026-07-10
**Status:** Pronto para planejamento

<domain>
## Limite da Fase

O revendedor consegue criar conta, fazer login, permanecer autenticado, recuperar senha esquecida e fazer logout — sobre uma base de dados multi-tenant onde cada revendedor só enxerga os próprios dados (isolamento por RLS) e a vitrine pública nunca é bloqueada por autenticação.

**Escopo expandido nesta discussão:** logo após o cadastro, o revendedor passa por um onboarding que já coleta toda a configuração inicial da loja (nome, logo, cor de destaque, frase de apresentação) e do WhatsApp (número normalizado, template de mensagem) antes de liberar o Dashboard. Isso antecipa para a Fase 1 a UI que originalmente estava mapeada para a Fase 2 (LOJA-01..04, WPP-01, WPP-02) — ver nota estrutural abaixo.

</domain>

<decisions>
## Decisões de Implementação

### Autenticação e Sessão
- **D-01:** Cadastro com email/senha dá acesso imediato ao painel — sem exigir verificação de email antes de liberar o acesso (nada foi decidido para forçar confirmação por email como bloqueio de entrada; manter simples).
- **D-02:** Recuperação de senha ("esqueci minha senha" via link de email) faz parte do escopo desta fase, mesmo não estando nos requisitos v1 originais (AUTH-01 a AUTH-04). **Novo requisito: AUTH-05** — Revendedor pode solicitar redefinição de senha via link enviado por email.
- **D-03:** Renovação de sessão é silenciosa em segundo plano (sem countdown visível). Um aviso visível para o revendedor só deve aparecer se a renovação automática falhar de verdade (ex: perda de conectividade) — nesse caso, mostrar aviso claro para salvar o trabalho e refazer login. Não implementar um contador de sessão sempre visível.

### Fluxo Pós-Cadastro (Onboarding)
- **D-04:** Após criar a conta, o revendedor passa por um wizard de onboarding — NÃO vai direto para um Dashboard vazio. Esse wizard coleta: nome da loja, logo, cor de destaque, frase de apresentação (LOJA-01), e número de WhatsApp + template de mensagem (WPP-01, WPP-02). Só depois de completar esse onboarding o revendedor chega ao Dashboard.
- **D-05:** Slug personalizável (LOJA-02), QR Code (LOJA-03) e cópia de link (LOJA-04) **permanecem na Fase 2** — não fazem parte do onboarding inicial, só a identidade da loja e o WhatsApp.

### Claude's Discretion
- Exato fluxo de UI do onboarding (uma tela só vs. wizard multi-step) fica a critério da implementação/planejamento — o que foi decidido é QUAIS dados são coletados (identidade da loja + WhatsApp), não o layout exato.
- Estratégia técnica de sessão (cookies httpOnly do Supabase Auth vs. outra abordagem) é decisão de arquitetura, não do usuário.

</decisions>

<canonical_refs>
## Referências Canônicas

**Agentes downstream DEVEM ler estes documentos antes de planejar ou implementar.**

### Contexto do Projeto
- `.planning/PROJECT.md` — Contexto geral, alertas críticos, identidade visual
- `.planning/REQUIREMENTS.md` — Requisitos v1 (nota: AUTH-05 foi adicionado nesta discussão e ainda precisa ser propagado para este arquivo)
- `.planning/ROADMAP.md` §Phase 1 e §Phase 2 — já atualizado para refletir esta discussão: LOJA-01, WPP-01 e WPP-02 mapeados para a Fase 1; Fase 2 ficou apenas com LOJA-02..04

### Pesquisa de Arquitetura e Multi-Tenancy
- `.planning/research/ARCHITECTURE.md` — Padrão de multi-tenancy (schema compartilhado + RLS), separação de rotas `/admin/:path*` vs rota pública sem auth, recomendação de teste de isolamento com dois tenants reais antes de avançar
- `.planning/research/PITFALLS.md` — Modos de falha silenciosa do RLS (esquecer de habilitar RLS = dados públicos; habilitar RLS sem policy certa = queries retornam vazio silenciosamente)
- `.planning/research/STACK.md` — Versões e abordagem recomendada para Supabase Auth + Next.js 16

</canonical_refs>

<code_context>
## Insights de Código Existente

Projeto greenfield — nenhum código existe ainda. Nenhum mapa de codebase aplicável.

### Pontos de Integração
- Este é o primeiro código do projeto — define a base (schema, auth, middleware) que todas as fases seguintes dependem.

</code_context>

<specifics>
## Ideias Específicas

- O onboarding pós-cadastro deve ser percebido como rápido — o revendedor é não-técnico e sem paciência para sistemas complexos (conforme perfil de usuário no PROJECT.md). Preferir poucos campos obrigatórios por tela.
- Teste de isolamento RLS deve usar dois tenants reais seedados (não apenas um usuário de teste) antes de considerar a fase pronta, conforme recomendado na pesquisa de arquitetura.

</specifics>

<deferred>
## Ideias Adiadas

### Nota estrutural para o roadmap (RESOLVIDA)
A decisão D-04/D-05 expandiu o escopo real da Fase 1. `/gsd:phase --edit` foi executado após esta discussão para propagar a mudança: ROADMAP.md e REQUIREMENTS.md agora mapeiam formalmente LOJA-01, WPP-01 e WPP-02 para a Fase 1 (junto com AUTH-01..05); Fase 2 ("Link Compartilhável da Vitrine") ficou só com LOJA-02, LOJA-03 e LOJA-04. Sem inconsistência pendente.

### Verificação de email obrigatória
Considerada e descartada para o MVP — acesso imediato após cadastro é suficiente por ora. Pode voltar como ideia de v2 se abuso/spam de contas se tornar um problema real.

</deferred>

---

*Fase: 1-Fundação, Conta e Isolamento Multi-Tenant*
*Contexto coletado: 2026-07-10*
