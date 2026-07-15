"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import clsx from "clsx";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { BRANDS, SOLES, FULFILLMENTS } from "@/lib/products/constants";

export type ProductFiltersParams = {
  q?: string;
  brand: string[];
  sole: string[];
  fulfillment: string[];
};

export type ProductFiltersProps = {
  slug: string;
  currentParams: ProductFiltersParams;
};

/**
 * Filtros da vitrine pública (VITR-02, D-01..D-04): chips sempre visíveis
 * (nunca dropdown/drawer), multi-select dentro da mesma categoria (D-02),
 * busca por texto (D-03), fixos no topo ao rolar (D-04, `sticky`).
 *
 * Adaptado de src/app/(admin)/produtos/product-toolbar.tsx — mesma
 * disciplina "URL como única fonte de verdade" (nunca estado próprio de
 * filtro persistido; cada mudança reconstrói a URL a partir de
 * `currentParams`, prop derivada do `searchParams` real de page.tsx) e o
 * mesmo debounce de busca (`useDebouncedValue`, 400ms). Diverge do toolbar
 * do admin em multi-select (arrays com `search.append`, nunca um único
 * `search.set`) e em SEMPRE remover `page` ao mudar qualquer filtro (D-06,
 * Pitfall 4 do 04-RESEARCH.md).
 */
export function ProductFilters({ slug, currentParams }: ProductFiltersProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentParams.q ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    const currentQ = currentParams.q ?? "";
    if (debouncedSearch === currentQ) return;
    navigate({ q: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function navigate(overrides: { q?: string; brand?: string[]; sole?: string[]; fulfillment?: string[] }) {
    const merged = { ...currentParams, ...overrides };
    const search = new URLSearchParams();
    if (merged.q) search.set("q", merged.q);
    (merged.brand ?? []).forEach((value) => search.append("brand", value));
    (merged.sole ?? []).forEach((value) => search.append("sole", value));
    (merged.fulfillment ?? []).forEach((value) => search.append("fulfillment", value));
    // D-06/Pitfall 4: toda mudança de filtro reseta a paginação — "page"
    // NUNCA é herdado de currentParams aqui, mesmo implicitamente.
    const queryString = search.toString();
    router.push(queryString ? `/loja/${slug}?${queryString}` : `/loja/${slug}`);
  }

  function toggleChip(category: "brand" | "sole" | "fulfillment", value: string) {
    const current = currentParams[category];
    const active = current.includes(value);
    const next = active ? current.filter((v) => v !== value) : [...current, value];
    navigate({ [category]: next });
  }

  function chipClassName(active: boolean): string {
    return clsx(
      "rounded-full border px-3 py-1.5 text-sm transition",
      active ? "border-[#0D21A1] bg-[#0D21A1] text-white" : "border-[#E7F2FD] bg-white text-[#111111]"
    );
  }

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 bg-white py-2">
      <div className="flex items-center gap-2 rounded-lg border border-[#E7F2FD] bg-white px-3 py-2 focus-within:border-[#0D21A1]">
        <Search className="h-4 w-4 shrink-0 text-[#6B6B6B]" aria-hidden="true" />
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nome…"
          aria-label="Buscar por nome"
          className="w-full min-h-11 text-base outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {BRANDS.map((brand) => (
          <button
            key={brand}
            type="button"
            aria-pressed={currentParams.brand.includes(brand)}
            onClick={() => toggleChip("brand", brand)}
            className={chipClassName(currentParams.brand.includes(brand))}
          >
            {brand}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SOLES.map((sole) => (
          <button
            key={sole}
            type="button"
            aria-pressed={currentParams.sole.includes(sole)}
            onClick={() => toggleChip("sole", sole)}
            className={chipClassName(currentParams.sole.includes(sole))}
          >
            {sole}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FULFILLMENTS.map((fulfillment) => (
          <button
            key={fulfillment.value}
            type="button"
            aria-pressed={currentParams.fulfillment.includes(fulfillment.value)}
            onClick={() => toggleChip("fulfillment", fulfillment.value)}
            className={chipClassName(currentParams.fulfillment.includes(fulfillment.value))}
          >
            {fulfillment.label}
          </button>
        ))}
      </div>
    </div>
  );
}
