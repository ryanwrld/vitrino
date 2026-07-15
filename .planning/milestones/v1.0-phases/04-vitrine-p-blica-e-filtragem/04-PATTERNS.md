# Fase 4: Vitrine Pública e Filtragem - Mapa de Padrões

**Mapeado em:** 2026-07-13
**Arquivos analisados:** 15
**Analogs encontrados:** 12 / 15

## Classificação de Arquivos

| Arquivo Novo/Modificado | Papel | Fluxo de Dados | Analog Mais Próximo | Qualidade do Match |
|---|---|---|---|---|
| `src/app/loja/[slug]/page.tsx` (reescrita) | route (Server Component) | request-response / CRUD (read) | `src/app/(admin)/produtos/page.tsx` | role-match (mesmo papel, escopo diferente: público vs. owner-scoped) |
| `src/lib/products/public-list.ts` (novo) | service / query pura | CRUD (read, paginado) | `src/lib/products/list.ts` (`queryProducts`) | exato (mesmo autor pede espelhamento direto) |
| `src/app/loja/[slug]/product-filters.tsx` (novo) | component (Client) | request-response (URL como estado) | `src/app/(admin)/produtos/product-toolbar.tsx` | role-match (single-select → multi-select) |
| `src/app/loja/[slug]/product-grid.tsx` (novo) | component (Server) | transform (renderização de lista) | `src/app/(admin)/produtos/product-list.tsx` | role-match (lista admin → grid público) |
| `src/app/loja/[slug]/product-card.tsx` (novo) | component (Server) | transform | `src/app/(admin)/produtos/product-list.tsx` (item `<li>`) | role-match (item de lista → card) |
| `src/app/loja/[slug]/image-with-fallback.tsx` (novo) | component (Client) | event-driven (`onError`) | `src/app/(admin)/produtos/product-list.tsx` (bloco `ImageOff` fallback, linhas 94-108) | role-match (mesmo padrão de fallback, extraído para componente dedicado) |
| `src/app/loja/[slug]/load-more-button.tsx` (novo) | component (Client) | event-driven / Server Action | `src/app/(admin)/produtos/product-list.tsx` (`useTransition` + Server Action + `toast`, linhas 56-80) | role-match (delete→toast vs. load-more→append) |
| `src/app/loja/[slug]/pagination-numbered.tsx` (novo) | component (Server) | request-response (links `?page=N`) | nenhum analog direto (nenhuma paginação numerada existe hoje) | ver "Sem Analog" |
| `src/app/loja/[slug]/store-hero.tsx` (novo) | component (Server) | transform | `src/app/(admin)/configuracoes/settings-form.tsx` (uso de `store.accentColor`/`tagline`/logo) | partial-match (consumidor de dados de `stores`, não formulário) |
| `src/lib/products/actions.ts` (`fetchNextPage`, nova Server Action) | service (Server Action) | request-response | `src/app/(admin)/produtos/product-list.tsx` → `deleteProduct` (padrão de Server Action chamada de Client Component) | role-match |
| `src/app/(admin)/produtos/product-form.tsx` (modificado — campo `hide_when_sold_out`) | component (Client, formulário) | CRUD (update) | mesmo arquivo — estende padrão de campo já existente (`select`/`register`) | exato (extensão de arquivo já existente) |
| `src/lib/products/actions.ts` (`saveProduct`/`updateProduct`, modificados) | service (Server Action) | CRUD | mesmo arquivo — bloco `insert`/`update` linhas 264-277, 347-360 | exato |
| `src/app/(admin)/configuracoes/settings-form.tsx` (modificado — campo `hide_sold_out_default`) | component (Client, formulário) | CRUD (update) | mesmo arquivo — estende seção "Loja" já existente | exato |
| `src/lib/settings/actions.ts` (`saveStoreSettings`, modificado + reset de exceções D-11) | service (Server Action) | CRUD + batch (reset em lote) | mesmo arquivo, `saveStoreSettings` linhas 156-227 | exato |
| `supabase/migrations/0004_public_storefront_rls_and_visibility.sql` (novo) | migration | CRUD (DDL) + RLS policy | `supabase/migrations/0003_products_schema_rls.sql` | exato (mesma disciplina de "create + enable RLS + policy na mesma migration") |

## Atribuições de Padrão

### `src/lib/products/public-list.ts` (service, CRUD paginado)

**Analog:** `src/lib/products/list.ts` (`queryProducts`)

