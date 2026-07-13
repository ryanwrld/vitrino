# Phase 3: CRUD de Produtos e Pipeline de Mídia - Research

**Researched:** 2026-07-13
**Domain:** Multi-table Postgres/Supabase schema design + RLS, multi-file client-side image compression pipeline (EXIF-aware), drag-and-drop reordering, Next.js 16 Server Actions with `FormData.getAll`, react-hook-form `useFieldArray`
**Confidence:** MEDIUM (schema/architecture reasoning is HIGH — directly derived from this codebase's own established migrations/actions; the two new external libraries are MEDIUM/LOW — WebSearch-only, no Context7/official-docs tool was available this session, see Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modelo de Tamanhos e Disponibilidade**
- D-01: O revendedor escolhe explicitamente quais tamanhos o produto tem (não é um grid fixo sempre visível com tudo marcado por padrão) — mais realista para chuteiras, que raramente vêm em todo tamanho.
- D-02: O grid completo continua 36-45 (conforme PROD-02), mas a **pré-seleção padrão ao cadastrar um produto novo** vem marcada apenas de **37-43** (faixa mais comum). Os tamanhos 36, 44 e 45 ficam disponíveis para marcar manualmente quando o modelo os tiver.
- D-03: Tamanhos entram como **esgotado por padrão** — o revendedor confirma o que realmente tem em estoque, em vez de precisar desmarcar o que não tem. Evita mostrar tamanho errado como disponível por esquecimento.
- D-04: Além de marcar tamanho por tamanho, existe um atalho **"marcar produto inteiro como esgotado"** que sobrescreve todos os tamanhos de uma vez (PROD-04 menciona "produto (ou tamanho específico)" — as duas ações precisam existir).

**Marca, Linha e Solado**
- D-05: **Marca** (Nike, Adidas, Puma, Mizuno, etc.) é uma **lista fixa pré-definida** com opção "Outra" (texto livre) para marcas fora da lista. Evita que "Nike"/"nike"/" Nike" fragmentem o filtro por marca na vitrine (VITR-02).
- D-06: **Linha/modelo** (Mercurial, Predator, Ultra, etc.) é **sempre texto livre** — existem centenas de linhas por marca e novas saem toda temporada; manter lista fixa seria trabalho de manutenção contínuo que ninguém vai fazer. Linha não entra nos filtros da vitrine, então inconsistência de digitação é menos grave aqui.
- D-07: **Solado** (FG, AG, TF, IC, MG, SG — códigos padrão da indústria) é uma **lista fixa** com esses códigos. É um conjunto pequeno e padronizado, e participa do filtro da vitrine (VITR-02) — lista fixa garante que o filtro sempre funciona.

**Fluxo de Cadastro**
- D-08: Formulário de cadastro é **tela única** com todas as seções visíveis (nome, marca, linha, solado, categoria, modalidade, preço, tamanhos, fotos, descrição) — não é wizard multi-step. Cadastro de produto é uma ação repetida com frequência (vários produtos por sessão); um wizard adicionaria fricção repetida.
- D-09: Campos obrigatórios para salvar são só o mínimo: **nome, marca e preço**. Solado, linha, categoria, modalidade, tamanhos, fotos e descrição ficam opcionais no momento de salvar — permite criar um rascunho rápido e completar depois.
- D-10: Um produto salvo só com o mínimo (sem foto ou sem tamanho marcado) **não aparece na vitrine pública** — fica em estado de **rascunho** até o revendedor publicar explicitamente. Isso é um status **ortogonal** ao disponível/esgotado: um produto pode estar "publicado + esgotado" ou "rascunho + qualquer coisa". Precisa de um botão/ação explícita "Publicar".

**Fotos: Capa, Ordem e Edição**
- D-11: A foto na **posição 1** do grid é automaticamente a capa exibida no card da vitrine — sem escolha explícita separada de "definir como capa".
- D-12: O revendedor pode **reordenar as fotos já enviadas via drag-and-drop** — como a posição 1 vira a capa, reordenar precisa ser fácil sem remover e reenviar.
- D-13: Ao editar um produto salvo, cada foto tem um X para **remover individualmente**; o slot vazio aceita novo upload no lugar. Não precisa mexer nas outras fotos para trocar uma.

### Claude's Discretion
- Exclusão de produto (soft delete vs. hard delete) e se tem confirmação nativa (padrão já usado no slug editor da Fase 2) fica a critério da implementação.
- Estrutura exata do schema (tabela `product_sizes` separada vs. coluna JSON) é decisão técnica do planejamento/pesquisa, não do usuário — o que foi decidido é o COMPORTAMENTO (tamanhos escolhidos, esgotado por padrão, atalho de esgotar tudo), não a representação em banco.
- UX exata de busca/filtro/ordenação no painel (PROD-06) não foi discutida em detalhe — usar padrões comuns (input de busca + selects de filtro + dropdown de ordenação) é aceitável.
- Categoria e modalidade (sob encomenda/pronta entrega/ambos) não foram discutidas em detalhe — provavelmente listas fixas curtas, seguindo o mesmo raciocínio do solado, mas a exata enumeração fica a critério do planejamento.

### Deferred Ideas (OUT OF SCOPE)
Nenhuma ideia de escopo novo surgiu durante a discussão — ficou focada em como implementar o que já está no ROADMAP. Explicitamente fora desta fase (do REQUIREMENTS.md v2/Fora de Escopo, reafirmado nos canonical_refs do CONTEXT.md): duplicar produto (PROD-v2-01), "esgotar tudo com 1 clique" como fluxo diferente de D-04 (PROD-v2-02 — D-04 já cobre o atalho básico "esgotar produto inteiro", não confundir com um segundo mecanismo v2), importação CSV (PROD-v2-03), assistente de importação Yupoo (PROD-v2-04).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | Cadastrar produto com nome, marca, solado, categoria e modalidade | See "Standard Stack", "Architecture Patterns → Pattern 1 (schema)" — `products` table with fixed-list columns for brand/sole/category/fulfillment; see Open Question 1 for the undefined `categoria` enumeration |
| PROD-02 | Preço em BRL + tamanhos disponíveis (grid 36-45) | See "Pattern 1 (schema)" — `product_sizes` table, `numeric(10,2)` price column; see Pitfall 3 (price precision) |
| PROD-03 | Upload de até 5 fotos com compressão automática, limite de 5MB, orientação EXIF correta | See "Standard Stack → browser-image-compression", "Pattern 2 (upload pipeline)", Pitfall 4 (EXIF double-rotation) |
| PROD-04 | Marcar produto (ou tamanho específico) como disponível/esgotado | See "Pattern 1" — bulk `UPDATE product_sizes` for the whole-product shortcut, no extra column needed; resolves an ambiguity in D-04, see reasoning inline |
| PROD-05 | Editar e excluir produtos | See Pitfall 1 (storage orphan cleanup on delete), "Don't Hand-Roll" (hard delete recommendation) |
| PROD-06 | Listar, buscar por nome, filtrar (status/marca/solado), ordenar (recente/nome/preço) | See "Pattern 3 (search/filter/sort via searchParams)", reuses `useDebouncedValue` from Phase 2 |
| PROD-07 | Feedback visual imediato (toast) em toda ação | See "Standard Stack" — `sonner`, already wired into this codebase's Server Action → `useTransition` → toast convention |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Estratégia de Upload/Compressão de Imagem:** `browser-image-compression` no lado do cliente é a estratégia primária (Web Worker, `maxSizeMB`/`maxWidthOrHeight`); `sharp` é uma camada opcional server-side de defesa em profundidade — **não obrigatória para o MVP**. Não depender da API paga de transformação de imagem do Supabase Storage (não incluída no tier gratuito).
- **Mobile-first obrigatório:** qualquer feature que quebre no mobile não vai para produção — aplica-se diretamente ao drag-and-drop de fotos (precisa funcionar por toque, não só mouse) e aos formulários de cadastro/edição.
- **Rota pública sem auth:** não se aplica a esta fase (painel admin é autenticado) — mas o **schema desta fase** é a fundação que a Fase 4 (vitrine pública) vai consumir sem middleware de auth, então o design de `status`/`published` precisa já prever esse consumo.
- **Sem cobrança no MVP:** não aplicável a esta fase.
- **Next.js 16 (Cache Components, opt-in cache):** não introduzir `"use cache"` nas rotas do painel de produtos — o painel precisa refletir mudanças imediatamente após salvar/editar/excluir (mesma disciplina de "sem cache" já usada nas Fases 1-2).
- **TypeScript/ESLint flat config/Supabase CLI para geração de tipos:** `src/lib/database.types.ts` deve ser regenerado via `supabase gen types typescript` após a migration desta fase (mesmo padrão das Fases 1-2).

## Summary

Esta fase é a primeira totalmente greenfield no nível de dados: não existe `products`, `product_sizes`, bucket de fotos nem pipeline de upload multi-arquivo ainda. A boa notícia é que o codebase já estabeleceu, nas Fases 1-2, todos os padrões estruturais que esta fase precisa repetir — RLS habilitada na mesma migration que cria a tabela, Server Actions com Zod revalidando no servidor, magic-byte validation de imagem, e o padrão `getOwnedStore()` de resolver `store_id` a partir de `auth.uid()`. O trabalho real desta fase é de **design de schema** (uma tabela `products` + duas tabelas filhas `product_sizes` e `product_photos`, nunca colunas JSON — ver Pattern 1) e de **pipeline de upload multi-arquivo com reordenação** (compressão client-side já resolvida pela stack aprovada; a peça nova é como persistir ordem de fotos de forma que arrastar-e-soltar seja uma operação barata, não um rename de arquivo em storage).

Duas bibliotecas novas entram nesta fase, nenhuma delas exótica: `browser-image-compression` (já pré-aprovada no CLAUDE.md, mas ainda não instalada — `package.json` atual não a lista) para compressão + correção automática de orientação EXIF, e `@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities` para o drag-and-drop de fotos (não avaliada anteriormente neste projeto, mas é o padrão de mercado 2026 para reordenação acessível/touch-friendly em React — HTML5 native drag-and-drop não suporta toque nem teclado de forma confiável, o que é desqualificante para um público mobile-first). Ambas passaram no gate de legitimidade de pacote sem ressalvas.

A decisão de design mais importante desta pesquisa é resolver uma ambiguidade textual em D-04 ("atalho que sobrescreve todos os tamanhos de uma vez"): a leitura mais simples e literal é que o botão "marcar produto inteiro como esgotado" é apenas um `UPDATE product_sizes SET available = false WHERE product_id = X` em lote — **não precisa de uma coluna extra de disponibilidade no nível do produto**. A disponibilidade "vista" no card da vitrine (Fase 4) é sempre derivada de `EXISTS (SELECT 1 FROM product_sizes WHERE product_id = X AND available = true)`, o que também cobre naturalmente o caso de um produto sem nenhum tamanho marcado (aparece esgotado, consistente com D-03). Isso simplifica o schema e evita um estado duplicado (produto "esgotado" globalmente vs. tamanhos individuais) que poderia divergir.

**Primary recommendation:** três tabelas relacionais (`products`, `product_sizes`, `product_photos`) com RLS habilitada na mesma migration, um bucket `product-images` público seguindo o padrão de path `{owner_id}/{product_id}/{uuid}.{ext}` já usado por `store-assets`, compressão client-side via `browser-image-compression` (compress → EXIF auto-corrigido → upload) e reordenação de fotos via `@dnd-kit/sortable` atualizando apenas a coluna `position` (nunca renomeando arquivos no bucket).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cadastro/edição de produto (nome, marca, solado, categoria, modalidade, preço, descrição) | API / Backend (Server Action) | Browser / Client (Zod + react-hook-form) | Mesmo padrão de `saveStoreSettings`/`saveOnboarding`: validação client-side para feedback instantâneo, revalidação server-side obrigatória antes de tocar o banco |
| Compressão de imagem + correção de orientação EXIF | Browser / Client | — | `browser-image-compression` roda em Web Worker no navegador, antes do arquivo sair do celular do revendedor — nunca no servidor (evita gastar banda enviando o arquivo bruto de 5-20MB de uma câmera de celular) |
| Upload de fotos para Storage | API / Backend (Server Action recebendo arquivos já comprimidos) | Database / Storage | Server Action valida magic bytes + tamanho (defesa em profundidade, mesmo padrão de `validateLogoFile`) antes de repassar ao Supabase Storage |
| Ordem/reordenação de fotos (drag-and-drop) | Browser / Client (`@dnd-kit`) | API / Backend (persistir `position`) | Interação de arrastar é puramente client-side; a única escrita ao servidor é um `UPDATE` em lote da coluna `position`, nunca um rename de objeto no bucket |
| Disponibilidade por tamanho / atalho "esgotar produto" | API / Backend (Server Action → `UPDATE product_sizes`) | Browser / Client (toggle otimista + toast) | Mutação de estado precisa de RLS/owner-scoping no servidor; o toggle visual pode responder otimisticamente, mas a fonte de verdade é sempre o banco |
| Status rascunho/publicado | API / Backend | Database / Storage (coluna `status`, consumida sem RLS bypass pela Fase 4 via policy pública restrita a `status = 'published'`) | Este é o "portão" que a vitrine pública (Fase 4) vai depender — decisão de schema desta fase, consumo de query na próxima |
| Listagem, busca, filtro, ordenação no painel | API / Backend (Server Component lendo via `searchParams`) | Browser / Client (input de busca com debounce) | Mesmo padrão recomendado para a Fase 4 (VITR — filtros persistidos em query params); aqui aplicado ao painel admin, reaproveitando `useDebouncedValue` já existente |
| Toast de feedback (salvar/editar/excluir/esgotar) | Browser / Client (`sonner`) | — | Já é convenção estabelecida em `settings-form.tsx`/`slug-editor.tsx` — só repetir o padrão, sem decisão nova |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `browser-image-compression` | 2.0.2 [VERIFIED: npm registry] | Compressão + correção de orientação EXIF no cliente antes do upload | Já pré-aprovada em `.claude/CLAUDE.md`/`STACK.md` como a estratégia primária de compressão do projeto; ainda **não está em `package.json`** — esta é a primeira fase que efetivamente a instala e usa |
| `@dnd-kit/core` | 6.3.1 [VERIFIED: npm registry] | Motor de drag-and-drop acessível (mouse/touch/teclado) | HTML5 native drag-and-drop não suporta toque de forma confiável (bloqueador direto do mandato mobile-first) nem navegação por teclado (acessibilidade); `@dnd-kit` é o padrão de mercado 2026 para isso em React [ASSUMED — WebSearch only, sem Context7/docs oficiais disponíveis nesta sessão] |
| `@dnd-kit/sortable` | 10.0.0 [VERIFIED: npm registry] | Preset de lista ordenável (usado sobre `@dnd-kit/core`) para a grade de até 5 fotos | Elimina a necessidade de implementar detecção de colisão e cálculo de reordenação manualmente — exatamente o tipo de problema "não reinvente" para D-12 |
| `@dnd-kit/utilities` | 3.2.2 [VERIFIED: npm registry] | Helpers de transform CSS (`CSS.Transform.toString`) usados junto com `@dnd-kit/sortable` | Dependência companion padrão nos exemplos oficiais do dnd-kit; sem ela a transição visual do arraste precisa ser recalculada manualmente |
| `zod` | 4.4.3 (já instalado) | Schema de validação do formulário de produto (nome/marca/preço obrigatórios; solado/linha/categoria/modalidade/tamanhos/fotos/descrição opcionais, D-09) | Já é a convenção do projeto (`onboardingSchema`, `slugSchema`) — estender com um novo `productSchema`, não introduzir uma segunda lib de validação |
| `react-hook-form` + `@hookform/resolvers` | 7.81.0 / 5.4.0 (já instalados) | Estado do formulário de produto, incluindo a grade de tamanhos via `useFieldArray` | Mesma convenção de `settings-form.tsx`; `useFieldArray` é a peça nova nesta fase (grade de tamanhos como array de objetos `{ size, available }`) |
| `sonner` | 2.0.7 (já instalado) | Toast de sucesso/erro em cada ação (PROD-07) | Já em uso em `settings-form.tsx`/`slug-editor.tsx` — apenas repetir o padrão |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` + `tailwind-merge` | 2.1.1 / 3.6.0 [VERIFIED: npm registry] | Composição condicional de className (pílula "esgotado"/"disponível", chip de filtro ativo, estado de foto sendo arrastada) | Pré-aprovadas no CLAUDE.md mas ainda **não instaladas** — esta fase é a primeira com estados condicionais visuais suficientes (status/disponibilidade/filtros ativos) para justificar a introdução, em vez de concatenação manual de strings de classe |
| `sharp` | 0.35.3 [VERIFIED: npm registry] | Recompressão/thumbnail opcional no servidor (defesa em profundidade) | **Não necessário para o MVP** por decisão explícita do CLAUDE.md — só adicionar se o planner decidir deliberadamente por uma segunda camada server-side; não incluir por padrão |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `product_sizes`/`product_photos` como tabelas relacionais separadas | Colunas `jsonb` em `products` (ex.: `sizes jsonb`, `photos jsonb`) | Rejeitado: JSON dificulta RLS granular por linha, índices, e updates atômicos de reordenação (`UPDATE ... SET position = X WHERE id = Y`); a Fase 4 também vai precisar filtrar/contar tamanhos disponíveis por produto de forma eficiente, o que é nativo em tabelas relacionais e artificial em JSON. CONTEXT.md deixa essa escolha a critério da pesquisa — tabelas relacionais são a recomendação |
| `@dnd-kit/sortable` para reordenar fotos | HTML5 native `draggable`/`ondragover` | Rejeitado: sem suporte confiável a touch (mobile-first é requisito rígido do projeto) nem a teclado; exigiria reimplementar manualmente o que `@dnd-kit` já resolve |
| Coluna `numeric(10,2)` para preço | Coluna `integer` (centavos) | Ambas evitam erro de ponto flutuante no Postgres (`numeric` é decimal exato). `numeric(10,2)` foi preferido por exigir menos conversão na exibição (não precisa dividir por 100 em toda leitura), ao custo de precisar de um parser dedicado (`parseBRLPrice`) no servidor para nunca confiar em `parseFloat` cru do input do usuário |
| Bucket público `product-images` (`public: true`) | Bucket privado com signed URLs | Rejeitado: a vitrine pública (Fase 4, `VITR-01`) precisa carregar imagens sem sessão/auth alguma — signed URLs expiram e exigiriam um endpoint de renovação que este projeto não tem escopo para construir; segue exatamente o mesmo padrão já adotado por `store-assets` no Plan 01 |

**Installation:**
```bash
npm install browser-image-compression @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities clsx tailwind-merge
```

**Version verification:** `npm view browser-image-compression version` → `2.0.2` (publicado 2023-03-06, ~1.25M downloads/semana). `npm view @dnd-kit/core version` → `6.3.1` (~16.4M downloads/semana), `@dnd-kit/sortable` → `10.0.0` (~19.6M/semana), `@dnd-kit/utilities` → `3.2.2` (~16.3M/semana). `npm view clsx version` → `2.1.1` (~92.5M/semana), `npm view tailwind-merge version` → `3.6.0` (publicado 2026-05-10, ~63.4M/semana). Todos sem `scripts.postinstall`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| browser-image-compression | npm | Publicado 2023-03-06 (estável há anos) | 1,253,809/wk | github.com/Donaldcwl/browser-image-compression | OK | Approved |
| @dnd-kit/core | npm | Publicado 2024-12-05 | 16,405,493/wk | github.com/clauderic/dnd-kit | OK | Approved |
| @dnd-kit/sortable | npm | Publicado 2024-12-04 | 19,626,492/wk | github.com/clauderic/dnd-kit | OK | Approved |
| @dnd-kit/utilities | npm | Publicado 2023-11-06 | 16,330,948/wk | github.com/clauderic/dnd-kit | OK | Approved |
| clsx | npm | Publicado 2024-04-23 | 92,509,274/wk | github.com/lukeed/clsx | OK | Approved |
| tailwind-merge | npm | Publicado 2026-05-10 | 63,413,906/wk | github.com/dcastil/tailwind-merge | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — todos os seis pacotes retornaram `OK` no gate automático (repositório fonte confirmado, sem `postinstall`, downloads semanais em milhões, nenhum sinalizado como recém-publicado ou obscuro).

*Todos os nomes de pacote acima foram descobertos via WebSearch/conhecimento de treinamento (não via Context7/documentação oficial nesta sessão — ver Assumptions Log), então mesmo com verdict `OK` no registro, permanecem tagueados `[ASSUMED]` quanto à adequação/API exata; a existência e legitimidade no registro estão `[VERIFIED: npm registry]`.*

## Architecture Patterns

### System Architecture Diagram

```
Revendedor (painel admin, mobile-first)
        │
        ▼
┌───────────────────────────┐
│ Formulário de Produto      │  react-hook-form + Zod (productSchema)
│ (tela única, D-08)         │  useFieldArray → grade de tamanhos 36-45
└──────────┬──────────────────┘
           │ fotos selecionadas (até 5, File[])
           ▼
┌───────────────────────────┐
│ browser-image-compression  │  Web Worker: comprime + corrige EXIF
│ (client-side, por arquivo) │  → cada File comprimido, ≤ maxSizeMB
└──────────┬──────────────────┘
           │ FormData (campos + photos[] comprimidos)
           ▼
┌───────────────────────────────────────────┐
│ Server Action (saveProduct / updateProduct) │
│  1. getOwnedStore() → store_id via owner_id  │
│  2. Zod revalida no servidor                 │
│  3. magic-byte + 5MB check por foto           │
│  4. upsert products / product_sizes           │
│  5. upload cada foto → bucket product-images   │
│  6. insert/update product_photos (position)     │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌───────────────────────────┐        ┌─────────────────────────────┐
│ Supabase Postgres (RLS)    │        │ Supabase Storage             │
│ products / product_sizes /  │◄──────┤ bucket product-images        │
│ product_photos              │        │ path: {owner_id}/{product_id}│
└──────────┬──────────────────┘        └─────────────────────────────┘
           │ toast de sucesso/erro (sonner)
           ▼
   Painel de produtos (listar/buscar/filtrar/ordenar)
           │
           ▼
   [Fase 4 — Vitrine pública, fora do escopo desta fase,
    consome apenas products com status = 'published']
```

### Recommended Project Structure
```
src/
├── app/(admin)/produtos/
│   ├── page.tsx                # lista + busca/filtro/ordenação (Server Component, searchParams)
│   ├── novo/page.tsx            # formulário de cadastro
│   ├── [id]/editar/page.tsx     # formulário de edição
│   ├── product-form.tsx         # componente client compartilhado (novo/editar)
│   ├── product-list.tsx         # tabela/grid de produtos + filtros
│   ├── size-grid.tsx            # grade 36-45 com useFieldArray
│   └── photo-uploader.tsx       # upload + compressão + @dnd-kit reorder
├── lib/
│   ├── products/
│   │   ├── actions.ts           # Server Actions: save/update/delete/toggle
│   │   └── constants.ts         # listas fixas (marcas, solados, categorias, modalidades)
│   ├── validation/
│   │   └── product.ts           # productSchema (Zod)
│   └── currency/
│       └── brl.ts                # parseBRLPrice / formatBRLPrice (dedicado, como normalize-br.ts)
supabase/migrations/
└── 0003_products_schema_rls.sql  # products + product_sizes + product_photos + RLS + bucket product-images
```

### Pattern 1: Schema relacional — três tabelas, RLS na mesma migration

**What:** `products` (dados do produto), `product_sizes` (uma linha por tamanho 36-45 presente), `product_photos` (uma linha por foto, com `position` explícita). Nenhuma coluna JSON para tamanhos/fotos.

**When to use:** Sempre nesta fase — CONTEXT.md deixa a estrutura exata a critério da pesquisa, mas o comportamento decidido (tamanhos escolhidos individualmente, esgotado por padrão, atalho de esgotar tudo, capa = posição 1, reordenação sem reenvio) só é barato de implementar com tabelas relacionais.

```sql
-- Source: padrão já estabelecido em 0001_init_stores_rls.sql (RLS na mesma
-- migration da criação da tabela — Armadilha 4 do 01-RESEARCH.md)

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  brand text not null,                 -- lista fixa (D-05) ou 'outra'
  brand_other text,                    -- texto livre quando brand = 'outra'
  line text,                           -- linha/modelo, sempre texto livre (D-06)
  sole text,                           -- FG/AG/TF/IC/MG/SG (D-07) ou null
  category text,                       -- lista fixa curta — ver Open Question 1
  fulfillment text,                    -- 'sob_encomenda' | 'pronta_entrega' | 'ambos'
  price numeric(10,2) not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "owner_full_access_products" on products
  for all using (store_id in (select id from stores where owner_id = auth.uid()));

create table product_sizes (
  product_id uuid not null references products(id) on delete cascade,
  size smallint not null check (size between 36 and 45),
  available boolean not null default false,  -- esgotado por padrão (D-03)
  primary key (product_id, size)
);

alter table product_sizes enable row level security;

create policy "owner_full_access_product_sizes" on product_sizes
  for all using (
    product_id in (
      select id from products where store_id in (select id from stores where owner_id = auth.uid())
    )
  );

create table product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

alter table product_photos enable row level security;

create policy "owner_full_access_product_photos" on product_photos
  for all using (
    product_id in (
      select id from products where store_id in (select id from stores where owner_id = auth.uid())
    )
  );
```

**Resolução da ambiguidade D-04 ("sobrescreve todos os tamanhos de uma vez"):** o atalho "marcar produto inteiro como esgotado" é implementado como um único `UPDATE product_sizes SET available = false WHERE product_id = $1` — não precisa de uma coluna extra de disponibilidade agregada em `products`. A vitrine (Fase 4) deriva "produto esgotado" via `EXISTS (SELECT 1 FROM product_sizes WHERE product_id = $1 AND available = true)`. Isso também cobre de graça o rascunho sem tamanhos (D-10): sem linhas em `product_sizes`, o `EXISTS` é falso, então o produto já nasce "esgotado" até o revendedor marcar algo — nenhum estado duplicado a manter sincronizado.

### Pattern 2: Pipeline de upload — comprimir no cliente, persistir ordem via coluna, nunca renomear arquivo

**What:** Cada arquivo selecionado passa por `imageCompression()` no navegador (Web Worker, correção automática de orientação EXIF) antes de entrar no `FormData`. No servidor, cada foto vira uma linha em `product_photos` com um `storage_path` gerado (UUID, nunca o nome original do arquivo) e uma `position` — reordenar é só um `UPDATE position`, nunca mover/renomear o blob no bucket.

**When to use:** Todo upload de foto de produto (PROD-03), e toda reordenação via drag-and-drop (D-12).

```typescript
// Client — compressão antes do upload (browser-image-compression)
// Source: WebSearch digest deste README (sem Context7 disponível nesta sessão) — [ASSUMED, ver Assumptions Log]
import imageCompression from "browser-image-compression";

async function compressProductPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    // orientação EXIF é detectada e corrigida automaticamente por padrão;
    // não passar `exifOrientation` manualmente a menos que se precise
    // sobrescrever a detecção automática.
  });
}
```

```typescript
// Server Action — múltiplos arquivos via FormData.getAll (padrão análogo a
// validateLogoFile em src/lib/settings/actions.ts, agora em loop)
const photos = formData.getAll("photos") as File[];
if (photos.length > 5) {
  return { error: "No máximo 5 fotos por produto." };
}

