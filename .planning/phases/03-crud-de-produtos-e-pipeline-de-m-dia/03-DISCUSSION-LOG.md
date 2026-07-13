# Phase 3: CRUD de Produtos e Pipeline de Mídia - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 3-CRUD de Produtos e Pipeline de Mídia
**Areas discussed:** Disponibilidade por tamanho, Marca/Linha/Solado, Fluxo de cadastro, Fotos (capa e edição)

---

## Disponibilidade por tamanho

| Option | Description | Selected |
|--------|-------------|----------|
| Grid fixo 36-45 sempre visível | Todos os tamanhos aparecem sempre; revendedor marca cada um disponível/esgotado | |
| Revendedor escolhe os tamanhos do produto | Seleciona quais tamanhos o modelo tem, depois marca esgotado entre esses | ✓ |

**User's choice:** Revendedor escolhe os tamanhos do produto
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Disponível por padrão | Revendedor desmarca o que não tem | |
| Esgotado por padrão | Revendedor confirma só o que tem | ✓ |

**User's choice:** Esgotado por padrão
**Notes:** Correção do usuário: a faixa pré-selecionada por padrão deve ser **37-43**, não 36-45 (que é só o limite externo do grid completo). Capturado como D-02 no CONTEXT.md.

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, botão de esgotar tudo de uma vez | Atalho que sobrescreve todos os tamanhos | ✓ |
| Não, só tamanho por tamanho | Status sempre derivado dos tamanhos individuais | |

**User's choice:** Sim, botão de esgotar tudo de uma vez

---

## Marca, Linha e Solado

**Contexto adicional do usuário:** exemplo concreto dado — Nike / Mercurial / FG (marca / linha / solado).

| Option | Description | Selected |
|--------|-------------|----------|
| Lista fixa + "Outra" | Dropdown com marcas comuns + texto livre para exceções | ✓ |
| Texto livre sempre | Campo livre, sem lista pronta | |

**User's choice:** Lista fixa + "Outra" (marca)
**Notes:** Primeira formulação da pergunta não ficou clara para o usuário; reformulada com exemplos concretos (Nike/Adidas/Puma) antes da resposta final.

| Option | Description | Selected |
|--------|-------------|----------|
| Texto livre | Sem lista fixa — centenas de linhas por marca | ✓ |
| Lista fixa por marca | Curadoria manual de linhas por marca | |

**User's choice:** Texto livre (linha/modelo)

| Option | Description | Selected |
|--------|-------------|----------|
| Lista fixa com códigos padrão (FG/AG/TF/IC/MG/SG) | Conjunto pequeno e padronizado, participa do filtro | ✓ |
| Texto livre | Mais flexível, risco de fragmentar filtro | |

**User's choice:** Lista fixa com códigos padrão (solado)

---

## Fluxo de cadastro

| Option | Description | Selected |
|--------|-------------|----------|
| Tela única | Todas as seções visíveis em uma página | ✓ |
| Wizard multi-step | Uma etapa por vez, como o onboarding | |

**User's choice:** Tela única

| Option | Description | Selected |
|--------|-------------|----------|
| Só o mínimo: nome, marca, preço | Resto opcional ao salvar | ✓ |
| Tudo obrigatório exceto descrição | Força quase todos os campos antes de salvar | |

**User's choice:** Só o mínimo: nome, marca, preço

| Option | Description | Selected |
|--------|-------------|----------|
| Fica como rascunho até publicar manualmente | Produto incompleto não aparece na vitrine | ✓ |
| Aparece na vitrine assim que salvo | Sem estado de rascunho/publicado | |

**User's choice:** Fica como rascunho até publicar manualmente

---

## Fotos (capa e edição)

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre a primeira do grid | Posição 1 = capa automaticamente | ✓ |
| Revendedor escolhe explicitamente | Botão "definir como capa" | |

**User's choice:** Sempre a primeira do grid

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, arrastar para reordenar | Drag-and-drop na grade de fotos | ✓ |
| Não, só ordem de upload | Reordenar exige remover e reenviar | |

**User's choice:** Sim, arrastar para reordenar

| Option | Description | Selected |
|--------|-------------|----------|
| Remover a foto individual e subir outra no lugar | X em cada foto, slot aceita novo upload | ✓ |
| Remove tudo e resobe as 5 do zero | Reset completo do conjunto de fotos | |

**User's choice:** Remover a foto individual e subir outra no lugar

---

## Claude's Discretion

- Exclusão de produto: soft delete vs. hard delete, e se tem confirmação nativa (padrão já usado no slug editor)
- Estrutura exata do schema (tabela `product_sizes` separada vs. coluna JSON)
- UX exata de busca/filtro/ordenação no painel (PROD-06)
- Enumeração exata de categoria e modalidade (sob encomenda/pronta entrega/ambos)

## Deferred Ideas

Nenhuma — discussão ficou dentro do escopo da fase, sem propostas de nova capacidade.
