import { describe, it, expect } from "vitest";
import { seedAuthenticatedAccount } from "../setup/supabase-test";
import { queryProducts } from "@/lib/products/list";

/**
 * Cobre PROD-06 (03-06-PLAN.md Task 1): busca por nome (ilike parcial,
 * case-insensitive), filtros status/marca/solado, ordenação
 * recente/nome/preço, disponibilidade derivada (EXISTS sobre
 * `product_sizes.available=true`, 03-RESEARCH.md Pattern 1) e isolamento
 * cross-tenant (T-03-13).
 *
 * Diferente de `create-product.test.ts`/`availability.test.ts` (que passam
 * por `saveProduct`/Server Actions), este teste semeia `products`/
 * `product_sizes` diretamente via o client autenticado (mesma disciplina de
 * `tests/rls/isolation.test.ts` — grava através das policies RLS reais,
 * nunca via bypass admin), porque `queryProducts` (Task 2) é uma função
 * pura server-side que recebe `(supabase, storeId, params)` diretamente,
 * sem depender do pipeline de FormData/Server Action.
 *
 * Este arquivo começa VERMELHO: `queryProducts`/`src/lib/products/list.ts`
 * ainda não existem até a Task 2.
 */
describe("queryProducts (busca/filtro/ordenação/disponibilidade derivada/isolamento)", () => {
  it("filtra por nome/status/marca/solado, ordena, deriva disponibilidade e isola por loja", async () => {
    const lojaA = await seedAuthenticatedAccount("list-a");
    const lojaB = await seedAuthenticatedAccount("list-b");

    const { data: storeA, error: storeAError } = await lojaA.client
      .from("stores")
      .insert({ owner_id: lojaA.userId, name: "Loja A - Chuteiras Import", slug: `loja-a-list-${Date.now()}` })
      .select()
      .single();
    if (storeAError || !storeA) throw new Error(`Falha ao seedar store da Loja A: ${storeAError?.message}`);

    const { data: storeB, error: storeBError } = await lojaB.client
      .from("stores")
      .insert({ owner_id: lojaB.userId, name: "Loja B - Chuteiras Import", slug: `loja-b-list-${Date.now()}` })
      .select()
      .single();
    if (storeBError || !storeB) throw new Error(`Falha ao seedar store da Loja B: ${storeBError?.message}`);

    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

    const productsA = [
      { name: "Mercurial Vapor", brand: "Nike", sole: "FG", price: 899.9, status: "published", created_at: daysAgo(3) },
      { name: "Mercurial Superfly", brand: "Nike", sole: "FG", price: 999.9, status: "draft", created_at: daysAgo(2) },
      { name: "Predator Elite", brand: "Adidas", sole: "AG", price: 799.9, status: "published", created_at: daysAgo(1) },
      { name: "Ultra Ultimate", brand: "Puma", sole: "FG", price: 1099.9, status: "published", created_at: daysAgo(0) },
    ];

    const productIdByName: Record<string, string> = {};
    for (const product of productsA) {
      const { data, error } = await lojaA.client
        .from("products")
        .insert({ store_id: storeA.id, ...product })
        .select("id")
        .single();
      if (error || !data) throw new Error(`Falha ao seedar produto ${product.name}: ${error?.message}`);
      productIdByName[product.name] = data.id;
    }

    // Disponibilidade derivada (EXISTS sobre product_sizes.available=true):
    // - Mercurial Vapor: 1 tamanho disponível -> disponível
    // - Mercurial Superfly: sem NENHUMA linha em product_sizes -> esgotado (D-10/D-03)
    // - Predator Elite: tem linha mas available=false -> esgotado
    // - Ultra Ultimate: 1 tamanho disponível -> disponível
    const { error: sizesError } = await lojaA.client.from("product_sizes").insert([
      { product_id: productIdByName["Mercurial Vapor"], size: 40, available: true },
      { product_id: productIdByName["Predator Elite"], size: 41, available: false },
      { product_id: productIdByName["Ultra Ultimate"], size: 42, available: true },
    ]);
    if (sizesError) throw new Error(`Falha ao seedar product_sizes: ${sizesError.message}`);

    const { error: productBError } = await lojaB.client
      .from("products")
      .insert({ store_id: storeB.id, name: "Mercurial Vapor Loja B", brand: "Nike", sole: "FG", price: 500, status: "published" })
      .select("id")
      .single();
    if (productBError) throw new Error(`Falha ao seedar produto da Loja B: ${productBError.message}`);

    // Busca por nome (ilike, case-insensitive, parcial)
    const searchResult = await queryProducts(lojaA.client, storeA.id, { q: "mercurial" });
    expect(searchResult.map((p) => p.name).sort()).toEqual(["Mercurial Superfly", "Mercurial Vapor"]);

    // Filtro por status
    const statusResult = await queryProducts(lojaA.client, storeA.id, { status: "published" });
    expect(statusResult.map((p) => p.name).sort()).toEqual(["Mercurial Vapor", "Predator Elite", "Ultra Ultimate"]);

    // Filtro por marca
    const brandResult = await queryProducts(lojaA.client, storeA.id, { brand: "Nike" });
    expect(brandResult.map((p) => p.name).sort()).toEqual(["Mercurial Superfly", "Mercurial Vapor"]);

    // Filtro por solado
    const soleResult = await queryProducts(lojaA.client, storeA.id, { sole: "FG" });
    expect(soleResult.map((p) => p.name).sort()).toEqual(["Mercurial Superfly", "Mercurial Vapor", "Ultra Ultimate"]);

    // Ordenação "recente" (default, created_at desc)
    const recentResult = await queryProducts(lojaA.client, storeA.id, {});
    expect(recentResult.map((p) => p.name)).toEqual([
      "Ultra Ultimate",
      "Predator Elite",
      "Mercurial Superfly",
      "Mercurial Vapor",
    ]);

    // Ordenação "nome" (asc)
    const nameResult = await queryProducts(lojaA.client, storeA.id, { sort: "nome" });
    expect(nameResult.map((p) => p.name)).toEqual([
      "Mercurial Superfly",
      "Mercurial Vapor",
      "Predator Elite",
      "Ultra Ultimate",
    ]);

    // Ordenação "preco" (asc)
    const priceResult = await queryProducts(lojaA.client, storeA.id, { sort: "preco" });
    expect(priceResult.map((p) => p.name)).toEqual([
      "Predator Elite",
      "Mercurial Vapor",
      "Mercurial Superfly",
      "Ultra Ultimate",
    ]);

    // Disponibilidade derivada por produto
    const disponibilidadeByName = Object.fromEntries(recentResult.map((p) => [p.name, p.disponivel]));
    expect(disponibilidadeByName["Mercurial Vapor"]).toBe(true);
    expect(disponibilidadeByName["Mercurial Superfly"]).toBe(false);
    expect(disponibilidadeByName["Predator Elite"]).toBe(false);
    expect(disponibilidadeByName["Ultra Ultimate"]).toBe(true);

    // Isolamento cross-tenant (T-03-13): produto da Loja B nunca aparece
    // mesmo passando storeA.id explicitamente.
    expect(recentResult.some((p) => p.name.includes("Loja B"))).toBe(false);
    const crossTenantAttempt = await queryProducts(lojaA.client, storeB.id, {});
    expect(crossTenantAttempt).toEqual([]);

    await lojaA.client.from("stores").delete().eq("id", storeA.id);
    await lojaB.client.from("stores").delete().eq("id", storeB.id);
  }, 30000);
});
