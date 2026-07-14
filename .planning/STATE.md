---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Vitrine Pública e Filtragem
status: executing
stopped_at: Completed 04-02-PLAN.md
last_updated: "2026-07-14T03:02:16.398Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 26
  completed_plans: 22
  percent: 50
---

# Estado do Projeto

## Referência do Projeto

Ver: .planning/PROJECT.md (atualizado 2026-07-10)

**Valor central:** O cliente final consegue escolher um modelo e tamanho na vitrine e disparar uma mensagem de pedido pronta no WhatsApp do revendedor — sem fricção, sem cadastro, sem o revendedor precisar estar online.
**Foco atual:** Phase 3 — CRUD de Produtos e Pipeline de Mídia

## Posição Atual

Phase: 4 — Vitrine Pública e Filtragem
Plan: Not started
Status: Executing Phase 04
Última atividade: 2026-07-13 — Plan 03-06 concluído (queryProducts com busca/filtro/ordenação/disponibilidade derivada; /produtos lendo searchParams como fonte de verdade; toolbar debounced; rollup de disponibilidade + capa na listagem; checkpoint humano final da Fase 3 APROVADO pelo usuário no mobile — caso de teste Nike/Mercurial/FG; fix pós-checkpoint: bodySizeLimit das Server Actions ampliado para 10mb, commit 81cf8b5; PROD-06 marcado como Completo)

Progresso: [██████████] 100% (20/20 plans já planejados concluídos; Fases 4-6 ainda não planejadas em detalhe)

## Métricas de Desempenho

**Velocidade:**

- Total de planos concluídos: 0
- Duração média: —
- Tempo total de execução: —

**Por Fase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 6 | - | - |

**Tendência recente:**

- Últimos 5 planos: —
- Tendência: —

*Atualizado após a conclusão de cada plano*

## Contexto Acumulado

### Decisões

Decisões são registradas na tabela Key Decisions do PROJECT.md.
Decisões recentes que afetam o trabalho atual:

- [Init]: Stack Next.js 16 + Supabase + Vercel (pesquisa recomenda Vercel Pro; usuário optou por Hobby no MVP — risco aceito)
- [Init]: Multi-tenancy de schema compartilhado com isolamento por RLS
- [Init]: Sem OAuth/cobrança no MVP; email/senha e Free para todos

### Todos Pendentes

Nenhum ainda.

### Bloqueadores/Preocupações

- [Fase 5] Compatibilidade do `wa.me` com navegadores in-app (Instagram/WhatsApp) tem confiança BAIXA — validar em dispositivos reais durante a fase.
- [Fase 2] Normalização de telefone é focada no BR (55DDXXXXXXXXX) — deve estar travada e testada antes da Fase 5 consumi-la. (Já implementada e testada na Fase 1 — `normalizeWhatsAppBR`.)
- [Fase 1 — deferido] M-3 (AUTH-05, reset de senha por email real) ficou bloqueado no UAT: depende de configurar o template de email "Reset Password" no Supabase Dashboard (usar `{{ .TokenHash }}`) e de SMTP customizado no tier free (ver memória `project_supabase_free_tier_email_template`). Código está implementado e testado via integração — só falta a configuração manual + validação end-to-end com email real.

## Itens Adiados

Itens reconhecidos e carregados do fechamento do milestone anterior:

| Categoria | Item | Status | Adiado em |
|-----------|------|--------|-----------|
| *(nenhum)* | | | |

## Continuidade de Sessão

Última sessão: 2026-07-10
Parou em: Roadmap e STATE inicializados; rastreabilidade de requisitos atualizada
Arquivo de retomada: Nenhum

## Session

**Last session:** 2026-07-14T03:02:16.391Z
**Stopped at:** Completed 04-02-PLAN.md
**Resume file:** None

## Accumulated Context

### Roadmap Evolution

