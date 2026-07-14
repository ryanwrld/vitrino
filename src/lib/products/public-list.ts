import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { BRANDS, SOLES, FULFILLMENTS } from "@/lib/products/constants";

/**
 * Leitura pública paginada de produtos publicados (VITR-01/VITR-04,
 * 04-RESEARCH.md Pattern 3) — variante pública/anônima de
 * `src/lib/products/list.ts` (`queryProducts`, painel admin). NUNCA importar
 * ou modificar `list.ts` — são funções paralelas, uma owner-scoped (sessão),
 * outra pública (sem sessão, role `anon` no Postgres).
 *
 * `status` é SEMPRE fixo 'published' no código — nunca aceito via `params`,
 * para nunca expor esse controle ao cliente final (04-RESEARCH.md Pattern 3).
 *
 * `page` é 1-based em toda a stack (04-RESEARCH.md Pitfall 7). Paginação usa
 * a técnica "buscar PUBLIC_PAGE_SIZE + 1, mostrar PUBLIC_PAGE_SIZE" (Open
 * Question 3) em vez de `count: "exact"` — mais barato, evita uma segunda
 * query.
 *
 * Filtros de categoria (brand/sole/fulfillment, D-01/D-02) são multi-select
 * — `.in("campo", array)`, nunca `.eq()` (diferença deliberada em relação ao
 * queryProducts do admin, que é single-select). Busca por nome (D-03) é
 * `ilike` parcial case-insensitive. Cada array é validado contra as listas
 * fixas de `constants.ts` ANTES de qualquer `.in()` — um valor fora da lista
 * é silenciosamente ignorado, nunca propagado como erro nem interpolado cru
 * (Security Domain V5, 04-RESEARCH.md).
 */
export type QueryPublicProductsParams = {
  page?: number;
  q?: string;
  brand?: string[];
  sole?: string[];
  fulfillment?: string[];
};

const VALID_BRANDS = new Set<string>(BRANDS);
const VALID_SOLES = new Set<string>(SOLES);
const VALID_FULFILLMENTS = new Set<string>(FULFILLMENTS.map((item) => item.value));

export type PublicProduct = {
  id: string;
  name: string;
  brand: string;
  brand_other: string | null;
  line: string | null;
  price: number;
  /** Disponibilidade derivada (mesmo cálculo de queryProducts do admin):
   * EXISTS sobre product_sizes.available=true. */
  disponivel: boolean;
  /** storage_path da foto de posição mais baixa (capa), ou null sem foto. */
  coverPath: string | null;
};

export type QueryPublicProductsResult = {
  products: PublicProduct[];
  hasMore: boolean;
};

export const PUBLIC_PAGE_SIZE = 20;

export async function queryPublicProducts(
  supabase: SupabaseClient<Database>,
  storeId: string,
  params: QueryPublicProductsParams
): Promise<QueryPublicProductsResult> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * PUBLIC_PAGE_SIZE;
  const to = from + PUBLIC_PAGE_SIZE; // fetch PUBLIC_PAGE_SIZE + 1 rows (Open Question 3)

  let query = supabase
    .from("products")
    .select("id, name, brand, brand_other, line, price")
    .eq("store_id", storeId)
    .eq("status", "published"); // fixo — nunca vindo de params/searchParams

  const validBrands = (params.brand ?? []).filter((value) => VALID_BRANDS.has(value));
  if (validBrands.length > 0) {
    query = query.in("brand", validBrands);
  }

  const validSoles = (params.sole ?? []).filter((value) => VALID_SOLES.has(value));
  if (validSoles.length > 0) {
    query = query.in("sole", validSoles);
  }

  const validFulfillments = (params.fulfillment ?? []).filter((value) => VALID_FULFILLMENTS.has(value));
  if (validFulfillments.length > 0) {
    query = query.in("fulfillment", validFulfillments);
  }

  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: fetchedProducts, error } = await query;
  if (error || !fetchedProducts || fetchedProducts.length === 0) {
    return { products: [], hasMore: false };
  }

  const hasMore = fetchedProducts.length > PUBLIC_PAGE_SIZE;
  const products = hasMore ? fetchedProducts.slice(0, PUBLIC_PAGE_SIZE) : fetchedProducts;

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

  const availableProductIds = new Set(
    (sizeRows ?? []).filter((row) => row.available).map((row) => row.product_id)
  );

  // photoRows já vem ordenado por position asc — a primeira ocorrência por
  // product_id encontrada no loop é sempre a de menor position (capa).
  const coverPathByProductId = new Map<string, string>();
  for (const photo of photoRows ?? []) {
    if (!coverPathByProductId.has(photo.product_id)) {
      coverPathByProductId.set(photo.product_id, photo.storage_path);
    }
  }

  return {
    products: products.map((product) => ({
      ...product,
      disponivel: availableProductIds.has(product.id),
      coverPath: coverPathByProductId.get(product.id) ?? null,
    })),
    hasMore,
  };
}
