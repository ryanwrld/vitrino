import Link from "next/link";

export type PaginationNumberedProps = {
  slug: string;
  currentPage: number;
  hasMore: boolean;
  /** Query string atual (filtros/busca) já serializada, SEM a chave "page". */
  searchParamsString: string;
};

/**
 * Controle de paginação DESKTOP (D-05, variante secundária) — Server
 * Component sem estado nenhum. Cada clique é uma navegação de página inteira
 * que o Server Component recalcula do zero (sem cache, VITR-03). Sem analog
 * direto no codebase (nenhuma paginação numerada existia antes desta fase).
 *
 * Visível só no desktop via CSS (`hidden md:flex`, aplicado por page.tsx) —
 * nunca detecção de device em JS.
 */
export function PaginationNumbered({ slug, currentPage, hasMore, searchParamsString }: PaginationNumberedProps) {
  const prefix = searchParamsString ? `${searchParamsString}&` : "";

  return (
    <nav className="flex items-center gap-3" aria-label="Paginação">
      {currentPage > 1 && (
        <Link
          href={`/loja/${slug}?${prefix}page=${currentPage - 1}`}
          className="rounded-lg border border-black px-4 py-2 font-medium text-black transition hover:bg-black hover:text-white"
        >
          Anterior
        </Link>
      )}
      <span className="text-sm text-muted">Página {currentPage}</span>
      {hasMore && (
        <Link
          href={`/loja/${slug}?${prefix}page=${currentPage + 1}`}
          className="rounded-lg border border-black px-4 py-2 font-medium text-black transition hover:bg-black hover:text-white"
        >
          Próxima
        </Link>
      )}
    </nav>
  );
}