for (const [index, photo] of photos.entries()) {
  const validationError = await validatePhotoFile(photo); // magic bytes + 5MB, mesmo padrão de validateLogoFile
  if (validationError) return validationError;

  const path = `${owned.userId}/${productId}/${crypto.randomUUID()}.${photoExtension(photo.type)}`;
  const { error: uploadError } = await owned.supabase.storage
    .from("product-images")
    .upload(path, photo, { contentType: photo.type });
  if (uploadError) return { error: "Não foi possível enviar uma das fotos. Tente novamente." };

  await owned.supabase.from("product_photos").insert({
    product_id: productId,
    storage_path: path,
    position: index, // posição 0 = capa (D-11)
  });
}
```

```typescript
// Client — reordenação com @dnd-kit/sortable, sincronizada com o array de
// fotos exibido (posição 0 = capa). Persistência real acontece num Server
// Action separado (updatePhotoOrder), chamado no onDragEnd.
// Source: padrão oficial documentado no site do dnd-kit (react quickstart)
// [ASSUMED — WebSearch only]
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";

function handleDragEnd(event: DragEndEvent, photos: PhotoItem[], setPhotos: (p: PhotoItem[]) => void) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = photos.findIndex((p) => p.id === active.id);
  const newIndex = photos.findIndex((p) => p.id === over.id);
  const reordered = arrayMove(photos, oldIndex, newIndex);
  setPhotos(reordered); // otimista

  startTransition(async () => {
    const result = await updatePhotoOrder(
      reordered.map((p, index) => ({ id: p.id, position: index }))
    );
    if ("error" in result) toast.error(result.error);
  });
}
```

### Pattern 3: Busca/filtro/ordenação via `searchParams` no Server Component

**What:** A página de listagem (`/produtos`) lê `status`, `brand`, `sole`, `q` (busca), `sort` de `searchParams` e monta a query Supabase server-side — mesma filosofia recomendada para a Fase 4 (`VITR-02`, filtros persistidos em query params), aplicada aqui ao painel.

**When to use:** PROD-06.

```typescript
// app/(admin)/produtos/page.tsx (Server Component)
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; brand?: string; sole?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("products").select("*").eq("store_id", storeId);
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.status) query = query.eq("status", params.status);
  if (params.brand) query = query.eq("brand", params.brand);
  if (params.sole) query = query.eq("sole", params.sole);

  const sortColumn = { recente: "created_at", nome: "name", preco: "price" }[params.sort ?? "recente"];
  query = query.order(sortColumn, { ascending: params.sort === "nome" });

  const { data: products } = await query;
  // ...
}
```

O input de busca no client usa `useDebouncedValue` (já existe em `src/lib/hooks/use-debounce.ts`, criado na Fase 2) para não disparar `router.push` a cada tecla — mesmo hook, mesmo padrão, sem reimplementação.

### Anti-Patterns to Avoid
- **Guardar tamanhos/fotos como `jsonb`:** dificulta RLS por linha, updates atômicos de posição e queries de disponibilidade agregada que a Fase 4 vai precisar (ex.: "produtos com pelo menos 1 tamanho disponível").
- **Renomear/mover arquivos no bucket para reordenar fotos:** operações de storage são mais lentas e propensas a erro do que um `UPDATE` de uma coluna inteira; a coluna `position` existe exatamente para evitar isso.
- **Confiar em `parseFloat` cru do campo de preço:** locale BR usa vírgula decimal (`199,90`); um parser dedicado (`parseBRLPrice`) evita o mesmo tipo de bug de "campo mal interpretado" que o catálogo de bugs do PROJECT.md já lista para outros campos.
- **Validar limite de 5 fotos só no client:** replicar a mesma defesa em profundidade já usada para o magic-byte/5MB do logo — o Server Action precisa recontar fotos existentes + novas antes de aceitar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Compressão de imagem + correção de orientação EXIF | Canvas manual + leitura de EXIF a mão | `browser-image-compression` | Já pré-aprovada pelo CLAUDE.md; lida com casos-limite de EXIF (rotação 90°/180°/270°, espelhamento) que um `canvas.drawImage` ingênuo não trata |
| Drag-and-drop de fotos acessível a toque/teclado | `onDragStart`/`onDragOver` nativos do HTML5 | `@dnd-kit/core` + `@dnd-kit/sortable` | HTML5 DnD nativo não suporta touch de forma confiável (bloqueador direto do mandato mobile-first) nem teclado |
| Parsing/formatação de preço em BRL | Regex customizada em cada tela que exibe preço | Um único helper dedicado `src/lib/currency/brl.ts` (`parseBRLPrice`/`formatBRLPrice`), no mesmo espírito de `normalize-br.ts` | Centraliza a única fonte de verdade de conversão string↔numeric, evita duas implementações divergentes (mesmo raciocínio já aplicado ao slug) |
| Debounce de busca no painel | Novo hook de debounce | `useDebouncedValue` (já existe, `src/lib/hooks/use-debounce.ts`) | Reaproveitar em vez de duplicar — já testado e usado no editor de slug |
| Toast de feedback | Componente de notificação customizado | `sonner` (já instalado) | Já é a convenção estabelecida nas Fases 1-2 |

**Key insight:** Esta fase não introduz nenhum problema genuinamente novo de "não reinvente a roda" além de compressão de imagem (já resolvido) e drag-and-drop (resolvido por `@dnd-kit`). O risco real está em schema/persistência (Pattern 1) e em disciplina de revalidação server-side (Pattern 2), não em bibliotecas.

## Common Pitfalls

### Pitfall 1: Excluir produto não limpa os arquivos no Storage
**What goes wrong:** `on delete cascade` remove as linhas de `product_photos`, `product_sizes` e o próprio `products`, mas **não** apaga os blobs em `storage.objects` — Storage é um sistema separado, sem FK do Postgres.
**Why it happens:** É fácil assumir que CASCADE cobre "tudo", mas ele só cobre linhas de tabela dentro do mesmo schema Postgres.
**How to avoid:** O Server Action de exclusão precisa, antes (ou depois, em best-effort) do `DELETE FROM products`, buscar os `storage_path` das fotos e chamar `supabase.storage.from('product-images').remove([...paths])` explicitamente.
**Warning signs:** Uso de armazenamento do bucket crescendo sem relação com o número de produtos ativos; arquivos órfãos visíveis no dashboard do Supabase Storage.

### Pitfall 2: RLS de `product_sizes`/`product_photos` esquecida ou adicionada depois
**What goes wrong:** Se a `alter table ... enable row level security` não estiver na mesma migration que o `create table`, existe uma janela onde a tabela fica sem proteção (mesma Armadilha 4 documentada no 01-RESEARCH.md para `stores`).
**Why it happens:** Fácil de esquecer em tabelas filhas (a atenção tende a ir para a tabela "principal" `products`).
**How to avoid:** Seguir literalmente o padrão de `0001_init_stores_rls.sql` — cada `create table` é imediatamente seguida de `enable row level security` + policy, nunca num passo/migration separado.
**Warning signs:** Query cross-tenant em `product_sizes`/`product_photos` retornando dados de outra loja durante o teste de isolamento RLS (ver Validation Architecture).

### Pitfall 3: Precisão de preço em BRL
**What goes wrong:** `numeric(10,2)` no Postgres é decimal exato (sem risco de arredondamento no banco), mas o **input do usuário** ("R$ 199,90") e o JavaScript (`Number`/`parseFloat`, que é float de 64 bits) podem introduzir erro de arredondamento antes do dado chegar ao banco.
**Why it happens:** `parseFloat("199,90")` retorna `199` (vírgula não é separador decimal em JS) — um bug silencioso de truncamento, não um erro visível.
**How to avoid:** Um parser dedicado (`parseBRLPrice`) que trata vírgula como separador decimal e ponto como separador de milhar antes de converter para `number`/string a ser enviada ao Postgres; nunca usar `parseFloat` direto no valor digitado.
**Warning signs:** Produtos salvos com preço "199" quando o revendedor digitou "199,90".

### Pitfall 4: Dupla rotação de imagem (EXIF)
**What goes wrong:** `browser-image-compression` já corrige a rotação da imagem "queimando" a orientação correta nos pixels do canvas de saída. Se o pipeline também tentar aplicar CSS `image-orientation` ou reprocessar EXIF em outra etapa (ex.: um passo `sharp` server-side mal configurado), a imagem pode acabar rotacionada duas vezes.
**Why it happens:** Times assumem que "correção de orientação" precisa acontecer em toda camada — mas só precisa acontecer uma vez.
**How to avoid:** Deixar a correção acontecer **apenas** no `browser-image-compression` (comportamento padrão, sem precisar de opção extra); não adicionar nenhuma etapa server-side de correção de orientação nesta fase (sharp é opcional e, se usado, é para recompressão/thumbnail, não para reprocessar orientação).
**Warning signs:** Fotos de produto aparecendo de lado ou de cabeça para baixo apenas em alguns dispositivos/navegadores.

### Pitfall 5: `useFieldArray` e `@dnd-kit` com estado dessincronizado
**What goes wrong:** Reordenar visualmente a lista de fotos (drag) sem chamar o método `move()`/`swap()` do próprio `useFieldArray` deixa o estado interno do react-hook-form dessincronizado do DOM, causando bugs de submissão (ordem errada enviada) que só aparecem depois de várias interações.
**Why it happens:** `@dnd-kit` manipula sua própria lista de itens (`fields`); é tentador atualizar só esse array local sem propagar para o form state.
**How to avoid:** No `onDragEnd`, sempre invocar `move(oldIndex, newIndex)` do `useFieldArray` (se a grade de fotos estiver sob controle do react-hook-form) em vez de só reordenar um array de estado paralelo.
**Warning signs:** Testes manuais onde arrastar a foto 3 para a posição 1 salva com a ordem antiga.

### Pitfall 6: Limite de 5 fotos validado só no cliente
**What goes wrong:** Um Server Action chamado diretamente (bypass do form, ou uma segunda aba enviando em paralelo) pode empurrar mais de 5 fotos se a contagem não for revalidada no servidor.
**Why it happens:** A UI já desabilita o input após 5 seleções, dando falsa sensação de segurança.
**How to avoid:** No Server Action, contar `product_photos` existentes + novas fotos recebidas e rejeitar acima de 5, retornando erro amigável via toast (PROD-07) — mesmo padrão de defesa em profundidade já usado para o magic-byte/5MB.
**Warning signs:** Produto com 6+ fotos visível no banco.

## Code Examples

### `productSchema` (Zod) — campos mínimos obrigatórios (D-09)
```typescript
// src/lib/validation/product.ts
import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do modelo"),
  brand: z.string().trim().min(1, "Selecione a marca"),
  brandOther: z.string().trim().optional(),
  line: z.string().trim().optional(),
  sole: z.string().trim().optional(),
  category: z.string().trim().optional(),
  fulfillment: z.enum(["sob_encomenda", "pronta_entrega", "ambos"]).optional(),
  price: z.string().trim().min(1, "Informe o preço"), // string bruta; parseBRLPrice converte no servidor
  description: z.string().trim().optional(),
  sizes: z
    .array(z.object({ size: z.number().int().min(36).max(45), available: z.boolean() }))
    .default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
