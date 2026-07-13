"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { saveProduct } from "@/lib/products/actions";
import { BRANDS, SOLES, CATEGORIES, FULFILLMENTS, DEFAULT_SIZE_RANGE } from "@/lib/products/constants";
import { SizeGrid } from "./size-grid";

/**
 * Formulário de produto de tela única (D-08), espelhando
 * `configuracoes/settings-form.tsx` (useForm + zodResolver + useTransition +
 * toast; mesmos wrappers de campo label+input+erro, mesmas classes/tokens).
 *
 * Esta fatia (Plan 03-02) renderiza só as seções Identificação/Solado &
 * Categoria/Preço/Descrição — as seções Tamanhos e Fotos (03-UI-SPEC.md
 * §4/§5) chegam nos Plans 03-03/03-04, que devem estender este componente
 * em vez de recriá-lo.
 *
 * Aceita `defaultValues` opcional para reuso no Plan 03-05 (edição) — nesta
 * fatia só o modo criação é exercido (sem prop, formulário em branco).
 *
 * `productId` (opcional, Plan 03-05) diferencia modo edição de criação para
 * a seção Tamanhos: em criação, "Marcar tudo como esgotado" só mexe no form
 * state; em edição, chama a Server Action `markProductEsgotado` (ver
 * size-grid.tsx).
 */
export type ProductFormProps = {
  defaultValues?: Partial<ProductInput>;
  productId?: string;
};

export function ProductForm({ defaultValues, productId }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      brandOther: "",
      line: "",
      sole: "",
      category: "",
      fulfillment: undefined,
      price: "",
      description: "",
      ...defaultValues,
      // Pré-seleção 37-43 esgotada por padrão ao criar (D-02/D-03); 36/44/45
      // ficam fora até o revendedor adicioná-las manualmente (D-01). Fica
      // depois do spread para garantir o tipo não-opcional (sempre um
      // array), nunca `undefined`.
      sizes: defaultValues?.sizes ?? DEFAULT_SIZE_RANGE.map((size) => ({ size, available: false })),
    },
  });

  const brandValue = watch("brand");
  const isBrandOther = brandValue === "Outra";

  const onSubmit = (values: ProductInput) => {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("brand", values.brand);
    formData.set("brandOther", values.brandOther ?? "");
    formData.set("line", values.line ?? "");
    formData.set("sole", values.sole ?? "");
    formData.set("category", values.category ?? "");
    formData.set("fulfillment", values.fulfillment ?? "");
    formData.set("price", values.price);
    formData.set("description", values.description ?? "");
    formData.set("sizes", JSON.stringify(values.sizes ?? []));

    startTransition(async () => {
      const result = await saveProduct(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Produto salvo!");
      router.push("/produtos");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Identificação</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-[#111111]">
            Nome
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.name && <span className="text-sm text-[#FF4D4D]">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className="text-sm font-medium text-[#111111]">
            Marca
          </label>
          <select
            id="brand"
            {...register("brand")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          >
            <option value="">Selecione a marca</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          {errors.brand && <span className="text-sm text-[#FF4D4D]">{errors.brand.message}</span>}
        </div>

        {isBrandOther && (
          <div className="flex flex-col gap-1">
            <label htmlFor="brandOther" className="text-sm font-medium text-[#111111]">
              Qual marca?
            </label>
            <input
              id="brandOther"
              type="text"
              {...register("brandOther")}
              className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
            />
            {errors.brandOther && (
              <span className="text-sm text-[#FF4D4D]">{errors.brandOther.message}</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="line" className="text-sm font-medium text-[#111111]">
            Linha (opcional)
          </label>
          <input
            id="line"
            type="text"
            placeholder="Ex.: Mercurial"
            {...register("line")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          />
          {errors.line && <span className="text-sm text-[#FF4D4D]">{errors.line.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Solado &amp; Categoria</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="sole" className="text-sm font-medium text-[#111111]">
            Solado (opcional)
          </label>
          <select
            id="sole"
            {...register("sole")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          >
            <option value="">—</option>
            {SOLES.map((sole) => (
              <option key={sole} value={sole}>
                {sole}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-[#111111]">
            Categoria (opcional)
          </label>
          <select
            id="category"
            {...register("category")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          >
            <option value="">—</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="fulfillment" className="text-sm font-medium text-[#111111]">
            Modalidade (opcional)
          </label>
          <select
            id="fulfillment"
            {...register("fulfillment")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-base outline-none focus:border-[#00C46A]"
          >
            <option value="">—</option>
            {FULFILLMENTS.map((fulfillment) => (
              <option key={fulfillment.value} value={fulfillment.value}>
                {fulfillment.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Preço</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium text-[#111111]">
            Preço
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 focus-within:border-[#00C46A]">
            <span className="text-base text-[#6B6B6B]">R$</span>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...register("price")}
              className="w-full text-base outline-none"
            />
          </div>
          {errors.price && <span className="text-sm text-[#FF4D4D]">{errors.price.message}</span>}
        </div>
      </div>

      <SizeGrid control={control} productId={productId} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Descrição</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-[#111111]">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={4}
            {...register("description")}
            className="rounded-lg border border-[#F5F5F3] bg-white px-3 py-2 text-sm outline-none focus:border-[#00C46A]"
          />
          {errors.description && (
            <span className="text-sm text-[#FF4D4D]">{errors.description.message}</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#00C46A] px-4 py-2 font-medium text-white transition disabled:opacity-60"
      >
        {isPending ? "Salvando…" : "Salvar produto"}
      </button>
    </form>
  );
}