- Phase 1 edited: Escopo expandido: onboarding pós-cadastro absorve identidade da loja e WhatsApp (LOJA-01, WPP-01, WPP-02); novo requisito AUTH-05 (recuperação de senha)
- Phase 2 edited: Escopo reduzido: agora só link compartilhável (LOJA-02, LOJA-03, LOJA-04); identidade da loja e WhatsApp migraram para a Fase 1

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 02 P01 | 8min | 2 tasks | 2 files |
| Phase 02 P02 | 7min | 3 tasks | 8 files |
| Phase 02 P03 | 50min | 3 tasks | 6 files |
| Phase 02 P04 | 20min | 2 tasks | 4 files |
| Phase 02 P05 | 12min | 2 tasks | 1 files |
| Phase 02 P06 | 15min | 2 tasks | 5 files |
| Phase 03 P01 | 25min | 3 tasks | 4 files |
| Phase 03 P02 | 47min | 3 tasks | 10 files |
| Phase 03 P03 | 12min | 2 tasks | 6 files |
| Phase 03 P04 | 50min | 3 tasks | 6 files |
| Phase 03 P05 | 15min | 3 tasks | 6 files |
| Phase 03 P06 | 57min | 4 tasks | 6 files |
| Phase 04 P01 | 9min | 3 tasks | 4 files |
| Phase 04 P02 | 4min | 3 tasks | 7 files |

## Decisions