**Imports pattern** (linhas 1-2 do analog):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
```

**Assinatura e forma de dupla-query** (linhas 58-100 do analog — copiar a estrutura, adaptar filtros):
```typescript
export async function queryProducts(
  supabase: SupabaseClient<Database>,
  storeId: string,
  params: QueryProductsParams
): Promise<QueriedProduct[]> {
  let query = supabase
    .from("products")
    .select("id, name, brand, brand_other, line, price, status")
    .eq("store_id", storeId);

  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.brand) query = query.eq("brand", params.brand);
  // ...

  const { data: products, error } = await query;
  if (error || !products || products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const { data: sizeRows } = await supabase
    .from("product_sizes")
    .select("product_id, available")
    .in("product_id", productIds);
  const { data: photoRows } = await supabase
    .from("product_photos")
    .select("product_id, storage_path, position")
    .in("product_id", productIds)
    .order("position", { ascending: true });
  // join em memória — availableProductIds (Set), coverPathByProductId (Map)
}
```

**Divergências obrigatórias em relação ao analog (não copiar sem adaptar):**
- `status` NUNCA vem de `params`/`searchParams` — sempre fixo `.eq("status", "published")` (RESEARCH Pattern 3).
- `brand`/`sole`/`fulfillment` usam `.in("campo", array)` em vez de `.eq("campo", valor)` — multi-select (D-02).
- Adicionar `.range(from, to)` para paginação — usar a técnica "buscar `PAGE_SIZE + 1`, mostrar `PAGE_SIZE`, `hasMore = length > PAGE_SIZE`" (RESEARCH Open Question 3), não `count: "exact"`.
- Aplicar a regra de visibilidade de esgotado (ver Pattern Compartilhado "Regra hide_when_sold_out" abaixo) depois do join em memória, antes do `return`.
- `supabase` continua sendo recebido como parâmetro (nunca criado dentro da função) — mesma disciplina do analog, mas aqui o client é anônimo (sem sessão), não o client autenticado do owner.

---

### `src/app/loja/[slug]/page.tsx` (route, Server Component)

**Analog primário (estrutura de query→render):** `src/app/(admin)/produtos/page.tsx` (não lido integralmente nesta sessão — usar `product-toolbar.tsx`/`product-list.tsx` como referência de composição de `searchParams` → função de query → componentes filhos)
**Analog secundário (contrato de não-auth a preservar):** o próprio placeholder atual, `src/app/loja/[slug]/page.tsx` (linhas 1-9 — comentário obrigatório sobre ausência de auth deve ser preservado/adaptado, não removido)

**Padrão de `searchParams` multi-valor (Next 16, sempre `Promise`)** — código do RESEARCH.md (Code Examples), a copiar:
```typescript
type LojaSearchParams = {
  q?: string;
  brand?: string | string[];
  sole?: string | string[];
  modalidade?: string | string[];
  page?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function LojaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<LojaSearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brands = toArray(sp.brand);
  // ...
}
```

**Aviso obrigatório no topo do arquivo (preservar do placeholder, adaptar texto):**
```typescript
/**
 * Vitrine pública — Server Component sem NENHUMA checagem de auth.
 * NUNCA adicionar "use cache" nesta rota nem em public-list.ts — o
 * estoque precisa refletir o painel do revendedor com delay de segundos
 * (mandato CLAUDE.md/PROJECT.md), e o Next 16 Cache Components é opt-in.
 */
```

---

### `src/app/loja/[slug]/product-filters.tsx` (component, Client, request-response via URL)

**Analog:** `src/app/(admin)/produtos/product-toolbar.tsx`

**Imports pattern** (linhas 1-7):
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { BRANDS, SOLES } from "@/lib/products/constants";
```

**Padrão "URL como única fonte de verdade" (nunca estado próprio de filtro)** (linhas 21-53, comentário + efeito de busca debounced):
```typescript
// Nunca escreve estado próprio de filtro — cada mudança chama router.push
// reconstruindo a URL a partir de currentParams (prop derivada de
// searchParams real). Busca por nome usa useDebouncedValue (400ms);
// toggles de filtro disparam router.push imediatamente.
useEffect(() => {
  const currentQ = currentParams.q ?? "";
  if (debouncedSearch === currentQ) return;
  navigate({ q: debouncedSearch || undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [debouncedSearch]);
```

