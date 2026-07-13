import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";

/**
 * Teste de isolamento RLS obrigatório (03-RESEARCH.md Pitfall 2, Padrão 4 do
 * 01-RESEARCH.md): seed de duas contas reais (Loja A, Loja B) via
 * signUp + signInWithPassword (nunca role administrativa/SQL Editor), provando
 * que as policies `owner_full_access_products`/`_product_sizes`/`_product_photos`
 * (subquery store_id -> stores.owner_id = auth.uid()) isolam completamente os
 * tenants em leitura e escrita nas três tabelas novas da Fase 3. Este teste
 * falharia (vermelho) se a RLS de qualquer uma das três tabelas estivesse
 * ausente — provando que o push da Task 2 realmente aplicou a RLS.
 */
describe("Isolamento RLS entre tenants (products/product_sizes/product_photos)", () => {
  let lojaA: SeededAccount;
  let lojaB: SeededAccount;
  let storeAId: string;
  let storeBId: string;
  let productAId: string;
  let productBId: string;

  beforeAll(async () => {
    lojaA = await seedAuthenticatedAccount("prod-loja-a");
    lojaB = await seedAuthenticatedAccount("prod-loja-b");

    const { data: storeA, error: storeAError } = await lojaA.client
      .from("stores")
      .insert({
        owner_id: lojaA.userId,
        name: "Loja A - Chuteiras Import",
        slug: `produtos-loja-a-teste-${Date.now()}`,
      })
      .select()
      .single();
    if (storeAError || !storeA) {
      throw new Error(`Falha ao seedar stores da Loja A: ${storeAError?.message}`);
    }
    storeAId = storeA.id;

    const { data: storeB, error: storeBError } = await lojaB.client
      .from("stores")
      .insert({
        owner_id: lojaB.userId,
        name: "Loja B - Chuteiras Import",
        slug: `produtos-loja-b-teste-${Date.now()}`,
      })
      .select()
      .single();
    if (storeBError || !storeB) {
      throw new Error(`Falha ao seedar stores da Loja B: ${storeBError?.message}`);
    }
    storeBId = storeB.id;

    const { data: productA, error: productAError } = await lojaA.client
      .from("products")
      .insert({
        store_id: storeAId,
        name: "Chuteira Mercurial A",
        brand: "Nike",
        price: 599.9,
      })
      .select()
      .single();
    if (productAError || !productA) {
      throw new Error(`Falha ao seedar products da Loja A: ${productAError?.message}`);
    }
    productAId = productA.id;

    const { data: productB, error: productBError } = await lojaB.client
      .from("products")
      .insert({
        store_id: storeBId,
        name: "Chuteira Predator B",
        brand: "Adidas",
        price: 549.9,
      })
      .select()
      .single();
    if (productBError || !productB) {
      throw new Error(`Falha ao seedar products da Loja B: ${productBError?.message}`);
    }
    productBId = productB.id;

    const { error: sizeAError } = await lojaA.client.from("product_sizes").insert({
      product_id: productAId,
      size: 40,
      available: true,
    });
    if (sizeAError) {
      throw new Error(`Falha ao seedar product_sizes da Loja A: ${sizeAError.message}`);
    }

    const { error: sizeBError } = await lojaB.client.from("product_sizes").insert({
      product_id: productBId,
      size: 40,
      available: true,
    });
    if (sizeBError) {
      throw new Error(`Falha ao seedar product_sizes da Loja B: ${sizeBError.message}`);
    }

    const { error: photoAError } = await lojaA.client.from("product_photos").insert({
      product_id: productAId,
      storage_path: `${lojaA.userId}/${productAId}/fake-a.jpg`,
      position: 0,
    });
    if (photoAError) {
      throw new Error(`Falha ao seedar product_photos da Loja A: ${photoAError.message}`);
    }

    const { error: photoBError } = await lojaB.client.from("product_photos").insert({
      product_id: productBId,
      storage_path: `${lojaB.userId}/${productBId}/fake-b.jpg`,
      position: 0,
    });
    if (photoBError) {
      throw new Error(`Falha ao seedar product_photos da Loja B: ${photoBError.message}`);
    }
  }, 30000);

  afterAll(async () => {
    // Limpeza best-effort: cada client só consegue apagar sua própria linha
    // (a policy RLS garante isso, e o cascade das FKs limpa sizes/photos),
    // então não há risco de um client apagar dados do outro tenant durante o
    // teardown.
    await lojaA?.client.from("stores").delete().eq("id", storeAId);
    await lojaB?.client.from("stores").delete().eq("id", storeBId);
  });

  it("Loja A lê apenas suas próprias linhas de products (lista da Loja B vazia)", async () => {
    const { data: ownData, error: ownError } = await lojaA.client.from("products").select("*").eq("id", productAId);
    expect(ownError).toBeNull();
    expect(ownData).not.toBeNull();
    expect(ownData!.every((row) => row.store_id === storeAId)).toBe(true);

    const { data: crossData, error: crossError } = await lojaA.client
      .from("products")
      .select("*")
      .eq("id", productBId);
    expect(crossError).toBeNull();
    expect(crossData).toEqual([]);
  });

  it("Loja A lê apenas suas próprias linhas de product_sizes (lista da Loja B vazia)", async () => {
    const { data: ownData, error: ownError } = await lojaA.client
      .from("product_sizes")
      .select("*")
      .eq("product_id", productAId);
    expect(ownError).toBeNull();
    expect(ownData).not.toBeNull();
    expect(ownData!.length).toBeGreaterThan(0);

    const { data: crossData, error: crossError } = await lojaA.client
      .from("product_sizes")
      .select("*")
      .eq("product_id", productBId);
    expect(crossError).toBeNull();
    expect(crossData).toEqual([]);
  });

  it("Loja A lê apenas suas próprias linhas de product_photos (lista da Loja B vazia)", async () => {
    const { data: ownData, error: ownError } = await lojaA.client
      .from("product_photos")
      .select("*")
      .eq("product_id", productAId);
    expect(ownError).toBeNull();
    expect(ownData).not.toBeNull();
    expect(ownData!.length).toBeGreaterThan(0);

    const { data: crossData, error: crossError } = await lojaA.client
      .from("product_photos")
      .select("*")
      .eq("product_id", productBId);
    expect(crossError).toBeNull();
    expect(crossData).toEqual([]);
  });

  it("tentativa de UPDATE da Loja A numa linha de products da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client
      .from("products")
      .update({ name: "Nome adulterado pela Loja A" })
      .eq("id", productBId)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verify } = await lojaB.client.from("products").select("name").eq("id", productBId).single();
    expect(verify?.name).toBe("Chuteira Predator B");
  });

  it("tentativa de UPDATE da Loja A numa linha de product_sizes da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client
      .from("product_sizes")
      .update({ available: false })
      .eq("product_id", productBId)
      .eq("size", 40)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verify } = await lojaB.client
      .from("product_sizes")
      .select("available")
      .eq("product_id", productBId)
      .eq("size", 40)
      .single();
    expect(verify?.available).toBe(true);
  });

  it("tentativa de DELETE da Loja A numa linha de product_photos da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client
      .from("product_photos")
      .delete()
      .eq("product_id", productBId)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verify } = await lojaB.client
      .from("product_photos")
      .select("product_id")
      .eq("product_id", productBId)
      .single();
    expect(verify?.product_id).toBe(productBId);
  });

  it("tentativa de DELETE da Loja A numa linha de products da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client.from("products").delete().eq("id", productBId).select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verify } = await lojaB.client.from("products").select("id").eq("id", productBId).single();
    expect(verify?.id).toBe(productBId);
  });
});