- [Phase 2]: lucide-react aprovado no gate de legitimidade (T-02-SC) — repositório github.com/lucide-icons/lucide confirmado, sem postinstall
- [Phase 02]: generateStoreSlug refatorado para delegar ao slugify() compartilhado — elimina o segundo algoritmo de slug que 02-CONTEXT.md proibia
- [Phase 02]: RPC is_slug_available (SECURITY DEFINER, boolean-only, search_path fixado) aplicada no projeto remoto — padrão para futuras checagens cross-tenant sob RLS restritiva
- [Phase 02]: settings-form.tsx escrito do zero (D-07) reusando onboardingSchema, sem importar onboarding-wizard.tsx — inclui o campo de logo (já suportado por saveStoreSettings) além de nome/cor/tagline/WhatsApp
- [Phase 02]: status checking/idle do slug-editor derivado no render (needsCheck + useTransition isPending) em vez de setState síncrono no useEffect, para conformidade com react-hooks/set-state-in-effect
- [Phase 02]: readyUrl derivado no render (comparado com publicUrl) em vez de setState síncrono no efeito do QrCodePanel — mesma correção de react-hooks/set-state-in-effect aplicada proativamente
- [Phase 02]: Plan 02-06 fechado formalmente por sessão de closeout (implementação foi feita fora do fluxo normal de orquestração) — todos os acceptance_criteria e artifacts reverificados, sem defeitos encontrados; único ajuste foi sincronizar REQUIREMENTS.md (LOJA-03/LOJA-04 Pendente para Completo)
- [Phase 03 P01]: brand/sole/category/fulfillment ficam text nullable sem check constraint de enumeração — validação de listas fixas só na camada de aplicação (Zod + constants.ts no Plan 03-02), evitando migration de correção se a lista mudar
- [Phase 03 P01]: atalho "esgotar produto inteiro" (D-04) implementado como UPDATE em lote de product_sizes, sem coluna extra de disponibilidade agregada em products — a Fase 4 deriva disponibilidade via EXISTS
- [Phase 03 P01]: PROD-01/PROD-02 NÃO marcados como Completo em REQUIREMENTS.md ainda — 03-01 entrega só a fundação de schema/RLS; 03-02-PLAN.md lista os mesmos IDs como requisito porque é lá que a UI de cadastro (o comportamento visível ao usuário) é entregue. Marcar como Completo será feito ao fechar 03-02.
- [Phase 03 P02]: BRANDS removeu Under Armour e Umbro (pedido do usuário — fora do ICP)
- [Phase 03 P02]: getOwnedStore() duplicado em products/actions.ts (mesma convenção de settings/actions.ts)
- [Phase 03 P03]: productSchema.sizes usa `.optional()` em vez de `.default([])` — `.default()` quebra a compatibilidade de tipos entre zodResolver (zod 4.4.3 + @hookform/resolvers 5.4.0) e useForm<ProductInput>; fallback `?? []` aplicado explicitamente no client e no servidor
- [Phase 03 P03]: atalho "Marcar tudo como esgotado" no size-grid.tsx diferencia modo criação (só form state, via `replace`) de modo edição (chama markProductEsgotado + toast) via prop opcional `productId` em ProductForm — preparação para o Plan 03-05
- [Phase 03 P04]: uploadAndInsertPhotos compartilhado entre saveProduct (criação) e addProductPhotos (edição) — nunca duas implementações do pipeline de validação/recontagem
- [Phase 03 P04]: updatePhotoOrder em duas fases (offset negativo temporário → posição final) para nunca violar UNIQUE(product_id, position) ao reordenar
- [Phase 03 P04]: PhotoUploader com dois modos no mesmo componente (criação: File[] pendente via onPendingFilesChange; edição: Server Actions chamadas imediatamente) — preparação para o Plan 03-05
- [Phase 03 P04, pós-checkpoint]: handleFilesSelected copia FileList para array antes de limpar input.value (bug em Edge/Chromium); crypto.randomUUID() trocado por localSlotId() com fallback não-criptográfico (exige contexto seguro, falhava via IP local em HTTP) — commit f8be197, aplicado pelo orquestrador durante a pausa do checkpoint humano
- [Phase 03 P04, pós-checkpoint]: next.config.ts ganhou allowedDevOrigins para permitir acesso ao dev server via IP de rede local (necessário para o próprio checkpoint mobile) — commit d5bbe75
- [Phase 03 P04, pós-checkpoint]: photo-uploader.tsx — notificação de fotos pendentes movida para useEffect (evita setState do pai durante render do filho) e handleDragEnd computa reorder fora do updater de setSlots (evita duplicar persistência sob Strict Mode); botões de drag/remover encolhidos mantendo 44x44px de área de toque — commit cddd237
- [Phase 03 P05]: parseProductFormData extraído de saveProduct para reuso em updateProduct — nunca duas implementações divergentes da mesma validação
- [Phase 03 P05]: product_sizes reescrito via delete+insert em updateProduct (não diff parcial), aceitável dado o tamanho pequeno do conjunto (max 10 linhas)
- [Phase 03 P05]: publishProduct/unpublishProduct sem gate de completude e sem diálogo de confirmação — toggle manual reversível (D-10, T-03-12)
- [Phase 03 P06]: queryProducts com duas queries separadas (products filtrado/ordenado + product_sizes/product_photos via .in(productIds)) + join em memória, em vez de embed único do Supabase — consistente com o precedente já estabelecido em /produtos/[id]/editar/page.tsx
- [Phase 03 P06]: ProductToolbar nunca mantém estado de filtro próprio — cada mudança reconstrói a URL via router.push a partir de currentParams (prop derivada do searchParams real), URL sempre como única fonte de verdade
- [Phase 03 P06, pós-checkpoint]: experimental.serverActions.bodySizeLimit ampliado para 10mb em next.config.ts — limite padrão de 1MB do Next quebrava saveProduct/updateProduct ao somar poucas fotos comprimidas (~1MB cada); commit 81cf8b5, aplicado pelo orquestrador durante a pausa do checkpoint humano
- [Phase 03]: Fase 3 (CRUD de Produtos e Pipeline de Mídia) completa — checkpoint humano final aprovado pelo usuário em dispositivo móvel real (caso de teste Nike/Mercurial/FG: cadastro+fotos+tamanhos, publicar/despublicar, buscar/filtrar/ordenar, editar, excluir, dois empty states)

### Blockers

- [Fase 3, herdado] Suíte completa npm test não fica verde por rate-limit de signup do Supabase Auth (sem emulador local) — recomendado priorizar antes da Fase 4 crescer a suíte ainda mais (ver deferred-items.md)
