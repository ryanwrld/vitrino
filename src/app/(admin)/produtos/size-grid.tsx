"use client";

import { useTransition } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { SIZE_GRID } from "@/lib/products/constants";
import { markProductEsgotado } from "@/lib/products/actions";
import type { ProductInput } from "@/lib/validation/product";

/**
 * Composição condicional de className (clsx + tailwind-merge, instaladas
 * neste plano — 03-RESEARCH.md §Standard Stack). Primeiro componente do
 * projeto com estados visuais suficientes (não-incluído/esgotado/disponível)
 * para justificar isso em vez de concatenação manual de strings.
 */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type SizeGridProps = {
  control: Control<ProductInput>;
  /**
   * Presente apenas em modo edição (produto já salvo, Plan 03-05). Em modo
   * criação (undefined), "Marcar tudo como esgotado" só mexe no form state;
   * em edição, chama a Server Action `markProductEsgotado` antes de refletir
   * no form state, com toast.
   */
  productId?: string;
};

/**
 * Grade de tamanhos 36-45 (D-01/D-02/D-03/D-04) integrada ao
 * react-hook-form via `useFieldArray` (name "sizes"). Um tamanho
 * não-incluído simplesmente não existe no array `fields` — nunca é
 * representado como `{ size, available: false, included: false }` — ver
 * 03-RESEARCH.md §Grade de tamanhos e 03-UI-SPEC.md §Size grid.
 *
 * Ciclo de 3 estados por toque, sempre via métodos do próprio
 * `useFieldArray` (append/update/remove/replace) — nunca um array paralelo
 * (Pitfall 5 do 03-RESEARCH.md):
 *   não-incluído -> incluído/esgotado -> incluído/disponível -> não-incluído
 */
export function SizeGrid({ control, productId }: SizeGridProps) {
  const { fields, append, update, remove, replace } = useFieldArray({
    control,
    name: "sizes",
  });
  const [isPending, startTransition] = useTransition();

  function findIndexBySize(size: number): number {
    return fields.findIndex((field) => field.size === size);
  }

  function handleTogglePill(size: number) {
    const index = findIndexBySize(size);

    if (index === -1) {
      // não-incluído -> incluído/esgotado (D-03: tamanho novo SEMPRE nasce esgotado)
      append({ size, available: false });
      return;
    }

    const field = fields[index];
    if (!field.available) {
      // incluído/esgotado -> incluído/disponível
      update(index, { size, available: true });
      return;
    }

    // incluído/disponível -> não-incluído (remove do array)
    remove(index);
  }

  function handleMarkAllEsgotado() {
    const allEsgotado = fields.map((field) => ({ size: field.size, available: false }));

    if (productId) {
      startTransition(async () => {
        const result = await markProductEsgotado(productId);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        replace(allEsgotado);
        toast.success("Todos os tamanhos marcados como esgotado.");
      });
      return;
    }

    replace(allEsgotado);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-medium text-[#111111]">Tamanhos</h2>
      <p className="text-xs text-[#6B6B6B]">
        Toque em um tamanho para adicioná-lo. Toque de novo para marcar disponível.
      </p>

      <div className="grid grid-cols-5 gap-2">
        {SIZE_GRID.map((size) => {
          const index = findIndexBySize(size);
          const field = index === -1 ? undefined : fields[index];
          const included = field !== undefined;
          const available = field?.available ?? false;

          return (
            <button
              key={size}
              type="button"
              onClick={() => handleTogglePill(size)}
              aria-pressed={included}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-base transition",
                !included && "border-[#F5F5F3] text-[#6B6B6B]",
                included && !available && "border-[#F5F5F3] bg-[#F5F5F3] text-[#6B6B6B] line-through",
                included && available && "border-[#00C46A] bg-[#00C46A] text-white"
              )}
            >
              {size}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleMarkAllEsgotado}
        disabled={isPending}
        className="w-fit rounded-lg border border-[#6B6B6B] px-4 py-2 text-sm font-medium text-[#6B6B6B] transition disabled:opacity-60"
      >
        {isPending ? "Marcando…" : "Marcar tudo como esgotado"}
      </button>
    </div>
  );
}
