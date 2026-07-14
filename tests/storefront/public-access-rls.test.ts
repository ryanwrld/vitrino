import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAnonClient, seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";

/**
 * Prova o achado crítico do 04-RESEARCH.md: antes da migration 0004, NENHUMA
 * linha de stores/products/product_sizes/product_photos era legível por um
 * client sem sessão (RLS bloqueando retorna [], nunca um erro — Pitfall 1).
 * Este teste usa um client ANÔNIMO real (createAnonClient, sem signIn/signUp)
 * para provar o escopo exato das 4 novas policies `to anon` (Plan 04-01
 * Task 1): stores sim, products published sim, products draft não,
 * product_sizes/product_photos do produto published sim / do draft não.
 *
 * store_settings: a asserção negativa original ("client anônimo NUNCA lê
 * store_settings", Pitfall 2 do 04-RESEARCH.md) ficou FALSA a partir da
 * migration 0005 (Fase 5) para uma loja com produto publicado — a policy
 * `public_read_store_settings_for_published_stores` passou a expor
 * whatsapp_e164/message_template nesse caso. O caso POSITIVO (loja com
 * produto publicado) é coberto abaixo; o caso NEGATIVO escopado (loja SEM
 * produto publicado) é coberto em
 * tests/storefront/store-settings-public-read.test.ts, para não deixar uma
 * asserção contraditória nesta suíte.
 *
 * Seed via o client autenticado do dono (seedAuthenticatedAccount), nunca
 * service_role — mesma disciplina de tests/rls/product-isolation.test.ts.
 */
describe("Acesso público anônimo (migration 0004 — RLS to anon restrita a published)", () => {
  let owner: SeededAccount;
  let storeId: string;
  let storeSlug: string;
  let publishedProductId: string;
  let draftProductId: string;

  beforeAll(async () => {
    owner = await seedAuthenticatedAccount("public-access");
    storeSlug = `loja-acesso-publico-teste-${Date.now()}`;

    const { data: store, error: storeError } = await owner.client
      .from("stores")
      .insert({ owner_id: owner.userId, name: "Loja Acesso Público Teste", slug: storeSlug })
      .select()
      .single();
    if (storeError || !store) {
      throw new Error(`Falha ao seedar stores: ${storeError?.message}`);
    }
    storeId = store.id;

    const { error: settingsError } = await owner.client
      .from("store_settings")
      .insert({ store_id: storeId, whatsapp_e164: "5511999990000", onboarding_completed_at: new Date().toISOString() });
    if (settingsError) {
      throw new Error(`Falha ao seedar store_settings: ${settingsError.message}`);
    }

    const { data: publishedProduct, error: publishedError } = await owner.client
      .from("products")
      .insert({ store_id: storeId, name: "Mercurial Publicado", brand: "Nike", price: 599.9, status: "published" })
      .select()
      .single();
    if (publishedError || !publishedProduct) {
      throw new Error(`Falha ao seedar produto published: ${publishedError?.message}`);
    }
    publishedProductId = publishedProduct.id;

    const { data: draftProduct, error: draftError } = await owner.client
      .from("products")
      .insert({ store_id: storeId, name: "Predator Rascunho", brand: "Adidas", price: 499.9, status: "draft" })
      .select()
      .single();
    if (draftError || !draftProduct) {
      throw new Error(`Falha ao seedar produto draft: ${draftError?.message}`);
    }
    draftProductId = draftProduct.id;

    const { error: publishedSizeError } = await owner.client
      .from("product_sizes")
      .insert({ product_id: publishedProductId, size: 40, available: true });
    if (publishedSizeError) throw new Error(`Falha ao seedar product_sizes (published): ${publishedSizeError.message}`);

    const { error: draftSizeError } = await owner.client
      .from("product_sizes")
      .insert({ product_id: draftProductId, size: 41, available: true });
    if (draftSizeError) throw new Error(`Falha ao seedar product_sizes (draft): ${draftSizeError.message}`);

    const { error: publishedPhotoError } = await owner.client
      .from("product_photos")
      .insert({ product_id: publishedProductId, storage_path: `${owner.userId}/${publishedProductId}/fake-published.jpg`, position: 0 });
    if (publishedPhotoError) throw new Error(`Falha ao seedar product_photos (published): ${publishedPhotoError.message}`);

    const { error: draftPhotoError } = await owner.client
      .from("product_photos")
      .insert({ product_id: draftProductId, storage_path: `${owner.userId}/${draftProductId}/fake-draft.jpg`, position: 0 });
    if (draftPhotoError) throw new Error(`Falha ao seedar product_photos (draft): ${draftPhotoError.message}`);
  }, 30000);

  afterAll(async () => {
    await owner?.client.from("stores").delete().eq("id", storeId);
  });

  it("client anônimo lê a linha de stores pelo slug (policy public_read_published_stores)", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("stores").select("id, name, slug").eq("slug", storeSlug);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(storeId);
  });

  it("client anônimo lê o produto published (policy public_read_published_products)", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("products").select("id, name, status").eq("id", publishedProductId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].status).toBe("published");
  });

  it("client anônimo NUNCA lê o produto draft (mesmo sabendo o id exato)", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("products").select("id").eq("id", draftProductId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("client anônimo lê product_sizes/product_photos do produto published", async () => {
    const anon = createAnonClient();
    const { data: sizes, error: sizesError } = await anon
      .from("product_sizes")
      .select("*")
      .eq("product_id", publishedProductId);
    expect(sizesError).toBeNull();
    expect(sizes).toHaveLength(1);

    const { data: photos, error: photosError } = await anon
      .from("product_photos")
      .select("*")
      .eq("product_id", publishedProductId);
    expect(photosError).toBeNull();
    expect(photos).toHaveLength(1);
  });

  it("client anônimo NUNCA lê product_sizes/product_photos do produto draft", async () => {
    const anon = createAnonClient();
    const { data: sizes, error: sizesError } = await anon
      .from("product_sizes")
      .select("*")
      .eq("product_id", draftProductId);
    expect(sizesError).toBeNull();
    expect(sizes).toEqual([]);

    const { data: photos, error: photosError } = await anon
      .from("product_photos")
      .select("*")
      .eq("product_id", draftProductId);
    expect(photosError).toBeNull();
    expect(photos).toEqual([]);
  });

  it("client anônimo lê store_settings de loja com produto publicado (migration 0005 — policy public_read_store_settings_for_published_stores)", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("store_settings").select("*").eq("store_id", storeId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].store_id).toBe(storeId);
  });
});
