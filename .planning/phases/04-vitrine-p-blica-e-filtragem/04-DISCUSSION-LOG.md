# Phase 4: Vitrine Pública e Filtragem - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 4-Vitrine Pública e Filtragem
**Areas discussed:** Filtros, Paginação, Produtos esgotados (visibilidade), Identidade da loja no topo

---

## Filtros — como aparecem e combinam

| Option | Description | Selected |
|--------|-------------|----------|
| Chips/pills sempre visíveis | Botões pequenos tipo tag, sempre na tela, toque direto ativa/desativa | ✓ |
| Dropdowns tradicionais | Selects como no painel admin | |
| Painel/drawer sob demanda | Botão "Filtrar" abre uma gaveta com todas as opções | |

**User's choice:** Chips/pills sempre visíveis (recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Múltipla seleção por categoria | Cliente pode marcar várias marcas/solados ao mesmo tempo | ✓ |
| Um valor por categoria | Selecionar Nike desmarca Adidas automaticamente | |

**User's choice:** Múltipla seleção por categoria (recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, busca por nome | Cliente que já sabe o modelo acha direto | ✓ |
| Não, só os filtros de categoria | Mais simples | |

**User's choice:** Sim, busca por nome (recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixos no topo/sticky | Sempre acessível pra ajustar o filtro sem rolar de volta | ✓ |
| Só no início da página | Mais simples de implementar | |

**User's choice:** Fixos no topo/sticky (recomendado)

**Notes:** Todas as 4 perguntas responderam com a opção recomendada.

---

## Paginação — mecanismo

| Option | Description | Selected |
|--------|-------------|----------|
| Botão "Carregar mais" | Simples, previsível | ✓ (mobile) |
| Scroll infinito automático | Mais fluido, mas dificulta chegar ao rodapé | |
| Paginação numerada (anterior/próxima) | Mais familiar em e-commerce tradicional | ✓ (desktop) |

**User's choice:** "modelo 1 para mobile e modelo 3 para computador" — mecanismo adaptativo por dispositivo (botão no mobile, numerada no desktop).

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mesmo padrão do admin | Consistência com o painel | |
| Não mostrar contador | Interface mais limpa | ✓ (apenas para o lojista, não pro cliente final) |

**User's choice:** "Mostra apenas pro cliente (logista), não mostrar para o usuário final" — o contador de produtos permanece exclusivo do painel admin, nunca aparece na vitrine pública.

**Notes:** Perguntas sobre reset de paginação ao trocar filtro e sobre reload dinâmico não foram apresentadas como escolha (só uma opção sensata existia); tratadas como certas por padrão (D-06/D-07).

---

## Produtos esgotados na vitrine (visibilidade)

**User's choice (resposta livre na seleção de áreas):** "a critério do usuário, ele que escolhe na hora de criar/editar o produto, se quer ocultar completamente ou não o produto esgotado" — visibilidade é uma configuração explícita do revendedor, não um comportamento fixo do sistema.

Follow-up 1 — padrão para produto novo:
| Option | Description | Selected |
|--------|-------------|----------|
| Aparece esmaecido/marcado | Padrão mais seguro, revendedor opta ativamente por ocultar | ✓ |
| Oculto por padrão | Revendedor opta ativamente por mostrar | |

**User's choice:** Aparece esmaecido/marcado (recomendado)

Follow-up 2 — escopo do controle:
| Option | Description | Selected |
|--------|-------------|----------|
| Só por produto | Toggle individual no cadastro/edição, sem preferência global | |
| Por produto + preferência global da loja | Config em /configuracoes serve de padrão pra novos produtos | ✓ |

**User's choice:** Por produto + preferência global da loja

Follow-up 3 — comportamento retroativo da preferência global (após reformulação da pergunta com exemplo concreto, pois a primeira formulação não ficou clara para o usuário):
| Option | Description | Selected |
|--------|-------------|----------|
| Exceções continuam valendo | Config geral só vale pra produtos novos daí pra frente | |
| Apaga as exceções | Config geral vira regra única pra todos os produtos, inclusive os já ajustados individualmente | ✓ |

**User's choice:** Apaga as exceções

**Notes:** Essa área expandiu o escopo original de VITR-03 (que só previa exibir disponível/esgotado) para incluir um controle de visibilidade configurável, com dois novos campos de schema (`products.hide_when_sold_out`, `stores.hide_sold_out_default`) e mudanças em formulários de duas fases já fechadas (Fase 2 `/configuracoes`, Fase 3 `product-form.tsx`). Tratado como clarificação de COMO exibir o estado de estoque, não como nova capacidade fora do domínio da fase — documentado em CONTEXT.md com nota explícita para o planner/pesquisador.

---

## Identidade da loja no topo

| Option | Description | Selected |
|--------|-------------|----------|
| Hero proeminente | Logo grande + cor de destaque + frase em destaque | ✓ |
| Cabeçalho simples e discreto | Só nome + logo pequeno, sem cor de fundo diferenciada | |

**User's choice:** Hero proeminente (recomendado)

**Notes:** Pergunta sobre renderização condicional da frase de apresentação (só se preenchida) não foi apresentada como escolha real (só uma opção sensata existia) — tratada como certa por padrão (D-13).

---

## Claude's Discretion

- Layout exato do grid de produtos (colunas, o que aparece no card)
- Estrutura técnica da paginação adaptativa (Server Component vs. Client Component)
- Texto/ícone exato do placeholder de imagem com erro (VITR-05)

## Deferred Ideas

None — discussion stayed within phase scope.