```

### Grade de tamanhos com pré-seleção 37-43 (D-02, D-03)
```typescript
// size-grid.tsx — pré-popula 36-45, mas só 37-43 vêm com available:false
// (esgotado por padrão, D-03) e "selecionadas" (D-02); 36/44/45 ficam fora
// do array `sizes` até o revendedor adicioná-las manualmente (D-01).
const DEFAULT_SIZE_RANGE = [37, 38, 39, 40, 41, 42, 43];

const defaultSizes = DEFAULT_SIZE_RANGE.map((size) => ({ size, available: false }));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| HTML5 native `draggable` para reordenação | `@dnd-kit` (touch/keyboard-first) | Consolidado como padrão de mercado nos últimos anos [ASSUMED] | Necessário para o requisito mobile-first deste projeto |
| Compressão de imagem só server-side (ex.: `sharp` no upload) | Compressão client-side antes do upload (`browser-image-compression`) | Já era a decisão da Fase 0/STACK.md deste projeto, não uma mudança nesta fase | Reduz banda/latência de upload em conexões móveis, evita custo de storage transform pago do Supabase |

**Deprecated/outdated:** Nenhum achado de deprecação relevante nesta pesquisa — todas as bibliotecas recomendadas estão ativamente mantidas (ver Package Legitimacy Audit).

