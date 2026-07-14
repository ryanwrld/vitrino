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
 */
export function ProductCard({ product }: { product: PublicProductCardData }) {
  const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
  const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F5F5F3]">
        <ImageWithFallback src={product.coverUrl} alt={product.name} />
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="truncate font-medium text-[#111111]">{product.name}</span>
        {secondaryLine && <span className="truncate text-xs text-[#6B6B6B]">{secondaryLine}</span>}
        <span className="text-sm font-medium text-[#111111]">{formatBRLPrice(product.price)}</span>
        <span
          className={`flex items-center gap-1 text-xs ${
            product.disponivel ? "text-[#00C46A]" : "text-[#6B6B6B]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${product.disponivel ? "bg-[#00C46A]" : "bg-[#6B6B6B]"}`}
            aria-hidden="true"
          />
          {product.disponivel ? "Disponível" : "Esgotado"}
        </span>
      </div>
    </div>
  );
}
