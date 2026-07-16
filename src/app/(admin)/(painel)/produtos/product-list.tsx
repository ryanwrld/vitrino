"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageOff, Pencil, Trash2 } from "lucide-react";
import { formatBRLPrice } from "@/lib/currency/brl";
import { deleteProduct } from "@/lib/products/actions";

export type ProductListItem = {
  id: string;
  name: string;
  brand: string;
  brand_other: string | null;
  line: string | null;
  price: number;
  status: string;
  /** Disponibilidade derivada (queryProducts, Plan 03-06) — EXISTS sobre
   * product_sizes.available=true. Rollup no nível do produto: mostra
   * "Disponível"/"Esgotado" sem strikethrough (reservado para os pills de
   * tamanho individual, 03-UI-SPEC.md §Product list page). */
  disponivel: boolean;
  /** URL pública da foto de posição 0 (capa, D-11), ou null sem foto ainda. */
  coverUrl: string | null;
};

export type ProductListProps = {
  products: ProductListItem[];
};

/**
 * Listagem de produtos (03-UI-SPEC.md §Product list page). Base (Plan 03-02)
 * renderiza nome/marca/linha/preço/status.
 *
 * Plan 03-05 adicionou os botões editar (`Pencil`, link para
 * `/produtos/[id]/editar`) e excluir (`Trash2`, abre o diálogo nativo de
 * confirmação — mesmo padrão `<dialog>` do slug-editor.tsx, Fase 2). Um
 * único `<dialog>` compartilhado no fim da lista (controlado por
 * `deleteTarget`) evita duplicar um `<dialog>` por linha. `deleteProduct` só
 * é chamado a partir do onClick explícito de "Sim, excluir" — nunca do
 * cancelamento/close/escape do dialog (mesma disciplina do slug-editor).
 *
 * Esta fatia (Plan 03-06 Task 3) adiciona a thumbnail de capa (`coverUrl` via
 * `next/image`, com `ImageOff` como fallback quando o produto não tem foto
 * ainda) e o indicador de disponibilidade derivada (`disponivel`, rollup via
 * `queryProducts`) — "Disponível" (dot verde) ou "Esgotado" (dot cinza, sem
 * strikethrough neste nível de rollup — strikethrough é reservado para os
 * pills de tamanho individual no formulário). Os dois empty states (nenhum
 * produto vs. filtro sem resultado) são decididos e renderizados por
 * `page.tsx`, não por este componente.
 */
export function ProductList({ products }: ProductListProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function openDeleteDialog(product: ProductListItem) {
    setDeleteTarget(product);
    dialogRef.current?.showModal();
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const productId = deleteTarget.id;

    startDeleteTransition(async () => {
      const result = await deleteProduct(productId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Produto excluído.");
        router.refresh();
      }
      dialogRef.current?.close();
      setDeleteTarget(null);
    });
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {products.map((product) => {
          const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
          const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

          return (
            <li
              key={product.id}
              className="flex items-center gap-3 rounded-lg border border-surface bg-white p-3"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                {product.coverUrl ? (
                  <Image
                    src={product.coverUrl}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-6 w-6 text-muted" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium text-ink">{product.name}</span>
                {secondaryLine && <span className="truncate text-xs text-muted">{secondaryLine}</span>}
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

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-medium text-ink">{formatBRLPrice(product.price)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    product.status === "published"
                      ? "bg-brand/10 text-brand"
                      : "bg-surface text-muted"
                  }`}
                >
                  {product.status === "published" ? "Publicado" : "Rascunho"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/produtos/${product.id}/editar`}
                  aria-label={`Editar ${product.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
                >
                  <Pencil className="h-5 w-5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => openDeleteDialog(product)}
                  aria-label={`Excluir ${product.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-danger transition hover:bg-danger/10"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <dialog ref={dialogRef} className="rounded-xl p-6 backdrop:bg-black/40">
        <h2 className="text-xl font-medium text-ink">Excluir {deleteTarget?.name}?</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Isso vai remover o produto e todas as fotos da sua vitrine. Essa ação não pode ser desfeita.
        </p>
        <form method="dialog" className="mt-4 flex gap-3">
          <button
            type="submit"
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg border border-black px-4 py-2 font-medium text-black"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmDelete}
            className="rounded-lg bg-danger px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isDeleting ? "Excluindo…" : "Sim, excluir"}
          </button>
        </form>
      </dialog>
    </>
  );
}
