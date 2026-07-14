import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryPublicProductDetail } from "@/lib/products/public-detail";
import { getProductImagePublicUrl } from "@/lib/storage/product-image-url";
import { DEFAULT_MESSAGE_TEMPLATE } from "@/lib/validation/onboarding";
import { ProductOrderPanel } from "./product-order-panel";

/**
 * Rota de detalhe do produto — Server Component totalmente dinâmico, SEM
 * NENHUMA checagem de auth (mesma disciplina de `/loja/[slug]/page.tsx`,
 * Fase 4, SC-7). NUNCA adicionar a diretiva de cache do App Router aqui —
 * o estoque precisa refletir o painel do revendedor com delay de segundos
 * (VITR-03/CLAUDE.md), e Cache Components do Next 16 é opt-in por padrão
 * (basta nunca optar por cache).
 *
 * `createClient()` funciona sem sessão nesta rota (papel `anon` no
 * Postgres, RLS pública). `queryPublicProductDetail` (05-03) já resolve o
 * guard de visibilidade completo (inexistente, rascunho OU oculto pela
 * regra de esgotado — Pitfall 8, sem bypass por link direto): um único
 * `notFound()` cobre os três casos.
 *
 * `store_settings` (whatsapp_e164/message_template) é lido via a nova
 * policy anon `public_read_store_settings_for_published_stores` (05-01) —
 * a segurança dessa exposição é inteiramente responsabilidade da RLS, não
 * deste código.
 */
type PageProps = {
  params: Promise<{ slug: string; produto: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug, produto } = await params;
  const supabase = await createClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, hide_sold_out_default")
    .eq("slug", slug)
    .single();

  if (storeError || !store) {
    notFound();
  }

  const detail = await queryPublicProductDetail(supabase, store.id, produto, store.hide_sold_out_default);

  if (!detail) {
    notFound();
  }

  const { data: storeSettings } = await supabase
    .from("store_settings")
    .select("whatsapp_e164, message_template")
    .eq("store_id", store.id)
    .single();

  const whatsappE164 = storeSettings?.whatsapp_e164 ?? "";
  const messageTemplate = storeSettings?.message_template ?? DEFAULT_MESSAGE_TEMPLATE;

  const galleryUrls = detail.photos
    .map((photo) => getProductImagePublicUrl(supabase, photo.storage_path))
    .filter((url): url is string => url !== null);
  const coverUrl = galleryUrls[0] ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 bg-white px-4 py-6">
      <ProductOrderPanel
        product={{
          name: detail.name,
          line: detail.line,
          sole: detail.sole,
          price: detail.price,
        }}
        sizes={detail.sizes}
        whatsappE164={whatsappE164}
        messageTemplate={messageTemplate}
        coverUrl={coverUrl}
        galleryUrls={galleryUrls}
        storeId={store.id}
        productId={detail.id}
        slug={slug}
      />
    </main>
  );
}
