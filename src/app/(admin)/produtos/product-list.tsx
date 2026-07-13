import { ImageOff } from "lucide-react";
import { formatBRLPrice } from "@/lib/currency/brl";

export type ProductListItem = {
  id: string;
  name: string;
  brand: string;
  brand_other: string | null;
  line: string | null;
  price: number;
  status: string;
};

export type ProductListProps = {
  products: ProductListItem[];
};

/**
 * Listagem base de produtos (03-UI-SPEC.md §Product list page). Esta fatia
 * (Plan 03-02) renderiza só nome/marca/linha/preço/status — thumbnail de
 * capa (fotos chegam no Plan 03-04, por isso o placeholder `ImageOff`),
 * filtros/busca/ordenação (PROD-06) e ações editar/excluir (Plans
 * 03-05/03-06) NÃO entram aqui.
 */
export function ProductList({ products }: ProductListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => {
        const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
        const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

        return (
          <li
            key={product.id}
            className="flex items-center gap-3 rounded-lg border border-[#F5F5F3] bg-white p-3"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F3]">
              <ImageOff className="h-6 w-6 text-[#6B6B6B]" aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium text-[#111111]">{product.name}</span>
              {secondaryLine && <span className="truncate text-xs text-[#6B6B6B]">{secondaryLine}</span>}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-medium text-[#111111]">{formatBRLPrice(product.price)}</span>
              <span className="rounded-full bg-[#F5F5F3] px-2 py-0.5 text-xs text-[#6B6B6B]">
                {product.status === "published" ? "Publicado" : "Rascunho"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
