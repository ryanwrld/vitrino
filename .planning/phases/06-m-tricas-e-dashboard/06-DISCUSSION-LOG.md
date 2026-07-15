# Phase 6: Métricas e Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 6-Métricas e Dashboard
**Areas discussed:** O que conta como acesso, Janela de tempo das métricas, Uma página ou duas (Dashboard vs Métricas) / Sidebar, Produtos mais visualizados — critério e quantidade

---

## O que conta como "acesso"

| Option | Description | Selected |
|--------|-------------|----------|
| Conta como acesso à loja também | Um único funil: acessos = qualquer carregamento de página pública (grid OU produto) | |
| Contadores separados | "Acessos" = só grid principal. Visualizações de produto contam separado | ✓ |

**User's choice:** Contadores separados, com ênfase explícita em "quais produtos" — o usuário pediu para dar destaque à métrica de visualização por produto individual, não só um total agregado.
**Notes:** Usuário pediu explicação detalhada da lógica de cada opção antes de decidir (trade-off: número único e simples vs. granularidade por origem de tráfego). Após explicação, confirmou contadores separados.

| Option | Description | Selected |
|--------|-------------|----------|
| Só carregamento inicial | Trocar filtro é navegação dentro da mesma visita, não um novo acesso | ✓ |
| Cada mudança de filtro conta | Cada requisição à página soma um acesso | |

**User's choice:** Só carregamento inicial.
**Notes:** Nenhuma.

---

## Janela de tempo das métricas

| Option | Description | Selected |
|--------|-------------|----------|
| Total desde sempre (all-time) | Soma direta, sem filtro de data; mais simples de entender | ✓ |
| Janela recente (últimos 30 dias) | Mais útil pra desempenho atual, exige decidir período e fuso horário | |

**User's choice:** Total desde sempre (all-time).
**Notes:** Nenhuma.

---

## Uma página ou duas (Dashboard vs Métricas) / Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Uma página só | `/dashboard` mostra tudo: resumo + recentes + desempenho por produto | ✓ |
| Duas páginas separadas | `/dashboard` = resumo rápido; `/metricas` = página dedicada de desempenho | |

**User's choice:** Uma página só.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Mantém saudação + atalhos, adiciona métricas abaixo | Sem remover o que já existe no placeholder | |
| Dashboard vira só métricas | Remove saudação/atalhos; navegação fica só no menu/header | |
| (Other) Sidebar de navegação | Usuário perguntou se uma sidebar global para o painel admin seria interessante | ✓ |

**User's choice:** Sidebar de navegação global para todo o painel admin (Dashboard/Produtos/Configurações) — opção não prevista nas alternativas originais, levantada pelo próprio usuário.
**Notes:** Claude sinalizou explicitamente que isso amplia o escopo nominal da fase "Métricas e Dashboard" (afeta `src/app/(admin)/layout.tsx`, compartilhado por todas as páginas do admin, não só o dashboard) e perguntou se o usuário queria incluir mesmo assim ou adiar para uma fase própria. Usuário confirmou explicitamente que quer incluir nesta fase.

| Option | Description | Selected |
|--------|-------------|----------|
| Colapsa em menu hambúrguer no mobile | Desktop: sidebar fixa lateral. Mobile: botão de menu que abre drawer/overlay | ✓ |
| Barra inferior fixa no mobile (tab bar) | Navegação vira barra fixa no rodapé com ícones, estilo app nativo | |

**User's choice:** Colapsa em menu hambúrguer no mobile.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard, Produtos, Configurações + Sair no rodapé | 3 links de navegação no corpo, logout fixado embaixo, separado visualmente | ✓ |
| Só os 3 links — logout fica noutro lugar | Sidebar só com páginas; logout num menu de perfil/avatar separado (a criar) | |

**User's choice:** Dashboard, Produtos, Configurações + Sair no rodapé.
**Notes:** Nenhuma.

---

## Produtos mais visualizados — critério e quantidade

| Option | Description | Selected |
|--------|-------------|----------|
| Só por visualizações | Ranking puro por contagem de acessos à página do produto; cliques WhatsApp aparecem separado | ✓ |
| Combina visualizações + cliques | Score ponderado (ex: visualizações + cliques × 3) determina um ranking único | |

**User's choice:** Dois contadores diretos, sem fórmula (só por visualizações; cliques WhatsApp como métrica própria por produto).
**Notes:** Usuário pediu explicação prática de como cada opção funcionaria antes de decidir. Após explicação (incluindo o argumento de que uma fórmula de score seria uma "caixa preta" sem dado histórico para calibrar, e que contraria o mandato de "contagem simples" do PROJECT.md), confirmou a opção sem fórmula.

| Option | Description | Selected |
|--------|-------------|----------|
| Top 5 | Lista curta, fácil de escanear no celular | |
| Top 10 | Lista um pouco mais longa, mais útil pra lojas com mais produtos | ✓ |

**User's choice:** Top 10.
**Notes:** Nenhuma.

---

## Claude's Discretion

- Estrutura exata da nova tabela de pageview (nome, colunas, índices, tabela única vs. duas tabelas)
- Critério de ordenação e quantidade de "produtos recentes" no dashboard
- Estilo visual exato dos cards de resumo, sidebar e menu hambúrguer
- Mecanismo técnico de captura do pageview (client-side fetch/beacon vs. registro no Server Component)
- Comportamento de empty state para loja nova (zero acessos/produtos)

## Deferred Ideas

- Página `/metricas` separada do dashboard — descartada em favor de página única.
- Score/ranking combinado de "interesse" (visualizações + cliques ponderados) — explicitamente rejeitado.
- Janela de tempo configurável para métricas (últimos 7/30 dias) — descartada em favor de totais all-time.
