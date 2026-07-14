import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAnonClient, seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";

/**
 * Prova o comportamento da policy `public_read_store_settings_for_published_stores`
 * (migration 0005, T-05-02): cliente anônimo lê `whatsapp_e164`/`message_template`
 * SOMENTE para uma loja com ao menos um produto publicado — mais restrita que a
 * policy blanket `using(true)` de `stores` (0004), porque o WhatsApp é mais
 * sensível que nome/logo.
 *
 * Extensão funcional de tests/storefront/public-access-rls.test.ts: aquele
 * arquivo prova apenas a NEGATIVA (nenhuma policy pública em store_settings,
 * antes da 0005). Este arquivo prova a POSITIVA escopada, agora que a
 * policy existe.
 *
 * Seed via client autenticado do dono (seedAuthenticatedAccount), nunca
 * service_role — mesma disciplina de public-access-rls.test.ts.
 */
describe("Leitura pública de store_settings (migration 0005 — escopada a loja com produto publicado)", () => {
  let ownerComPublicado: SeededAccount;
  let ownerSemPublicado: SeededAccount;
  let storeComPublicadoId: string;
  let storeSemPublicadoId: string;

  beforeAll(async () => {
    ownerComPublicado = await seedAuthenticatedAccount("settings-com-publicado");
    ownerSemPublicado = await seedAuthenticatedAccount("settings-sem-publicado");

    const { data: storeComPublicado, error: storeComPublicadoError } = await ownerComPublicado.client
      .from("stores")
      .insert({ owner_id: ownerComPublicado.userId, name: "Loja Com Produto Publicado", slug: `loja-com-publicado-teste-${Date.now()}` })
      .select()
      .single();
    if (storeComPublicadoError || !storeComPublicado) {
      throw new Error(`Falha ao seedar stores (com publicado): ${storeComPublicadoError?.message}`);
    }
    storeComPublicadoId = storeComPublicado.id;

    const { error: settingsComPublicadoError } = await ownerComPublicado.client.from("store_settings").insert({
      store_id: storeComPublicadoId,
      whatsapp_e164: "5511999990000",
      message_template: "Olá! Vi sua vitrine e tenho interesse no seguinte produto: {modelo}",
      onboarding_completed_at: new Date().toISOString(),
    });
    if (settingsComPublicadoError) {
      throw new Error(`Falha ao seedar store_settings (com publicado): ${settingsComPublicadoError.message}`);
    }

    const { error: publishedProductError } = await ownerComPublicado.client
      .from("products")
      .insert({ store_id: storeComPublicadoId, name: "Mercurial Publicado", brand: "Nike", price: 599.9, status: "published" });
    if (publishedProductError) {
      throw new Error(`Falha ao seedar produto published: ${publishedProductError.message}`);
    }

    const { data: storeSemPublicado, error: storeSemPublicadoError } = await ownerSemPublicado.client
      .from("stores")
      .insert({ owner_id: ownerSemPublicado.userId, name: "Loja Sem Produto Publicado", slug: `loja-sem-publicado-teste-${Date.now()}` })
      .select()
      .single();
    if (storeSemPublicadoError || !storeSemPublicado) {
      throw new Error(`Falha ao seedar stores (sem publicado): ${storeSemPublicadoError?.message}`);
    }
    storeSemPublicadoId = storeSemPublicado.id;

    const { error: settingsSemPublicadoError } = await ownerSemPublicado.client.from("store_settings").insert({
      store_id: storeSemPublicadoId,
      whatsapp_e164: "5511988880000",
      onboarding_completed_at: new Date().toISOString(),
    });
    if (settingsSemPublicadoError) {
      throw new Error(`Falha ao seedar store_settings (sem publicado): ${settingsSemPublicadoError.message}`);
    }

    const { error: draftProductError } = await ownerSemPublicado.client
      .from("products")
      .insert({ store_id: storeSemPublicadoId, name: "Predator Rascunho", brand: "Adidas", price: 499.9, status: "draft" });
    if (draftProductError) {
      throw new Error(`Falha ao seedar produto draft: ${draftProductError.message}`);
    }
  }, 30000);

  afterAll(async () => {
    await ownerComPublicado?.client.from("stores").delete().eq("id", storeComPublicadoId);
    await ownerSemPublicado?.client.from("stores").delete().eq("id", storeSemPublicadoId);
  });

  it("cliente anônimo lê whatsapp_e164/message_template de loja com produto publicado", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon
      .from("store_settings")
      .select("whatsapp_e164, message_template")
      .eq("store_id", storeComPublicadoId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].whatsapp_e164).toBe("5511999990000");
    expect(data![0].message_template).toBe("Olá! Vi sua vitrine e tenho interesse no seguinte produto: {modelo}");
  });

  it("cliente anônimo NÃO lê store_settings de loja sem nenhum produto publicado (retorna [])", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("store_settings").select("*").eq("store_id", storeSemPublicadoId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
