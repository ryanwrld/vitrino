import Link from "next/link";
import { formatBRLPrice } from "@/lib/currency/brl";
import { ImageWithFallback } from "./image-with-fallback";

export type PublicProductCardData = {
  id: string;
  name: string;
  brand: string;
  brand_other: string | null;
  line: string | null;
  price: number;
  disponivel: boolean;
  coverUrl: string | null;
};

/**
 * Card de produto da vitrine pública (Server Component) — adaptado do card
 * de listagem do painel admin (Fase 3: foto/nome/marca/preço/
 * disponibilidade), mas SEM os botões de edição/exclusão (exclusivos do
 * painel do revendedor) e usando ImageWithFallback (onError) em vez do
 * fallback inline "sem foto"
 * do admin — aqui a URL pode existir mas falhar no CDN do Storage (VITR-05).
 *
 * Card envolvido num `<Link>` para `/loja/[slug]/[produto]` (D-01: página de
 * detalhe dedicada, não modal/accordion inline no grid) — `[produto]` é o
 * `id` (UUID) do produto (decisão A3 do 05-RESEARCH.md: URL compartilhável
 * satisfeita sem coluna slug nova). `slug` chega como prop separada, nunca
 * poluindo `PublicProductCardData` (que descreve só o dado do produto).
 */
export function ProductCard({ product, slug }: { product: PublicProductCardData; slug: string }) {
  const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
  const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

  return (
    <Link href={`/loja/${slug}/${product.id}`} className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface">
        <ImageWithFallback src={product.coverUrl} alt={product.name} />
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="truncate font-medium text-ink">{product.name}</span>
        {secondaryLine && <span className="truncate text-xs text-muted">{secondaryLine}</span>}
        <span className="text-sm font-medium text-ink">{formatBRLPrice(product.price)}</span>
        <span
          className={`flex items-center gap-1 text-xs ${
            product.disponivel ? "text-brand" : "text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${product.disponivel ? "bg-brand" : "bg-muted"}`}
            aria-hidden="true"
          />
          {product.disponivel ? "Disponível" : "Esgotado"}
        </span>
      </div>
    </Link>
  );
}
