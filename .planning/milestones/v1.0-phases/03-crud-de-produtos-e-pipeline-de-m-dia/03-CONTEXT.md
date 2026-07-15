# Phase 3: CRUD de Produtos e Pipeline de Mídia - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

O revendedor consegue cadastrar, editar, excluir e organizar produtos completos com fotos comprimidas, controlando disponibilidade por produto e por tamanho, sempre com feedback visual imediato. Esta fase é greenfield dentro do codebase — não existe tabela `products`, bucket de storage nem pipeline de upload ainda.

</domain>

<decisions>
## Implementation Decisions

### Modelo de Tamanhos e Disponibilidade
- **D-01:** O revendedor escolhe explicitamente quais tamanhos o produto tem (não é um grid fixo sempre visível com tudo marcado por padrão) — mais realista para chuteiras, que raramente vêm em todo tamanho.
- **D-02:** O grid completo continua 36-45 (conforme PROD-02), mas a **pré-seleção padrão ao cadastrar um produto novo** vem marcada apenas de **37-43** (faixa mais comum). Os tamanhos 36, 44 e 45 ficam disponíveis para marcar manualmente quando o modelo os tiver.
- **D-03:** Tamanhos entram como **esgotado por padrão** — o revendedor confirma o que realmente tem em estoque, em vez de precisar desmarcar o que não tem. Evita mostrar tamanho errado como disponível por esquecimento.
- **D-04:** Além de marcar tamanho por tamanho, existe um atalho **"marcar produto inteiro como esgotado"** que sobrescreve todos os tamanhos de uma vez (PROD-04 menciona "produto (ou tamanho específico)" — as duas ações precisam existir).

### Marca, Linha e Solado
- **D-05:** **Marca** (Nike, Adidas, Puma, Mizuno, etc.) é uma **lista fixa pré-definida** com opção "Outra" (texto livre) para marcas fora da lista. Evita que "Nike"/"nike"/" Nike" fragmentem o filtro por marca na vitrine (VITR-02).
- **D-06:** **Linha/modelo** (Mercurial, Predator, Ultra, etc.) é **sempre texto livre** — existem centenas de linhas por marca e novas saem toda temporada; manter lista fixa seria trabalho de manutenção contínuo que ninguém vai fazer. Linha não entra nos filtros da vitrine, então inconsistência de digitação é menos grave aqui.
- **D-07:** **Solado** (FG, AG, TF, IC, MG, SG — códigos padrão da indústria) é uma **lista fixa** com esses códigos. É um conjunto pequeno e padronizado, e participa do filtro da vitrine (VITR-02) — lista fixa garante que o filtro sempre funciona.

### Fluxo de Cadastro
- **D-08:** Formulário de cadastro é **tela única** com todas as seções visíveis (nome, marca, linha, solado, categoria, modalidade, preço, tamanhos, fotos, descrição) — não é wizard multi-step. Cadastro de produto é uma ação repetida com frequência (vários produtos por sessão); um wizard adicionaria fricção repetida.
- **D-09:** Campos obrigatórios para salvar são só o mínimo: **nome, marca e preço**. Solado, linha, categoria, modalidade, tamanhos, fotos e descrição ficam opcionais no momento de salvar — permite criar um rascunho rápido e completar depois.
- **D-10:** Um produto salvo só com o mínimo (sem foto ou sem tamanho marcado) **não aparece na vitrine pública** — fica em estado de **rascunho** até o revendedor publicar explicitamente. Isso é um status **ortogonal** ao disponível/esgotado: um produto pode estar "publicado + esgotado" ou "rascunho + qualquer coisa". Precisa de um botão/ação explícita "Publicar".

### Fotos: Capa, Ordem e Edição
- **D-11:** A foto na **posição 1** do grid é automaticamente a capa exibida no card da vitrine — sem escolha explícita separada de "definir como capa".
- **D-12:** O revendedor pode **reordenar as fotos já enviadas via drag-and-drop** — como a posição 1 vira a capa, reordenar precisa ser fácil sem remover e reenviar.
- **D-13:** Ao editar um produto salvo, cada foto tem um X para **remover individualmente**; o slot vazio aceita novo upload no lugar. Não precisa mexer nas outras fotos para trocar uma.

