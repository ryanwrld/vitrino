import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { createClient } from "@/lib/supabase/server";
import { queryProducts, type QueryProductsParams } from "@/lib/products/list";
import { ProductList } from "./product-list";

type ProdutosSearchParams = {
  q?: string;
  status?: string;
  brand?: string;
  sole?: string;
  sort?: string;
};

/**
 * Rota `/produtos` — listagem com busca/filtro/ordenação (PROD-06, Plan
 * 03-06, 03-RESEARCH.md Pattern 3). Totalmente dinâmica (NUNCA
 * `"use cache"` — mesma disciplina de `/configuracoes`/Plan 03-02) para que
 * produtos recém-salvos/editados/publicados apareçam imediatamente.
 *
 * `searchParams` (q/status/brand/sole/sort) são a única fonte de verdade dos
 * filtros — abrir a URL filtrada reproduz exatamente a mesma visualização
 * (must_have do plano). `queryProducts` (src/lib/products/list.ts) já
 * escopa por `store_id` do dono (T-03-13); esta rota só resolve a loja e
 * repassa os params já parseados.
 *
 * Dois empty states distintos (03-UI-SPEC.md §Copywriting): "nenhum produto
 * cadastrado ainda" quando a loja não tem NENHUM produto (independente de
 * filtro); "nenhum produto encontrado" quando existem produtos na loja mas
 * o filtro/busca atual não bateu com nenhum. A distinção exige uma segunda
 * contagem (`totalCount`, sem filtro nenhum) além do resultado filtrado.
 *
 * Esta fatia (Plan 03-06 Task 2) já lê/aplica os filtros via `searchParams`
 * (a URL é a fonte de verdade — reabrir a mesma URL reproduz a mesma
 * visualização mesmo sem nenhuma UI de filtro ainda). A toolbar de busca/
 * filtro/ordenação (`<ProductToolbar>`) é adicionada na Task 3, que também
 * estende esta rota para renderizá-la.
 */
export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<ProdutosSearchParams>;
}) {
  await requireCompletedOnboarding();

  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userData.user!.id)
    .single();

  if (!store) {
    redirect("/onboarding");
  }

  const queryParams: QueryProductsParams = {
    q: params.q,
    status: params.status,
    brand: params.brand,
    sole: params.sole,
    sort: params.sort,
  };

  const products = await queryProducts(supabase, store.id, queryParams);

  const { count: totalCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id);

  const hasAnyProduct = (totalCount ?? 0) > 0;
  const hasFilteredResults = products.length > 0;

  const productsWithCoverUrl = products.map((product) => ({
    ...product,
    coverUrl: product.coverPath
      ? supabase.storage.from("product-images").getPublicUrl(product.coverPath).data.publicUrl
      : null,
  }));

  return (
    <main className="bg-white mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#0D3D2B]">Produtos</h1>
        <Link
          href="/produtos/novo"
          className="w-full rounded-lg bg-[#00C46A] px-4 py-2 text-center font-medium text-white transition"
        >
          Novo produto
        </Link>
      </div>

      {hasAnyProduct && (
        <p className="text-xs text-[#6B6B6B]">
          {products.length} {products.length === 1 ? "produto" : "produtos"}
        </p>
      )}

      {hasFilteredResults ? (
        <ProductList products={productsWithCoverUrl} />
      ) : hasAnyProduct ? (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-[#F5F5F3] px-4 py-8 text-center">
          <span className="font-medium text-[#111111]">Nenhum produto encontrado</span>
          <span className="text-sm text-[#6B6B6B]">Tente ajustar os filtros ou buscar por outro termo.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-[#F5F5F3] px-4 py-8 text-center">
          <span className="font-medium text-[#111111]">Nenhum produto cadastrado ainda</span>
          <span className="text-sm text-[#6B6B6B]">
            Cadastre seu primeiro produto para começar a vender pelo WhatsApp.
          </span>
        </div>
      )}

      <Link
        href="/dashboard"
        className="rounded-lg border border-[#0D3D2B] px-4 py-2 text-center font-medium text-[#0D3D2B] transition hover:bg-[#0D3D2B] hover:text-white"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
