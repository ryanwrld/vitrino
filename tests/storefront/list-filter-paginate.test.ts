import { describe, it, expect } from "vitest";
import { seedAuthenticatedAccount } from "../setup/supabase-test";
import { queryPublicProducts, PUBLIC_PAGE_SIZE } from "@/lib/products/public-list";

/**
 * Cobre VITR-01/VITR-04 (04-02-PLAN.md Task 1): queryPublicProducts filtra
 * status='published' (nunca draft), isola por storeId (defesa em
 * profundidade, mesma disciplina de queryProducts/T-03-13), e pagina
 * corretamente (PUBLIC_PAGE_SIZE=20 por carga, técnica "buscar 21, mostrar
 * 20" para hasMore, page 1-based).
 *
 * Filtros multi-select/busca são adicionados no Plan 04-03 (mesmo arquivo,
 * novos casos) — este arquivo cobre só o Plan 04-02 nesta primeira versão.
 *
 * Seed direto via o client autenticado do dono (mesma disciplina de
 * tests/products/list-filter-sort.test.ts) — queryPublicProducts é uma
 * função pura que recebe (supabase, storeId, params) diretamente.
 */
describe("queryPublicProducts (leitura pública paginada de produtos publicados)", () => {
  it("filtra só status=published, deriva disponibilidade/capa, isola por loja", async () => {
    const lojaA = await seedAuthenticatedAccount("public-list-a");
    const lojaB = await seedAuthenticatedAccount("public-list-b");

    const { data: storeA, error: storeAError } = await lojaA.client
      .from("stores")
      .insert({ owner_id: lojaA.userId, name: "Loja A - Vitrine Pública", slug: `loja-a-public-list-${Date.now()}` })
      .select()
      .single();
    if (storeAError || !storeA) throw new Error(`Falha ao seedar store da Loja A: ${storeAError?.message}`);

    const { data: storeB, error: storeBError } = await lojaB.client
      .from("stores")
      .insert({ owner_id: lojaB.userId, name: "Loja B - Vitrine Pública", slug: `loja-b-public-list-${Date.now()}` })
      .select()
      .single();
    if (storeBError || !storeB) throw new Error(`Falha ao seedar store da Loja B: ${storeBError?.message}`);

    const { data: publishedProduct, error: publishedError } = await lojaA.client
      .from("products")
      .insert({ store_id: storeA.id, name: "Mercurial Publicado", brand: "Nike", price: 599.9, status: "published" })
      .select("id")
      .single();
    if (publishedError || !publishedProduct) throw new Error(`Falha ao seedar produto published: ${publishedError?.message}`);

    const { data: draftProduct, error: draftError } = await lojaA.client
      .from("products")
      .insert({ store_id: storeA.id, name: "Predator Rascunho", brand: "Adidas", price: 499.9, status: "draft" })
      .select("id")
      .single();
    if (draftError || !draftProduct) throw new Error(`Falha ao seedar produto draft: ${draftError?.message}`);

    const { error: sizeError } = await lojaA.client
      .from("product_sizes")
      .insert({ product_id: publishedProduct.id, size: 40, available: true });
    if (sizeError) throw new Error(`Falha ao seedar product_sizes: ${sizeError.message}`);

    const { error: photoError } = await lojaA.client
      .from("product_photos")
      .insert({ product_id: publishedProduct.id, storage_path: `${lojaA.userId}/${publishedProduct.id}/capa.jpg`, position: 0 });
    if (photoError) throw new Error(`Falha ao seedar product_photos: ${photoError.message}`);

    const { error: productBError } = await lojaB.client
      .from("products")
      .insert({ store_id: storeB.id, name: "Produto da Loja B", brand: "Nike", price: 100, status: "published" });
    if (productBError) throw new Error(`Falha ao seedar produto da Loja B: ${productBError.message}`);

    const result = await queryPublicProducts(lojaA.client, storeA.id, { page: 1 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Mercurial Publicado");
    expect(result.products[0].disponivel).toBe(true);
    expect(result.products[0].coverPath).toBe(`${lojaA.userId}/${publishedProduct.id}/capa.jpg`);
    expect(result.hasMore).toBe(false);

    // Isolamento cross-tenant: storeA nunca retorna produto da Loja B, mesmo
    // que ambos tenham status published.
    expect(result.products.some((p) => p.name.includes("Loja B"))).toBe(false);

    await lojaA.client.from("stores").delete().eq("id", storeA.id);
    await lojaB.client.from("stores").delete().eq("id", storeB.id);
  }, 30000);

  it("pagina corretamente: 21 produtos publicados -> page 1 retorna 20 (hasMore=true), page 2 retorna 1 (hasMore=false)", async () => {
    const loja = await seedAuthenticatedAccount("public-list-pagination");

    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Paginação Pública", slug: `loja-paginacao-publica-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

    const TOTAL_PRODUCTS = PUBLIC_PAGE_SIZE + 1; // 21
    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      const { error } = await loja.client.from("products").insert({
        store_id: store.id,
        name: `Produto Paginado ${i}`,
        brand: "Nike",
        price: 100 + i,
        status: "published",
        created_at: daysAgo(TOTAL_PRODUCTS - i), // ordem crescente de idade -> mais recente por último criado
      });
      if (error) throw new Error(`Falha ao seedar produto paginado ${i}: ${error.message}`);
    }

    const page1 = await queryPublicProducts(loja.client, store.id, { page: 1 });
    expect(page1.products).toHaveLength(PUBLIC_PAGE_SIZE);
    expect(page1.hasMore).toBe(true);

    const page2 = await queryPublicProducts(loja.client, store.id, { page: 2 });
    expect(page2.products).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    // Sem sobreposição/pulo entre páginas.
    const page1Ids = new Set(page1.products.map((p) => p.id));
    const page2Ids = new Set(page2.products.map((p) => p.id));
    const overlap = [...page1Ids].filter((id) => page2Ids.has(id));
    expect(overlap).toEqual([]);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);
});
