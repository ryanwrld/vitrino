---
phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico
plan: 03
subsystem: database
tags: [nextjs, supabase, rls, storefront]

requires:
  - phase: 04-vitrine-p-blica-e-filtragem
    provides: "queryPublicProducts, isVisible (agora exportada), RLS pública de products/product_sizes/product_photos, regra de visibilidade de esgotado (D-09/D-10/D-11)"
provides:
  - "queryPublicProductDetail() — leitura pública de detalhe de um produto, com mapa completo de tamanhos e galeria completa de fotos"
  - "isVisible() exportada de public-list.ts para reuso cross-file"
  - "ProductCard navegável (<Link>) para /loja/[slug]/[produto], slug encaminhado por toda a cadeia (page.tsx -> ProductGrid/LoadMoreButton -> ProductCard)"
affects: ["05-04 (página de detalhe do produto, consome queryPublicProductDetail)", "05-05/05-06 (painel de pedido WhatsApp)"]

tech-stack:
  added: []
  patterns:
    - "Variante single-row do padrão duas-queries-mais-join (public-list.ts) aplicada a public-detail.ts"
    - "Guard de visibilidade reusado verbatim via export de função privada (isVisible), nunca re-derivado"

key-files:
  created:
    - src/lib/products/public-detail.ts
    - tests/storefront/product-detail.test.ts
  modified:
    - src/lib/products/public-list.ts
    - src/app/loja/[slug]/product-card.tsx
    - src/app/loja/[slug]/product-grid.tsx
    - src/app/loja/[slug]/load-more-button.tsx
    - src/app/loja/[slug]/page.tsx

key-decisions:
  - "queryPublicProductDetail() retorna o mapa COMPLETO de tamanhos (não um booleano agregado) e a galeria COMPLETA de fotos (não só a capa) — diferença deliberada de queryPublicProducts, necessária para o painel de pedido (PED-02) da próxima plan"
  - "[produto] na URL é o id (UUID) do produto, não um slug novo — decisão A3 já travada em 05-RESEARCH.md, sem migration de schema"

patterns-established:
  - "public-detail.ts NUNCA importa list.ts (admin, owner-scoped) — mesma disciplina de separação já estabelecida em public-list.ts/public-actions.ts"

requirements-completed: [PED-01, PED-02]

coverage:
  - id: D1
    description: "queryPublicProductDetail retorna produto publicado+visível com mapa completo de tamanhos e galeria completa de fotos"
    requirement: "PED-02"
    verification:
      - kind: integration
        ref: "tests/storefront/product-detail.test.ts#produto publicado + visível retorna objeto com arrays completos de tamanhos e fotos"
        status: pass
    human_judgment: false
  - id: D2
    description: "queryPublicProductDetail retorna null para produto inexistente"
    requirement: "PED-01"
    verification:
      - kind: integration
        ref: "tests/storefront/product-detail.test.ts#produto inexistente retorna null"
        status: pass
    human_judgment: false
  - id: D3
    description: "queryPublicProductDetail retorna null para produto rascunho (status != published)"
    requirement: "PED-01"
    verification:
      - kind: integration
        ref: "tests/storefront/product-detail.test.ts#produto rascunho (status != published) retorna null"
        status: pass
    human_judgment: false
  - id: D4
    description: "queryPublicProductDetail retorna null para produto publicado porém oculto pela regra de esgotado (Pitfall 8 — sem bypass por link direto), reusando isVisible() verbatim"
    requirement: "PED-01"
    verification:
      - kind: integration
        ref: "tests/storefront/product-detail.test.ts#produto publicado porém oculto pela regra de esgotado retorna null (Pitfall 8 — sem bypass)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Card do grid vira Link navegável para /loja/[slug]/[produto], slug encaminhado por product-grid.tsx e load-more-button.tsx sem quebrar o build"
    verification:
      - kind: other
        ref: "npx tsc --noEmit && npm run build"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-07-14
status: complete
---

# Phase 5 Plan 3: Query de detalhe público + navegação do card Summary

**queryPublicProductDetail() (variante single-row de queryPublicProducts) reusa isVisible() exportada para bloquear bypass de esgotado por link direto; ProductCard vira `<Link>` para a rota de detalhe com slug encaminhado por toda a cadeia**

## Performance

- **Duration:** ~20min (sessão interrompida por erro transiente de conexão da API entre Task 1 e retomada — trabalho no disco preservado e revalidado antes de continuar)
- **Completed:** 2026-07-14T21:07:31Z
- **Tasks:** 2
- **Files modified:** 6 (2 criados, 4 modificados)

