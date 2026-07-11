import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAuthenticatedAccount, type SeededAccount } from "../setup/supabase-test";

/**
 * Teste de isolamento RLS obrigatório (D-05/CONTEXT.md, Padrão 4 e Armadilha 4
 * do 01-RESEARCH.md): seed de duas contas reais (Loja A, Loja B) via
 * signUp + signInWithPassword (nunca role administrativa/SQL Editor), provando que
 * a policy `owner_id = auth.uid()` de `stores`/`store_settings` isola
 * completamente os tenants em leitura e escrita.
 */
describe("Isolamento RLS entre tenants (stores/store_settings)", () => {
  let lojaA: SeededAccount;
  let lojaB: SeededAccount;
  let storeAId: string;
  let storeBId: string;

  beforeAll(async () => {
    lojaA = await seedAuthenticatedAccount("loja-a");
    lojaB = await seedAuthenticatedAccount("loja-b");

    const { data: storeA, error: storeAError } = await lojaA.client
      .from("stores")
      .insert({
        owner_id: lojaA.userId,
        name: "Loja A - Chuteiras Import",
        slug: `loja-a-teste-${Date.now()}`,
      })
      .select()
      .single();
    if (storeAError || !storeA) {
      throw new Error(`Falha ao seedar stores da Loja A: ${storeAError?.message}`);
    }
    storeAId = storeA.id;

    const { error: settingsAError } = await lojaA.client.from("store_settings").insert({
      store_id: storeAId,
      whatsapp_e164: "5511999990001",
      message_template: "Olá! Vi sua vitrine e tenho interesse.",
    });
    if (settingsAError) {
      throw new Error(`Falha ao seedar store_settings da Loja A: ${settingsAError.message}`);
    }

    const { data: storeB, error: storeBError } = await lojaB.client
      .from("stores")
      .insert({
        owner_id: lojaB.userId,
        name: "Loja B - Chuteiras Import",
        slug: `loja-b-teste-${Date.now()}`,
      })
      .select()
      .single();
    if (storeBError || !storeB) {
      throw new Error(`Falha ao seedar stores da Loja B: ${storeBError?.message}`);
    }
    storeBId = storeB.id;

    const { error: settingsBError } = await lojaB.client.from("store_settings").insert({
      store_id: storeBId,
      whatsapp_e164: "5511999990002",
      message_template: "Olá! Vi sua vitrine e tenho interesse.",
    });
    if (settingsBError) {
      throw new Error(`Falha ao seedar store_settings da Loja B: ${settingsBError.message}`);
    }
  }, 30000);

  afterAll(async () => {
    // Limpeza best-effort: cada client só consegue apagar sua própria linha
    // (a policy RLS garante isso), então não há risco de um client apagar
    // dados do outro tenant durante o teardown.
    await lojaA?.client.from("stores").delete().eq("id", storeAId);
    await lojaB?.client.from("stores").delete().eq("id", storeBId);
  });

  it("Loja A lê apenas suas próprias linhas de stores", async () => {
    const { data, error } = await lojaA.client.from("stores").select("*");

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.every((row) => row.owner_id === lojaA.userId)).toBe(true);
    expect(data!.some((row) => row.id === storeAId)).toBe(true);
  });

  it("Loja A NÃO consegue ler nenhuma linha de stores da Loja B (retorna array vazio)", async () => {
    const { data, error } = await lojaA.client.from("stores").select("*").eq("id", storeBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Loja A NÃO consegue ler a linha de store_settings da Loja B (retorna array vazio)", async () => {
    const { data, error } = await lojaA.client.from("store_settings").select("*").eq("store_id", storeBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("tentativa de UPDATE da Loja A numa linha de stores da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client
      .from("stores")
      .update({ name: "Nome adulterado pela Loja A" })
      .eq("id", storeBId)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Confirma, com o client da própria Loja B, que o nome original permanece intacto.
    const { data: verify } = await lojaB.client.from("stores").select("name").eq("id", storeBId).single();
    expect(verify?.name).toBe("Loja B - Chuteiras Import");
  });

  it("tentativa de DELETE da Loja A numa linha de store_settings da Loja B afeta 0 linhas", async () => {
    const { data, error } = await lojaA.client
      .from("store_settings")
      .delete()
      .eq("store_id", storeBId)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verify } = await lojaB.client
      .from("store_settings")
      .select("store_id")
      .eq("store_id", storeBId)
      .single();
    expect(verify?.store_id).toBe(storeBId);
  });
});
