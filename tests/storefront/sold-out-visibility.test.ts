import { describe, it, expect } from "vitest";
import { seedAuthenticatedAccount } from "../setup/supabase-test";
import { queryPublicProducts } from "@/lib/products/public-list";

/**
 * Cobre D-09/D-10/D-11 (04-06-PLAN.md Task 1): a regra de visibilidade de
 * esgotado — `effectiveHide = product.hide_when_sold_out ?? storeHideSoldOutDefault`;
 * produto aparece se `disponivel === true` OU `effectiveHide === false` —
 * resolvida inteiramente dentro de `queryPublicProducts`. Cobre a matriz
 * completa de 5 combinações descrita no plano, seedando `hide_when_sold_out`
 * diretamente (bypass da UI, igual aos demais testes desta fase).
 */
describe("Regra de visibilidade de esgotado (D-09/D-10/D-11)", () => {
  it("produto disponível sempre aparece, mesmo com hide_when_sold_out=true", async () => {
    const loja = await seedAuthenticatedAccount("visibility-available");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Visibilidade Disponível", slug: `loja-visibilidade-disp-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Disponível Com Hide True", brand: "Nike", price: 199.9, status: "published", hide_when_sold_out: true })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const { error: sizeError } = await loja.client.from("product_sizes").insert({ product_id: product.id, size: 40, available: true });
    if (sizeError) throw new Error(`Falha ao seedar product_sizes: ${sizeError.message}`);

    const result = await queryPublicProducts(loja.client, store.id, {}, false);
    expect(result.products.map((p) => p.id)).toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("esgotado + hide_when_sold_out=null + storeHideSoldOutDefault=false -> aparece (esmaecido)", async () => {
    const loja = await seedAuthenticatedAccount("visibility-null-false");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Visibilidade Null/False", slug: `loja-visibilidade-nf-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Esgotado Sem Exceção", brand: "Adidas", price: 299.9, status: "published" })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);
    // Sem product_sizes disponível -> esgotado (D-10); hide_when_sold_out fica null (default).

    const result = await queryPublicProducts(loja.client, store.id, {}, false);
    expect(result.products.map((p) => p.id)).toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("esgotado + hide_when_sold_out=null + storeHideSoldOutDefault=true -> não aparece", async () => {
    const loja = await seedAuthenticatedAccount("visibility-null-true");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Visibilidade Null/True", slug: `loja-visibilidade-nt-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Esgotado Herda Ocultar", brand: "Puma", price: 399.9, status: "published" })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const result = await queryPublicProducts(loja.client, store.id, {}, true);
    expect(result.products.map((p) => p.id)).not.toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("esgotado + hide_when_sold_out=true (override) + storeHideSoldOutDefault=false -> não aparece (override vence)", async () => {
    const loja = await seedAuthenticatedAccount("visibility-override-hide");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Override Ocultar", slug: `loja-override-ocultar-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Esgotado Override Ocultar", brand: "Mizuno", price: 499.9, status: "published", hide_when_sold_out: true })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const result = await queryPublicProducts(loja.client, store.id, {}, false);
    expect(result.products.map((p) => p.id)).not.toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("esgotado + hide_when_sold_out=false (override) + storeHideSoldOutDefault=true -> aparece (override vence)", async () => {
    const loja = await seedAuthenticatedAccount("visibility-override-show");
    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Override Mostrar", slug: `loja-override-mostrar-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const { data: product, error: productError } = await loja.client
      .from("products")
      .insert({ store_id: store.id, name: "Esgotado Override Mostrar", brand: "New Balance", price: 599.9, status: "published", hide_when_sold_out: false })
      .select("id")
      .single();
    if (productError || !product) throw new Error(`Falha ao seedar produto: ${productError?.message}`);

    const result = await queryPublicProducts(loja.client, store.id, {}, true);
    expect(result.products.map((p) => p.id)).toContain(product.id);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);
});
