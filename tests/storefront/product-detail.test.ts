import { describe, it, expect } from "vitest";
import { seedAuthenticatedAccount } from "../setup/supabase-test";
import { queryPublicProductDetail } from "@/lib/products/public-detail";

/**
 * Cobre PED-01/PED-02 (05-03-PLAN.md Task 1): `queryPublicProductDetail`
 * reusa `isVisible()` de `public-list.ts` (Pitfall 8 — sem bypass por link
 * direto), retornando o mapa completo de tamanhos e a galeria completa de
 * fotos para produto publicado+visível, e `null` para inexistente, rascunho
 * e oculto pela regra de esgotado. Mesmo shape de seed/assert de
 * `sold-out-visibility.test.ts`.
 */
describe("queryPublicProductDetail (PED-01/PED-02)", () => {
  it("produto publicado + visível retorna objeto com arrays completos de tamanhos e fotos", async () => {
    const loja = await seedAuthenticatedAccount("detail-visible");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Detalhe Visível", slug: `loja-detalhe-visivel-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({
        store_id: store.id,
        name: "Chuteira Detalhe Visível",
        brand: "Nike",
        line: "Mercurial",
        sole: "FG",
        price: 599.9,
        status: "published",
      })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const { error: sizesError } = await loja.client.from("product_sizes").insert([
      { product_id: product.id, size: 40, available: true },
      { product_id: product.id, size: 41, available: false },
    ]);
    if (sizesError) throw new Error(`Falha ao seedar product_sizes: ${sizesError.message}`);

    const { error: photosError } = await loja.client.from("product_photos").insert([
      { product_id: product.id, storage_path: `${store.id}/${product.id}/foto-1.jpg`, position: 0 },
      { product_id: product.id, storage_path: `${store.id}/${product.id}/foto-2.jpg`, position: 1 },
    ]);
    if (photosError) throw new Error(`Falha ao seedar product_photos: ${photosError.message}`);

    const result = await queryPublicProductDetail(loja.client, store.id, product.id, false);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(product.id);
    expect(result?.sizes).toEqual([
      { size: 40, available: true },
      { size: 41, available: false },
    ]);
    expect(result?.photos).toHaveLength(2);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("produto inexistente retorna null", async () => {
    const loja = await seedAuthenticatedAccount("detail-missing");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Detalhe Inexistente", slug: `loja-detalhe-inexistente-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const result = await queryPublicProductDetail(loja.client, store.id, "00000000-0000-0000-0000-000000000000", false);
    expect(result).toBeNull();

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("produto rascunho (status != published) retorna null", async () => {
    const loja = await seedAuthenticatedAccount("detail-draft");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Detalhe Rascunho", slug: `loja-detalhe-rascunho-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Chuteira Rascunho", brand: "Adidas", price: 399.9, status: "draft" })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const result = await queryPublicProductDetail(loja.client, store.id, product.id, false);
    expect(result).toBeNull();

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("produto publicado porém oculto pela regra de esgotado retorna null (Pitfall 8 — sem bypass)", async () => {
    const loja = await seedAuthenticatedAccount("detail-hidden");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Detalhe Oculto", slug: `loja-detalhe-oculto-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({
        store_id: store.id,
        name: "Chuteira Esgotada Oculta",
        brand: "Puma",
        price: 499.9,
        status: "published",
        hide_when_sold_out: true,
      })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const { error: sizeError } = await loja.client.from("product_sizes").insert({ product_id: product.id, size: 42, available: false });
    if (sizeError) throw new Error(`Falha ao seedar product_sizes: ${sizeError.message}`);

    const result = await queryPublicProductDetail(loja.client, store.id, product.id, false);
    expect(result).toBeNull();

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);
});
