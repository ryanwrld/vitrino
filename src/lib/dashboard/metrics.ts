import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Agregações de métricas do dashboard (MTR-01, 06-03-PLAN.md Task 2,
 * 06-PATTERNS.md §metrics.ts). Funções PURAS que recebem o `supabase` já
 * autenticado do chamador (mesma disciplina de `queryProducts` em
 * src/lib/products/list.ts — nunca criam client próprio), para serem
 * testáveis diretamente fora do Server Component
 * (`tests/dashboard/metrics-aggregation.test.ts`).
 *
 * `storeId` é sempre passado explicitamente e aplicado via `.eq(...)`
 * (mesma defesa em profundidade de T-03-13/T-06-08) — a RLS
 * (`owner_read_pageviews`/views `security_invoker=true` da migration 0006)
 * é a rede final: um `storeId` de outra loja nunca retorna dado, mesmo que
 * o storeId em si seja um valor válido de outra loja.
 *
 * `total`/`disponível`/`esgotado`/`recentes` NÃO são recalculados aqui —
 * esses vêm de `queryProducts` chamado diretamente no page.tsx
 * (06-RESEARCH.md "Don't Hand-Roll", zero SQL nova para isso).
 */

export type TopViewedProduct = {
  productId: string;
  name: string;
  secondary: string;
  views: number;
};

export type TopOrderClickProduct = {
  productId: string;
  name: string;
  secondary: string;
  clicks: number;
};

/**
 * Conta só os acessos ao grid principal da vitrine (`product_id is null`,
 * D-01) — visualização de um produto específico NUNCA soma nesse contador
 * geral (essa é a responsabilidade de `queryTopViewedProducts`).
 */
export async function queryAccessCount(supabase: SupabaseClient<Database>, storeId: string): Promise<number> {
  const { count } = await supabase
    .from("pageviews")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .is("product_id", null);

  return count ?? 0;
}

/**
 * Deriva a linha secundária de marca/linha exibida abaixo do nome do
 * produto — mesmo espírito do `secondaryLine` de `product-list.tsx`
 * (brand_other quando `brand === "Outra"`, senão brand; + line quando
 * houver).
 */
function buildSecondaryLine(product: { brand: string; brand_other: string | null; line: string | null }): string {
  const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
  return [brandLabel, product.line].filter(Boolean).join(" · ");
}

/**
 * Top-10 de produtos mais visualizados (D-08), consultando a view
 * `product_pageview_counts` (migration 0006) e resolvendo o nome via join
 * em memória com `products` — a view NUNCA embute o nome (06-PATTERNS.md).
 * `limit(10)` é uma constante fixa no código (D-10/V5) — nunca aceita via
 * input do usuário, para prevenir enumeração/DoS por limite arbitrário
 * (T-06-09).
 */
export async function queryTopViewedProducts(
  supabase: SupabaseClient<Database>,
  storeId: string
): Promise<TopViewedProduct[]> {
  const { data: topViews } = await supabase
    .from("product_pageview_counts")
    .select("product_id, views")
    .eq("store_id", storeId)
    .order("views", { ascending: false })
    .limit(10);

  const rankedRows = (topViews ?? []).filter(
    (row): row is { product_id: string; views: number } => row.product_id !== null && row.views !== null
  );
  if (rankedRows.length === 0) {
    return [];
  }

  const productIds = rankedRows.map((row) => row.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, brand, brand_other, line")
    .in("id", productIds);

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  return rankedRows.flatMap((row) => {
    const product = productById.get(row.product_id);
    if (!product) return [];
    return [
      {
        productId: row.product_id,
        name: product.name,
        secondary: buildSecondaryLine(product),
        views: row.views,
      },
    ];
  });
}

/**
 * Top-10 de produtos com mais cliques no botão "Pedir agora" (D-09),
 * consultando a view `product_order_click_counts` (migration 0006) —
 * mesmo padrão de `queryTopViewedProducts`, mas NUNCA fundida com ela: são
 * duas listas paralelas e independentes (D-08/D-09).
 */
export async function queryTopOrderClickProducts(
  supabase: SupabaseClient<Database>,
  storeId: string
): Promise<TopOrderClickProduct[]> {
  const { data: topClicks } = await supabase
    .from("product_order_click_counts")
    .select("product_id, clicks")
    .eq("store_id", storeId)
    .order("clicks", { ascending: false })
    .limit(10);

  const rankedRows = (topClicks ?? []).filter(
    (row): row is { product_id: string; clicks: number } => row.product_id !== null && row.clicks !== null
  );
  if (rankedRows.length === 0) {
    return [];
  }

  const productIds = rankedRows.map((row) => row.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, brand, brand_other, line")
    .in("id", productIds);

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  return rankedRows.flatMap((row) => {
    const product = productById.get(row.product_id);
    if (!product) return [];
    return [
      {
        productId: row.product_id,
        name: product.name,
        secondary: buildSecondaryLine(product),
        clicks: row.clicks,
      },
    ];
  });
}