## Assumptions Log

> Todas as claims tagueadas `[ASSUMED]` nesta pesquisa vêm de WebSearch (nenhuma ferramenta Context7/documentação oficial estava disponível nesta sessão — `mcp__context7__*` não apareceu na lista de ferramentas). Nenhuma delas é uma claim de compliance/segurança de alto risco; todas são escolhas de biblioteca/padrão de UI com alternativas conhecidas caso a recomendação não se confirme na prática.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `browser-image-compression` corrige orientação EXIF automaticamente por padrão, sem precisar passar `exifOrientation` manualmente | Pattern 2, Pitfall 4 | Baixo/médio — se o comportamento padrão não corrigir automaticamente, fotos de produto podem aparecer rotacionadas; fácil de detectar em teste manual e corrigir passando a opção explicitamente |
| A2 | `@dnd-kit` é o padrão de mercado 2026 para drag-and-drop React, superior ao HTML5 nativo para touch/teclado | Standard Stack, Don't Hand-Roll | Baixo — mesmo que não seja "o" padrão consensual, a razão técnica (suporte a touch/teclado) é verificável independentemente e continua válida |
| A3 | Enumeração da lista fixa de `categoria` (PROD-01) não foi definida em nenhum documento do projeto | Open Question 1 | Médio — se o planner assumir uma enumeração errada, pode exigir migration de correção depois; ver recomendação e pergunta explícita abaixo |
| A4 | Publicar um produto (rascunho → publicado, D-10) não exige validação de completude (foto/tamanho mínimos) — é um toggle manual | Open Question 2 | Baixo/médio — se o usuário esperava um gate automático, a UX pode publicar produtos "vazios" sem aviso; fácil de ajustar depois com um aviso não-bloqueante |

