# Phase 5: Fluxo de Pedido no WhatsApp (CRÍTICO) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 5-fluxo-de-pedido-no-whatsapp-cr-tico
**Areas discussed:** Onde a seleção de tamanho acontece, Comportamento do botão "Pedir agora", Fallback quando o link wa.me falha, Registro do clique (analytics)

---

## Onde a seleção de tamanho acontece

| Option | Description | Selected |
|--------|-------------|----------|
| Página de detalhe do produto | Clique no card navega para `/loja/[slug]/[produto]`; página dedicada com fotos maiores, todos os tamanhos, botão "Pedir agora" | ✓ |
| Expansão inline no card (modal/accordion) | Modal/bottom-sheet sobre o grid, sem navegar | |

**User's choice:** Página de detalhe do produto (recomendado)
**Notes:** Mais espaço pra UI clara, URL compartilhável do produto específico, evita complexidade de bottom-sheet responsivo no mobile.

---

## Comportamento do botão "Pedir agora"

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre clicável, shake+tooltip se vazio | Conforme já definido no ROADMAP — nunca abre WhatsApp incompleto | ✓ |
| Desabilitado até selecionar tamanho | Visualmente inativo até escolher tamanho — contradiria a redação do ROADMAP | |

**User's choice:** Sempre clicável, dispara shake+tooltip se vazio (recomendado)
**Notes:** Confirma o que já estava no ROADMAP; evita bug de "botão parece quebrado" no mobile.

### Sub-decisão: feedback ao clicar com sucesso

| Option | Description | Selected |
|--------|-------------|----------|
| Só abre o WhatsApp, sem feedback extra | Link wa.me abre; página continua igual | ✓ |
| Mostra toast de confirmação também | "Redirecionando pro WhatsApp..." | |

**User's choice:** Só abre o WhatsApp, sem feedback extra (recomendado)

---

## Fallback quando o link wa.me falha

| Option | Description | Selected |
|--------|-------------|----------|
| Botão secundário "Copiar mensagem" sempre visível | Sempre disponível, não depende de detectar falha | ✓ |
| Detecção automática de falha com fallback dinâmico | Tenta detectar que wa.me não abriu | |

**User's choice:** Botão secundário sempre visível (recomendado)

### Sub-decisão: conteúdo copiado

| Option | Description | Selected |
|--------|-------------|----------|
| Só a mensagem | Texto puro, sem número junto | ✓ (com adição abaixo) |
| Mensagem + número juntos | String única misturando dois dados | |

**User's choice:** Só a mensagem — mas o usuário levantou um requisito adicional importante: a mensagem (tanto no "Pedir agora" quanto no "Copiar") precisa incluir a foto exata do produto, já que nomes de modelo (ex. "Nike Mercurial Vapor 16") não identificam univocamente a variação de cor/edição.

**Constraint técnica descoberta durante a discussão:** o link `wa.me` do WhatsApp só aceita texto — é tecnicamente impossível anexar uma imagem via deep link em qualquer plataforma. Isso foi levantado pelo assistente e confirmado como limitação real da API do WhatsApp, não do código do projeto.

### Sub-decisão: como resolver a identificação do produto sem poder anexar foto

| Option | Description | Selected |
|--------|-------------|----------|
| Incluir link direto da foto no texto da mensagem | WhatsApp gera preview automático do link na conversa | ✓ |
| Copiar imagem+texto via Clipboard API só no fallback | Cobertura de navegador inconsistente (Safari/iOS limitado) | |
| Nome/código detalhado no texto, sem link de foto | Depende do revendedor cadastrar detalhes suficientes no nome | |

**User's choice:** Incluir o link direto da foto na mensagem de texto (recomendado)
**Notes:** Resolve tanto o "Pedir agora" quanto o "Copiar mensagem" com a mesma abordagem — nenhum precisa de tratamento especial de imagem binária.

---

## Registro do clique (analytics)

| Option | Description | Selected |
|--------|-------------|----------|
| Nova tabela de eventos simples, sem UI ainda | Tabela mínima (product_id, size, timestamp), fire-and-forget, sem dashboard nesta fase | ✓ |
| Adiar completamente pra Fase 6 | Fase 5 não registra nada; Fase 6 constrói tudo do zero | |

**User's choice:** Nova tabela de eventos simples, sem UI ainda (recomendado)
**Notes:** Evita retrabalho de schema quando a Fase 6 (Métricas e Dashboard) chegar; mantém o Success Criteria #5 do ROADMAP atendido.

---

## Claude's Discretion

- Estrutura exata da tabela `order_clicks` (nomes de coluna, índices) — desde que capture product_id + size + timestamp e respeite RLS multi-tenant.
- Estilo visual exato do shake animation e do tooltip.
- Mecanismo exato de geração da URL pública da foto de capa (reaproveitar helper do Storage da Fase 3, se existir).

## Deferred Ideas

- Dashboard/UI de métricas consumindo `order_clicks` — pertence à Fase 6 (já no ROADMAP).
- Cópia de imagem binária via Clipboard API no botão "Copiar mensagem" — descartado nesta fase por cobertura de navegador inconsistente; pode ser revisitado futuramente.
