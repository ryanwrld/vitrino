import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryPublicProducts } from "@/lib/products/public-list";
import { StoreHero } from "./store-hero";
import { ProductGrid } from "./product-grid";

/**
 * Vitrine pública — Server Component sem NENHUMA checagem de auth. Esta
 * rota prova, por construção, que a vitrine pública (Fase 4) nunca é
 * bloqueada por login (restrição rígida do PROJECT.md/CLAUDE.md, SC-7) — o
 * matcher do middleware (`/admin/:path*`) já torna esta rota inalcançável
 * por ele, e nenhuma checagem de sessão é adicionada aqui.
 *
 * NUNCA adicionar a diretiva de cache do App Router nesta rota nem em
 * public-list.ts — o estoque precisa refletir o painel do revendedor com
 * delay de segundos (VITR-03, CLAUDE.md), e Cache Components do Next 16 é
 * opt-in por padrão (basta nunca optar por cache aqui).
 *
 * createClient() (mesmo helper server-side de sempre) funciona sem sessão
 * nesta rota — sem cookie de sessão presente, o Postgres resolve o papel
 * como `anon` automaticamente, consumindo as policies RLS públicas do
 * Plan 04-01.
 */
type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LojaPublicaPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, logo_url, accent_color, tagline")
    .eq("slug", slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  const { products } = await queryPublicProducts(supabase, store.id, { page: 1 });

  const productsWithCoverUrl = products.map((product) => ({
    ...product,
    coverUrl: product.coverPath
      ? supabase.storage.from("product-images").getPublicUrl(product.coverPath).data.publicUrl
      : null,
  }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 bg-white px-4 py-6">
      <StoreHero
        store={{
          name: store.name,
          logoUrl: store.logo_url,
          accentColor: store.accent_color,
          tagline: store.tagline,
        }}
      />

      {productsWithCoverUrl.length > 0 ? (
        <ProductGrid products={productsWithCoverUrl} />
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-[#F5F5F3] px-4 py-8 text-center">
          <span className="font-medium text-[#111111]">Esta loja ainda não tem produtos disponíveis.</span>
        </div>
      )}
    </main>
  );
}