**Divergência obrigatória — multi-select em vez de single-select (D-02, D-06):**
```typescript
// Em vez de search.set("brand", value) (single-select do admin), usar
// searchParams.getAll("brand") + toggle por chip + reset explícito de page:
function toggleBrand(brand: string, active: boolean, currentBrands: string[]) {
  const next = active ? currentBrands.filter((b) => b !== brand) : [...currentBrands, brand];
  const search = new URLSearchParams(restParams);
  search.delete("brand");
  next.forEach((b) => search.append("brand", b));
  search.delete("page"); // D-06 — todo filtro reseta a paginação
  router.push(`/loja/${slug}?${search.toString()}`);
}
```
(Ver também RESEARCH.md Code Examples — "Chip de filtro multi-select" para a versão completa do componente `BrandChip`, incluindo classes `aria-pressed`/tokens de cor `#00C46A`/`#F5F5F3`/`#111111`.)

**UI de chips sticky (D-04)** — não existe analog direto de `sticky` no codebase; usar Tailwind `sticky top-0 z-10 bg-white` no container do filtro, seguindo o padrão de `flex flex-wrap gap-2` já usado em `product-toolbar.tsx` linha 81.

---

### `src/app/loja/[slug]/product-card.tsx` + `product-grid.tsx` (component, Server, transform)

**Analog:** `src/app/(admin)/produtos/product-list.tsx`

**Padrão de item de card com foto+fallback+preço+disponibilidade** (linhas 94-131):
```tsx
<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F3]">
  {product.coverUrl ? (
    <Image src={product.coverUrl} alt={product.name} fill sizes="64px" className="object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <ImageOff className="h-6 w-6 text-[#6B6B6B]" aria-hidden="true" />
    </div>
  )}
</div>
{/* ... */}
<span className={`flex items-center gap-1 text-xs ${product.disponivel ? "text-[#00C46A]" : "text-[#6B6B6B]"}`}>
  <span className={`h-1.5 w-1.5 rounded-full ${product.disponivel ? "bg-[#00C46A]" : "bg-[#6B6B6B]"}`} aria-hidden="true" />
  {product.disponivel ? "Disponível" : "Esgotado"}
</span>
<span className="text-sm font-medium text-[#111111]">{formatBRLPrice(product.price)}</span>
```
Adaptar: card público não tem botões editar/excluir (linhas 133-149 do analog NÃO devem ser copiadas); usar `ImageWithFallback` (novo componente, ver abaixo) em vez do fallback inline, já que aqui a imagem pode falhar no CDN do Storage (não só "sem foto"), exigindo `onError` (Client Component), que o card em si (Server Component) não pode ter diretamente.

**Import de `formatBRLPrice`:**
```typescript
import { formatBRLPrice } from "@/lib/currency/brl";
```

---

### `src/app/loja/[slug]/image-with-fallback.tsx` (component, Client, event-driven)

**Analog:** bloco fallback de `product-list.tsx` (linhas 94-108) + código de referência do RESEARCH.md

**Código de referência (RESEARCH.md Code Examples, copiar quase 1:1):**
```tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

export function ImageWithFallback({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = useState(!src);
  if (errored || !src) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#F5F5F3]">
        <ImageOff className="h-8 w-8 text-[#6B6B6B]" aria-hidden="true" />
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} fill className="rounded-xl object-cover" onError={() => setErrored(true)} />
  );
}
```
Tokens de cor (`#F5F5F3`/`#6B6B6B`) e ícone (`ImageOff` de `lucide-react`) já são os mesmos usados em `product-list.tsx` — nenhuma nova dependência.

---

### `src/app/loja/[slug]/load-more-button.tsx` (component, Client, event-driven + Server Action)

**Analog:** `src/app/(admin)/produtos/product-list.tsx` (padrão `useTransition` + Server Action + `toast`, linhas 3, 56-80)

**Padrão de Client Component chamando Server Action com `useTransition`** (linhas 65-80, adaptado):
```tsx
"use client";
import { useState, useTransition } from "react";

export function LoadMoreButton({ slug, page, searchParams, initialHasMore }: Props) {
  const [items, setItems] = useState<PublicProduct[]>([]);
  const [currentPage, setCurrentPage] = useState(page);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const result = await fetchNextPage(slug, searchParams, currentPage + 1); // Server Action
      setItems((prev) => [...prev, ...result.products]);
      setCurrentPage((p) => p + 1);
      setHasMore(result.hasMore);
    });
  }

  return (
    <>
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
      {hasMore && (
        <button onClick={handleLoadMore} disabled={isPending} className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white disabled:opacity-60">
          {isPending ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </>
  );
}
```
Nota: `product-list.tsx` usa `toast.error`/`toast.success` (linhas 72-74) para feedback de ação — `LoadMoreButton` não precisa de toast (não é uma ação destrutiva/crítica), mas se `fetchNextPage` puder falhar, seguir o mesmo padrão `if ("error" in result) toast.error(...)`.