### Claude's Discretion
- Exclusão de produto (soft delete vs. hard delete) e se tem confirmação nativa (padrão já usado no slug editor da Fase 2) fica a critério da implementação.
- Estrutura exata do schema (tabela `product_sizes` separada vs. coluna JSON) é decisão técnica do planejamento/pesquisa, não do usuário — o que foi decidido é o COMPORTAMENTO (tamanhos escolhidos, esgotado por padrão, atalho de esgotar tudo), não a representação em banco.
- UX exata de busca/filtro/ordenação no painel (PROD-06) não foi discutida em detalhe — usar padrões comuns (input de busca + selects de filtro + dropdown de ordenação) é aceitável.
- Categoria e modalidade (sob encomenda/pronta entrega/ambos) não foram discutidas em detalhe — provavelmente listas fixas curtas, seguindo o mesmo raciocínio do solado, mas a exata enumeração fica a critério do planejamento.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto do Projeto
- `.planning/PROJECT.md` — Alertas críticos #3 (upload/imagem rápido e confiável) e #4 (estoque com delay de segundos); bug catalog #6 (upload sem limite de 5MB) e #9 (ações sem feedback visual)
- `.planning/REQUIREMENTS.md` — PROD-01 a PROD-07 (requisitos desta fase); PROD-v2-01/02/03/04 (explicitamente fora de escopo: duplicar produto, esgotar tudo com 1 clique via outro fluxo, importação CSV, importação Yupoo — NÃO implementar nesta fase, exceto D-04 que já cobre "esgotar tudo" como parte do escopo core)
- `.planning/ROADMAP.md` §Phase 3 — Goal, success criteria, `Depends on: Phase 2`, `UI hint: yes`

### Estratégia de Upload/Compressão (já pesquisada, aplicar diretamente)
- `.claude/CLAUDE.md` §"Estratégia de Upload/Compressão de Imagem" e tabela de bibliotecas — `browser-image-compression` no lado do cliente é a estratégia primária (Web Worker, `maxSizeMB`/`maxWidthOrHeight`), `sharp` como camada opcional server-side
- `.claude/CLAUDE.md` — tabela "O Que NÃO Usar": não depender da API paga de transformação de imagem do Supabase Storage (não incluída no tier free)

### Padrões de Código Existentes (Fases 1-2)
- `src/app/(admin)/configuracoes/settings-form.tsx` — padrão de formulário com react-hook-form + zod já estabelecido no projeto
- `src/app/(admin)/configuracoes/slug-editor.tsx` — padrão de debounce + checagem assíncrona (`src/lib/hooks/use-debounce.ts`) que pode informar validação de disponibilidade/estado do formulário de produto
- `src/lib/validation/onboarding.ts` — padrão de schemas zod para formulários do painel

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/hooks/use-debounce.ts` — hook de debounce reutilizável (usado no slug editor), pode servir para busca de produtos no painel (PROD-06)
- `src/lib/supabase/server.ts` / `src/lib/supabase/client.ts` — clientes Supabase já configurados para Server Components/Actions e client components
- `sonner` (toast) já é dependência aprovada no CLAUDE.md para feedback visual imediato (PROD-07) — ainda não verificado se já está instalado/configurado no projeto; planner deve confirmar

### Established Patterns
- Server Actions com Zod validando no servidor (visto em `src/lib/settings/actions.ts`, `src/lib/onboarding/actions.ts`) — mesmo padrão deve se aplicar às actions de CRUD de produto
- RLS multi-tenant por `owner_id`/`store_id` (Fase 1) — toda query/mutation de produto precisa respeitar esse isolamento

### Integration Points
- Não existe tabela `products`, `product_sizes` ou bucket de storage para fotos ainda — esta fase cria a base de dados e o pipeline de mídia do zero.
- `src/lib/database.types.ts` precisa ser regenerado (`supabase gen types typescript`) após a migration desta fase, seguindo o padrão já usado nas Fases 1-2.

</code_context>

<specifics>
## Specific Ideas

- Exemplo concreto de marca/linha/solado dado pelo usuário: **Nike / Mercurial / FG** — usar como caso de teste representativo do formulário e dos filtros.
- Faixa de tamanhos padrão pré-selecionada: **37 a 43** (não 36-45, que é só o limite externo do grid completo).

</specifics>

<deferred>
## Deferred Ideas

Nenhuma ideia de escopo novo surgiu durante a discussão — ficou focada em como implementar o que já está no ROADMAP.

</deferred>

---

*Phase: 3-CRUD de Produtos e Pipeline de Mídia*
*Context gathered: 2026-07-12*
