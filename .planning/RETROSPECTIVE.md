# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-15
**Phases:** 6 (+ 1 decimal, executada como quick task) | **Plans:** 34 | **Timeline:** 5 dias (2026-07-10 → 2026-07-15)

### What Was Built
- Fundação multi-tenant: cadastro/login/logout/reset de senha, onboarding (identidade da loja + WhatsApp), isolamento por RLS
- Link compartilhável: slug único, QR Code, edição de configurações
- CRUD completo de produtos: fotos comprimidas, tamanhos, busca/filtro/ordenação
- Vitrine pública sem login: filtros multi-select, paginação, estoque em tempo real
- Fluxo crítico de pedido no WhatsApp: testado em matriz completa de dispositivos/navegadores (incluindo webviews in-app)
- Rebrand de identidade visual (paleta azul)
- Métricas e dashboard: captura de pageview, agregação Top-10, navegação em sidebar/drawer

### What Worked
- Migrations sempre no mesmo padrão (RLS habilitado + policy na mesma migration) tornou cada nova tabela previsível de revisar e de estender (pageviews espelhou order_clicks quase 1:1)
- Checkpoints humanos capturaram bugs reais que nenhum teste automatizado pegaria: bug crítico de iOS no wa.me (Fase 5) e 2 bugs de responsividade na sidebar (Fase 6) — ambos consertados na hora, antes de fechar o plano
- Rebrand de paleta tratado como quick task (não como fase) depois que o usuário corrigiu o escopo inicial — evitou overhead de discuss/research/UI-phase pra um find-and-replace mecânico
- Padrão de duas queries + join em memória (em vez de embed do Supabase) se manteve consistente do admin (Fase 3) até a vitrine pública (Fase 4) e o dashboard (Fase 6)

### What Was Inefficient
- REQUIREMENTS.md ficou com bookkeeping desatualizado por várias fases (7 requisitos da Fase 1 nunca foram marcados como `[x]` apesar de entregues e verificados) — só foi pego no fechamento do milestone, não durante a execução
- Push de schema pra bancos remotos bloqueado pelo gate de segurança do ambiente em toda fase que criava migration (Fase 1, Fase 6) — sempre exige retomada manual do usuário, mesmo já sendo um checkpoint esperado
- Primeira tentativa de `supabase gen types --linked` depois de aplicar a migration 0006 devolveu um arquivo idêntico ao anterior (sem os tipos novos) sem erro — silenciosamente incompleto, só detectado porque o `tsc` seguinte reclamou

### Patterns Established
- Toda tabela de evento anônimo segue "anon insert-only, owner read-scoped" — mesma forma de RLS desde `order_clicks` (Fase 5)
- Toda view de agregação usa `with (security_invoker = true)` obrigatoriamente — regra nova a partir da Fase 6, mesmo peso que RLS obrigatório em tabelas
- Rebrand/mudanças mecânicas de escopo pequeno e bem delimitado vão direto pra `/gsd-quick`, não viram fase

### Key Lessons
1. Verificar o bookkeeping de REQUIREMENTS.md a cada fechamento de fase (não só no fechamento do milestone) evita acumular gaps de documentação que parecem gaps de funcionalidade
2. Operações que tocam infraestrutura fora do repo (push de schema em produção) merecem checkpoint humano por padrão — o gate de segurança do ambiente já força isso, mas vale já esperar a interrupção no planejamento
3. Depois de qualquer regeneração de tipos (`gen types`, codegen), validar que o diff realmente mudou (grep pelos símbolos novos esperados) antes de assumir que a operação funcionou — silêncio não é sucesso

### Cost Observations
- Sessões: 1 sessão longa cobrindo desde a checagem de progresso até o fechamento completo do milestone
- Notable: uso extensivo de worktrees isolados para execução paralela de planos (Wave 2 da Fase 6 rodou 06-02 e 06-03 em paralelo sem conflito)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 6 | Primeiro milestone — padrões de RLS/views/checkpoints estabelecidos |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | ~160 (vitest) | não medido formalmente | qrcode, lucide-react (ambos com gate de legitimidade aprovado) |

### Top Lessons (Verified Across Milestones)

1. Checkpoints humanos em pontos de infraestrutura sensível (schema push, verificação de UI responsiva) capturam classes de bug que testes automatizados não cobrem