---

### `src/app/loja/[slug]/pagination-numbered.tsx` (component, Server) — SEM ANALOG DIRETO

Nenhuma paginação numerada existe hoje no codebase. Usar padrão genérico Next.js: `<Link href={`/loja/${slug}?${searchWithPage(n)}`}>` — server component puro, sem estado. Ver RESEARCH.md Pattern 6 para o wrapper CSS `hidden md:flex` que decide qual dos dois controles (numerado vs. "carregar mais") aparece.

---

### Extensão de `product-form.tsx` (campo `hide_when_sold_out`, D-09)

**Analog:** o próprio arquivo — padrão de campo `select` com label+erro já estabelecido (linhas 156-173, campo `brand`)
```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="hideWhenSoldOut" className="text-sm font-medium text-[#111111]">
    Exibir quando esgotado
  </label>
  <select
    id="hideWhenSoldOut"
    {...register("hideWhenSoldOut")}
    className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
  >
    <option value="">Usar padrão da loja</option>
    <option value="false">Sempre mostrar (esmaecido)</option>
    <option value="true">Ocultar da vitrine</option>
  </select>
</div>
```
Nota de schema: `hide_when_sold_out` é `boolean | null` (D-10, ver RESEARCH Pitfall 5) — o valor `""` do select deve mapear para `null` no parse (`parseProductFormData`), não para `false`.

### Extensão de `settings-form.tsx` (campo `hide_sold_out_default`, D-09)

**Analog:** o próprio arquivo — seção "Loja" (linhas 79-137), campo `accentColor`/`tagline` como referência de wrapper label+input
```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="hideSoldOutDefault" className="text-sm font-medium text-[#111111]">
    Ocultar produtos esgotados por padrão
  </label>
  <select
    id="hideSoldOutDefault"
    {...register("hideSoldOutDefault")}
    className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
  >
    <option value="false">Não — mostrar esmaecido (padrão)</option>
    <option value="true">Sim — ocultar da vitrine</option>
  </select>
</div>
```

### Extensão de `src/lib/settings/actions.ts` (`saveStoreSettings`, D-11 — reset em lote)

**Analog:** o próprio arquivo, bloco de update de `stores` (linhas 200-208) + padrão `getOwnedStore()` (linhas 63-84)
```typescript
const { error: storeUpdateError } = await owned.supabase
  .from("stores")
  .update({ hide_sold_out_default: parsed.data.hideSoldOutDefault /* ...demais campos */ })
  .eq("id", owned.storeId);

if (!storeUpdateError) {
  // D-11: sobrescreve/apaga TODAS as exceções por produto desta loja —
  // efeito colateral esperado e documentado, não um bug.
  await owned.supabase
    .from("products")
    .update({ hide_when_sold_out: null })
    .eq("store_id", owned.storeId);
}
```
Seguir a mesma estrutura de retorno `SettingsActionResult` (`{ error: string } | { success: true }`) já usada no arquivo — nunca lançar exceção.

---

### `supabase/migrations/0004_public_storefront_rls_and_visibility.sql` (migration)

**Analog:** `supabase/migrations/0003_products_schema_rls.sql`

**Disciplina obrigatória herdada (comentário de cabeçalho do analog, linhas 1-15):** toda mudança de schema/policy nesta migration deve seguir "nunca separar `create table`/`alter table` de `enable row level security` e sua policy" — aqui adaptado para "nunca adicionar uma policy pública sem testar isolamento cross-tenant/status antes do merge" (ver RESEARCH Pitfall 1).

**Padrão de policy aditiva `to anon`** (RESEARCH.md Pattern 1, a escrever nesta migration):
```sql
create policy "public_read_published_stores" on stores
  for select
  to anon
  using (true);

create policy "public_read_published_products" on products
  for select
  to anon
  using (status = 'published');

create policy "public_read_published_product_sizes" on product_sizes
  for select
  to anon
  using (product_id in (select id from products where status = 'published'));

create policy "public_read_published_product_photos" on product_photos
  for select
  to anon
  using (product_id in (select id from products where status = 'published'));
```

**Padrão de nova coluna nullable (D-10/D-11, ver RESEARCH Pitfall 5):**
```sql
alter table products add column hide_when_sold_out boolean; -- nullable, sem default
alter table stores add column hide_sold_out_default boolean not null default false;
```

**Restrição explícita (Pitfall 2):** esta migration NÃO deve tocar `store_settings` — nenhuma policy `to anon` nessa tabela nesta fase.