## Accomplishments
- `isVisible()` exportada de `public-list.ts` (era privada) — reuso cross-file sem re-derivar a regra de visibilidade de esgotado
- `queryPublicProductDetail()` criada em `src/lib/products/public-detail.ts`: busca produto por id+store_id+status='published', mapa completo de tamanhos, galeria completa de fotos; retorna `null` para inexistente, rascunho OU oculto pela regra de esgotado (reusando `isVisible()` verbatim — Pitfall 8, sem bypass por link direto)
- `tests/storefront/product-detail.test.ts` cobre as 4 combinações (visível, inexistente, rascunho, oculto-por-esgotado), 30000ms de timeout por teste, seed via `seedAuthenticatedAccount` (mesmo padrão de `sold-out-visibility.test.ts`)
- `ProductCard` envolvido num `<Link href="/loja/${slug}/${product.id}">`, prop `slug` adicionada separadamente de `PublicProductCardData`; `product-grid.tsx`, `load-more-button.tsx` e `page.tsx` (call site) encaminham `slug` por toda a cadeia

## Task Commits

Each task was committed atomically:

1. **Task 1: Exportar isVisible + queryPublicProductDetail + teste de integração** - `ae89bf8` (feat)
2. **Task 2: Card do grid vira Link para a rota de detalhe (encaminhar slug)** - `e7fb00d` (feat)

## Files Created/Modified
- `src/lib/products/public-detail.ts` - `queryPublicProductDetail()` + tipo `PublicProductDetail`
- `src/lib/products/public-list.ts` - `isVisible` agora exportada (única mudança)
- `tests/storefront/product-detail.test.ts` - 4 testes de integração cobrindo visível/inexistente/rascunho/oculto
- `src/app/loja/[slug]/product-card.tsx` - card vira `<Link>`, prop `slug` adicionada
- `src/app/loja/[slug]/product-grid.tsx` - encaminha `slug` ao `ProductCard`
- `src/app/loja/[slug]/load-more-button.tsx` - encaminha `slug` ao `ProductCard` (já tinha `slug` em escopo)
- `src/app/loja/[slug]/page.tsx` - call site de `ProductGrid` atualizado para passar `slug={slug}` (não listado no `files_modified` do frontmatter do plano, mas explicitamente exigido pela ação da Task 2 para manter o build íntegro)

## Decisions Made
- Nenhuma decisão nova além das já travadas no plano (A3 — `[produto]` é o `id` UUID, sem coluna slug nova) e no research da fase (Pitfall 8).

## Deviations from Plan

None - plan executado exatamente como escrito. A única adição fora da lista `files_modified` do frontmatter (`page.tsx`) já estava explicitamente descrita na `<action>` da Task 2 do próprio `05-03-PLAN.md` ("Atualizar o call site em page.tsx"), portanto não é um desvio — é execução literal do texto da task.

## Issues Encountered
- A execução foi interrompida por um erro transiente de conexão da API entre o fim da Task 1 (arquivos criados/editados no disco, mas não commitados) e a retomada. Nenhum trabalho foi perdido: `git status`/`git diff` confirmaram que `public-list.ts` (export de `isVisible`) e `public-detail.ts` (arquivo novo) já estavam corretos e completos no disco antes da retomada; o teste de integração ainda não existia e foi criado na sequência, junto com a validação e o commit da Task 1.
- `npx vitest run` falhou inicialmente por falta de `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` no worktree (`.env.local` é gitignored e não é compartilhado entre worktree e repo principal por padrão) — resolvido copiando `.env.local` do repo principal para o worktree (arquivo gitignored, nunca commitado, não afeta o histórico).

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- `queryPublicProductDetail()` pronta para ser consumida pela página de detalhe (`/loja/[slug]/[produto]/page.tsx`, Plan 05-04), incluindo o guard de visibilidade correto por design (nunca precisa ser re-verificado no componente de página).
- Card do grid já navega para a rota de detalhe — a rota em si (`[produto]/page.tsx`) ainda não existe (será criada em 05-04); até lá, o clique no card resulta em 404 esperado (rota inexistente), sem quebrar a vitrine existente.

---
*Phase: 05-fluxo-de-pedido-no-whatsapp-cr-tico*
*Completed: 2026-07-14*

## Self-Check: PASSED

All created files verified on disk (`src/lib/products/public-detail.ts`, `tests/storefront/product-detail.test.ts`, this SUMMARY.md) and all task/summary commit hashes (`ae89bf8`, `e7fb00d`, `e6aff1c`) verified present in `git log`.
