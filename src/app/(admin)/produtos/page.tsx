import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { createClient } from "@/lib/supabase/server";
import { ProductList } from "./product-list";

/**
 * Rota `/produtos` — listagem base (Server Component). Totalmente dinâmica
 * (NUNCA `"use cache"` — 03-RESEARCH.md, mesma disciplina de
 * `/configuracoes`) para que produtos recém-salvos apareçam imediatamente
 * após o redirect de `/produtos/novo`.
 *
 * Esta fatia (Plan 03-02) não implementa busca/filtro/ordenação (PROD-06,
 * Plan 03-06) — lista simples, ordenada por mais recente.
 */
export default async function ProdutosPage() {
  await requireCompletedOnboarding();

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

  const { data: products } = await supabase
    .from("products")
    .select("id, name, brand, brand_other, line, price, status")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  const hasProducts = Boolean(products && products.length > 0);

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

      {hasProducts ? (
        <ProductList products={products!} />
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
