import { describe, it, expect, vi } from "vitest";
import { seedAuthenticatedAccount } from "../setup/supabase-test";
import { queryPublicProducts, PUBLIC_PAGE_SIZE } from "@/lib/products/public-list";
import { fetchNextPage } from "@/lib/products/public-actions";

/**
 * Cobre VITR-04 (04-04-PLAN.md Task 1): fetchNextPage (Server Action
 * pública) espelha exatamente queryPublicProducts para a mesma página —
 * nunca uma segunda implementação de paginação divergente (04-RESEARCH.md
 * Pitfall 3). fetchNextPage não exige sessão (é pública), mas createClient()
 * ainda chama cookies() de next/headers internamente — mock com jar vazio
 * evita o erro "cookies was called outside a request scope", mesmo padrão
 * de mock usado em outras Server Actions deste projeto.
 */
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

describe("fetchNextPage (Server Action pública — 'carregar mais')", () => {
  it("retorna a mesma página/hasMore que queryPublicProducts para a mesma loja/filtros", async () => {
    const loja = await seedAuthenticatedAccount("load-more-pagination");

    const { data: store, error: storeError } = await loja.client
      .from("stores")
      .insert({ owner_id: loja.userId, name: "Loja Carregar Mais", slug: `loja-carregar-mais-${Date.now()}` })
      .select()
      .single();
    if (storeError || !store) throw new Error(`Falha ao seedar store: ${storeError?.message}`);

    const TOTAL_PRODUCTS = PUBLIC_PAGE_SIZE + 1; // 21
    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      const { error } = await loja.client.from("products").insert({
        store_id: store.id,
        name: `Produto Carregar Mais ${i}`,
        brand: "Nike",
        price: 100 + i,
        status: "published",
        created_at: daysAgo(TOTAL_PRODUCTS - i),
      });
      if (error) throw new Error(`Falha ao seedar produto ${i}: ${error.message}`);
    }

    const directPage2 = await queryPublicProducts(loja.client, store.id, { page: 2 });
    const actionResult = await fetchNextPage(store.slug, {}, 2);

    expect("error" in actionResult).toBe(false);
    if ("error" in actionResult) throw new Error("fetchNextPage retornou erro inesperado");

    expect(actionResult.products.map((p) => p.id).sort()).toEqual(directPage2.products.map((p) => p.id).sort());
    expect(actionResult.hasMore).toBe(directPage2.hasMore);
    // Cada produto retornado por fetchNextPage já vem com coverUrl resolvido
    // (mesmo quando null, o campo existe — Client Component não pode resolver isso).
    expect(actionResult.products.every((p) => "coverUrl" in p)).toBe(true);

    await loja.client.from("stores").delete().eq("id", store.id);
  }, 30000);

  it("retorna { error } para um slug inexistente, sem lançar exceção", async () => {
    const result = await fetchNextPage("slug-inexistente-xyz-nao-existe", {}, 1);
    expect(result).toEqual({ error: expect.any(String) });
  });
});