**Se esta tabela estivesse vazia:** não é o caso aqui — ver as duas Open Questions abaixo, que dependem diretamente de A3/A4.

## Open Questions

1. **Qual é a enumeração exata de `categoria` (PROD-01)?**
   - What we know: PROD-01/REQUIREMENTS.md lista "categoria e modalidade" como campos separados; `modalidade` já está definida no próprio texto do requisito como `sob encomenda/pronta entrega/ambos`. `categoria` não tem definição em nenhum documento do projeto (PROJECT.md, ROADMAP.md, CONTEXT.md) além de "provavelmente lista fixa curta" (CONTEXT.md, Claude's Discretion).
   - What's unclear: se `categoria` é um agrupamento por tipo de calçado (ex.: "Chuteira", "Tênis", "Chinelo") ou por outro eixo (ex.: faixa etária/gênero). Note que `solado` (FG/AG/TF/IC/MG/SG) já cobre o eixo "superfície de jogo" (campo/society/futsal/indoor), então `categoria` provavelmente não deveria duplicar esse mesmo eixo.
   - Recommendation: tratar como lista fixa curta de **tipo de calçado** (ex.: `["Chuteira", "Tênis", "Chinelo", "Outro"]`), pois é o eixo que não colide com `solado`/`modalidade` e é consistente com o fato de revendedores de importados no Yupoo tipicamente carregarem catálogos multi-categoria além de chuteiras. **Esta é uma recomendação, não uma decisão travada** — o planner deve tratar a enumeração exata como algo a confirmar (via `checkpoint:human-verify` ou uma pergunta rápida ao usuário antes de fixar a `check constraint` no schema, já que alterar depois exige migration).

2. **O botão "Publicar" (D-10) exige completude mínima (≥1 foto, ≥1 tamanho disponível) antes de permitir a ação, ou é um toggle manual sem validação?**
   - What we know: D-10 diz que um produto salvo só com o mínimo "não aparece na vitrine pública — fica em rascunho até o revendedor publicar explicitamente". Não especifica se o botão "Publicar" em si valida completude.
   - What's unclear: se publicar um produto sem foto/tamanho deveria ser bloqueado, ou apenas permitido com um aviso não-bloqueante.
   - Recommendation: não bloquear — é um toggle manual, consistente com a filosofia geral de "poucos campos obrigatórios" (D-09) e com o princípio de não adicionar validação que o usuário não pediu explicitamente. Opcionalmente, mostrar um aviso inline não-bloqueante ("Este produto ainda não tem fotos") ao lado do botão "Publicar" quando faltar foto/tamanho — decisão de UI, não de dados.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime do projeto | ✓ | v26.3.0 | — |
| npm | Instalação de dependências | ✓ | 11.16.0 | — |
| Supabase CLI (via `npx supabase`) | Migrations, `gen types typescript` | ✓ | 2.109.1 | — |
| Projeto Supabase remoto linkado | Migrations aplicadas em produção/staging | ✓ (`project-ref` presente em `supabase/.temp/`) | — | — |
| `.env.local` (credenciais Supabase para testes) | Testes de integração (`tests/rls/isolation.test.ts` e equivalentes desta fase) | ✓ (arquivo existe) | — | — |
| `browser-image-compression`, `@dnd-kit/*`, `clsx`, `tailwind-merge` | PROD-03, D-12 | ✗ (não estão em `package.json` ainda) | — | Instalar via `npm install` como primeira tarefa desta fase — sem fallback necessário, apenas um passo de setup |

**Missing dependencies with no fallback:** nenhuma — as bibliotecas ausentes são apenas "ainda não instaladas", não indisponíveis.
**Missing dependencies with fallback:** nenhuma.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 |
| Config file | `vitest.config.ts` (raiz do projeto) |
| Quick run command | `npx vitest run tests/products/<arquivo>.test.ts` |
| Full suite command | `npm test` (equivale a `vitest run`, roda todos os `tests/**/*.test.ts`) |

Este projeto usa testes de **integração reais** contra um projeto Supabase remoto de teste (não mocka o cliente Supabase — só mocka `next/headers`/`next/navigation` quando necessário para simular o ambiente de Server Action fora do Next.js runtime), seguindo o padrão de `tests/rls/isolation.test.ts` e `tests/settings/*.test.ts`. Contas são seedadas via `signUp`/`signInWithPassword` reais (nunca via role administrativa), usando o helper `tests/setup/supabase-test.ts`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROD-01 | Cadastro salva nome/marca/solado/categoria/modalidade | integration | `npx vitest run tests/products/create-product.test.ts` | ❌ Wave 0 |
| PROD-02 | Preço BRL + tamanhos 36-45 persistidos corretamente (incluindo parsing de vírgula decimal) | integration | `npx vitest run tests/products/create-product.test.ts` | ❌ Wave 0 |
| PROD-03 | Upload de até 5 fotos, rejeita 6ª foto e arquivo >5MB (magic bytes) | integration | `npx vitest run tests/products/photo-upload.test.ts` | ❌ Wave 0 |
| PROD-04 | Toggle de tamanho individual + atalho "esgotar produto inteiro" (bulk update) | integration | `npx vitest run tests/products/availability.test.ts` | ❌ Wave 0 |
| PROD-05 | Editar produto existente; excluir remove linhas + arquivos de storage (Pitfall 1) | integration | `npx vitest run tests/products/edit-delete-product.test.ts` | ❌ Wave 0 |
| PROD-06 | Busca por nome, filtro status/marca/solado, ordenação recente/nome/preço | integration | `npx vitest run tests/products/list-filter-sort.test.ts` | ❌ Wave 0 |
| PROD-07 | Toast de sucesso/erro (verificado via retorno `{success}`/`{error}` do Server Action, já que toast é DOM/client-only) | integration | Coberto pelos mesmos arquivos acima — cada teste assevera o shape de retorno que dispara o toast correto | ❌ Wave 0 |
| — | Isolamento RLS entre tenants para `products`/`product_sizes`/`product_photos` (mesmo padrão de `tests/rls/isolation.test.ts`) | integration | `npx vitest run tests/rls/product-isolation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/products/<arquivo-relevante>.test.ts`
- **Per wave merge:** `npm test` (suíte completa)
- **Phase gate:** Suíte completa verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/products/create-product.test.ts` — cobre PROD-01/PROD-02
- [ ] `tests/products/photo-upload.test.ts` — cobre PROD-03, Pitfall 6 (limite de 5)
- [ ] `tests/products/availability.test.ts` — cobre PROD-04
- [ ] `tests/products/edit-delete-product.test.ts` — cobre PROD-05, Pitfall 1 (limpeza de storage)
- [ ] `tests/products/list-filter-sort.test.ts` — cobre PROD-06
- [ ] `tests/rls/product-isolation.test.ts` — isolamento multi-tenant das três novas tabelas
- [ ] Nenhuma nova instalação de framework necessária — Vitest já configurado e em uso

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Não (herdado) | Já garantido por `requireCompletedOnboarding()` nas rotas do painel; nenhuma superfície nova de auth nesta fase |
| V3 Session Management | Não | Sem mudança de sessão nesta fase |
| V4 Access Control | **Sim — central** | RLS habilitada na mesma migration para `products`, `product_sizes`, `product_photos` (Pattern 1), seguindo o padrão de owner-scoping já estabelecido; nenhum novo `SECURITY DEFINER` é necessário nesta fase (ao contrário da Fase 2) porque não há necessidade de checagem cross-tenant — cada revendedor só precisa ver/editar seus próprios produtos |
| V5 Input Validation | Sim | Zod schema (`productSchema`) revalidado no servidor; magic-byte + limite de 5MB por foto (reutilizando o padrão de `validateLogoFile`); parser dedicado de preço BRL evitando `parseFloat` cru (Pitfall 3) |
| V6 Cryptography | Não | Nenhuma operação criptográfica nova |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Upload de arquivo malicioso disfarçado de imagem (extensão/mimetype falsificados) | Tampering / Elevation of Privilege | Validação de magic bytes no servidor (mesmo padrão de `validateLogoFile`), nunca confiar apenas em `file.type` do navegador |
| Cross-tenant leitura/escrita em `product_sizes`/`product_photos` via policy RLS ausente/incorreta em tabela filha | Information Disclosure / Tampering | RLS habilitada na mesma migration da criação da tabela (Pitfall 2), com policy referenciando `store_id`/`owner_id` via subquery em `products`→`stores`, testado explicitamente em `tests/rls/product-isolation.test.ts` |
| Arquivos órfãos no bucket após exclusão de produto (não é uma vulnerabilidade clássica STRIDE, mas é um risco de superfície/custo) | (Availability/Denial of Service por esgotamento de quota, indiretamente) | Limpeza explícita de `storage.objects` no Server Action de exclusão (Pitfall 1) |
| Bypass do limite de 5 fotos via chamada direta ao Server Action (fora da UI) | Tampering | Recontagem server-side de `product_photos` existentes + novas antes de aceitar upload (Pitfall 6) |

## Sources

### Primary (HIGH confidence)
- Leitura direta do codebase: `supabase/migrations/0001_init_stores_rls.sql`, `0002_slug_availability_rpc.sql`, `src/lib/settings/actions.ts`, `src/lib/onboarding/actions.ts`, `src/app/(admin)/configuracoes/slug-editor.tsx`, `src/app/(admin)/configuracoes/settings-form.tsx`, `src/lib/hooks/use-debounce.ts`, `src/lib/database.types.ts`, `tests/rls/isolation.test.ts`, `tests/setup/supabase-test.ts`, `vitest.config.ts`, `package.json`
- `npm view` direto contra o registro npm para todas as 6 bibliotecas novas (versão, data de publicação, downloads/semana, `repository.url`, `scripts.postinstall`)

### Secondary (MEDIUM confidence)
- `.claude/CLAUDE.md` / `.planning/research/STACK.md` — estratégia de compressão/upload de imagem já pesquisada e aprovada em sessão anterior

### Tertiary (LOW confidence)
- WebSearch: comportamento de `exifOrientation`/correção automática do `browser-image-compression` (nenhuma ferramenta Context7 disponível nesta sessão para confirmar contra a documentação oficial)
- WebSearch: comparação `@dnd-kit` vs. HTML5 native drag-and-drop
- WebSearch: padrão de RLS multi-arquivo do Supabase Storage
- WebSearch: padrão `useFieldArray` + Zod do react-hook-form
- WebSearch: padrão `formData.getAll()` para múltiplos arquivos em Server Actions do Next.js

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — pacotes verificados no registro npm (HIGH para existência/legitimidade), mas comportamento exato de API só confirmado via WebSearch (sem Context7 disponível)
- Architecture: HIGH — schema e padrões de Server Action derivados diretamente das migrations/actions já existentes neste codebase, não de fontes externas
- Pitfalls: HIGH para os pitfalls de schema/storage/preço (derivados de raciocínio direto sobre este codebase), MEDIUM para os pitfalls de `@dnd-kit`/EXIF (dependem do comportamento exato das bibliotecas, ainda não testado neste projeto)

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (30 dias — stack majoritariamente estável; revalidar `@dnd-kit`/`browser-image-compression` se a fase não for planejada/executada dentro desse prazo)