---

## Padrões Compartilhados

### Owner-scoped store lookup → variante pública "resolver por slug"
**Fonte:** `src/lib/settings/actions.ts` (`getOwnedStore`, linhas 63-84)
**Aplicar a:** `public-list.ts`/`page.tsx` — mesma disciplina de "resolver a loja primeiro, depois consultar dados dependentes", mas trocando `owner_id = auth.uid()` (sessão) por `slug = params.slug` (rota pública, sem sessão):
```typescript
// Variante pública — sem getUser(), sem auth.uid():
const { data: store, error } = await supabase
  .from("stores")
  .select("id, name, logo_url, accent_color, tagline, hide_sold_out_default")
  .eq("slug", slug)
  .single();
if (error || !store) return notFound(); // ou renderizar estado "loja não encontrada"
```
**Aplicar a:** todo componente que precisa do `storeId` resolvido antes de chamar `queryPublicProducts`.

### Regra "hide_when_sold_out" resolvida na query (D-09/D-10/D-11)
**Fonte:** RESEARCH.md Pattern 4 (pseudocódigo, sem precedente direto no codebase — é lógica nova desta fase)
**Aplicar a:** exclusivamente `src/lib/products/public-list.ts` — nunca replicar essa lógica em `product-card.tsx`/`product-grid.tsx`:
```typescript
// efetivo_hide = produto.hide_when_sold_out ?? loja.hide_sold_out_default
// produto aparece se: disponivel === true OU efetivo_hide === false
const effectiveHide = product.hide_when_sold_out ?? store.hide_sold_out_default;
const visible = product.disponivel || !effectiveHide;
```

### Fallback de imagem quebrada (ImageOff + tokens de cor)
**Fonte:** `src/app/(admin)/produtos/product-list.tsx` linhas 94-108 (padrão original, sem `onError` porque ali é "sem foto", não "erro de carregamento")
**Aplicar a:** `image-with-fallback.tsx` (novo) — reusa exatamente os tokens `bg-[#F5F5F3]`/`text-[#6B6B6B]`/ícone `ImageOff`, mas adiciona `onError` (necessário porque aqui a URL existe mas pode falhar no CDN, cenário que o admin não trata hoje).

### Debounce de busca por texto
**Fonte:** `src/lib/hooks/use-debounce.ts` (`useDebouncedValue`)
**Aplicar a:** `product-filters.tsx` — import direto, mesmo padrão de uso de `product-toolbar.tsx` (linhas 40-53), sem modificação no hook.

### Server Action com resultado `{ error: string } | { success: true }`
**Fonte:** `src/lib/settings/actions.ts` (`SettingsActionResult`) e `src/lib/products/actions.ts` (`ProductActionResult`, inferido do uso em `product-form.tsx`)
**Aplicar a:** `fetchNextPage` (nova Server Action de "carregar mais") deve seguir o mesmo formato de retorno discriminado por `"error" in result`, nunca lançar/`throw` para o Client Component tratar.

## Sem Analog Direto

| Arquivo | Papel | Fluxo de Dados | Razão |
|---|---|---|---|
| `src/app/loja/[slug]/pagination-numbered.tsx` | component (Server) | request-response | Nenhuma paginação numerada existe hoje no codebase — usar padrão genérico `<Link>` do Next.js documentado no RESEARCH.md Pattern 6 |
| `src/app/loja/[slug]/store-hero.tsx` | component (Server) | transform | Nenhum "hero" de loja existe hoje (painel admin não tem equivalente visual) — compor a partir dos campos já lidos em `settings-form.tsx` (`logo_url`/`accent_color`/`tagline`), mas como Server Component de exibição, não formulário |
| Regra `hide_when_sold_out ?? hide_sold_out_default` | lógica de negócio | transform | Lógica nova desta fase, sem precedente — só pseudocódigo do RESEARCH.md como guia |

## Metadados

**Escopo de busca de analogs:** `src/app/(admin)/produtos/`, `src/app/(admin)/configuracoes/`, `src/lib/products/`, `src/lib/settings/`, `src/lib/hooks/`, `supabase/migrations/`, `src/app/loja/[slug]/`
**Arquivos lidos integralmente:** `list.ts`, `page.tsx` (placeholder), `product-toolbar.tsx`, `product-list.tsx`, `use-debounce.ts`, `0003_products_schema_rls.sql`, `product-form.tsx`, `settings-form.tsx`, `settings/actions.ts`, `constants.ts`; trechos de `products/actions.ts` via grep
**Data de extração:** 2026-07-13
