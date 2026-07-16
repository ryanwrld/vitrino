"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { saveProduct, updateProduct, publishProduct, unpublishProduct } from "@/lib/products/actions";
import { BRANDS, SOLES, CATEGORIES, FULFILLMENTS, DEFAULT_SIZE_RANGE } from "@/lib/products/constants";
import { SizeGrid } from "./size-grid";
import { PhotoUploader, type SavedPhoto } from "./photo-uploader";

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
 * `productId` (opcional, Plan 03-05) diferencia modo edição de criação:
 * - Seção Tamanhos: em criação, "Marcar tudo como esgotado" só mexe no form
 *   state; em edição, chama a Server Action `markProductEsgotado` (ver
 *   size-grid.tsx).
 * - Fotos: em edição, `initialPhotos` pré-carrega o uploader com as fotos já
 *   salvas (URLs públicas) e cada ação chama as Server Actions dedicadas
 *   imediatamente (ver photo-uploader.tsx).
 * - Submit: em criação chama `saveProduct`; em edição chama
 *   `updateProduct(productId, formData)`.
 * - `status` (só relevante em edição) habilita o botão secundário
 *   "Publicar"/"Voltar para rascunho" (D-10) — ação distinta de salvar os
 *   campos, nunca disparada pelo submit do formulário.
 */
export type ProductFormProps = {
  defaultValues?: Partial<ProductInput>;
  productId?: string;
  status?: string;
  initialPhotos?: SavedPhoto[];
};

export function ProductForm({ defaultValues, productId, status, initialPhotos }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublishPending, startPublishTransition] = useTransition();
  // Espelha o status do produto (edição) só para atualizar o rótulo do botão
  // Publicar/Voltar-para-rascunho sem precisar de router.refresh() — a
  // listagem (Server Component) reflete o status real na próxima navegação.
  const [currentStatus, setCurrentStatus] = useState(status ?? "draft");
  // Modo criação (sem productId): PhotoUploader mantém as fotos comprimidas
  // como File[] local, notificadas aqui via onPendingFilesChange, para
  // serem anexadas ao mesmo FormData de saveProduct (Task 3, 03-04-PLAN.md).
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
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
      hideWhenSoldOut: "",
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
    formData.set("hideWhenSoldOut", values.hideWhenSoldOut ?? "");
    for (const photoFile of pendingPhotoFiles) {
      formData.append("photos", photoFile);
    }

    startTransition(async () => {
      const result = productId ? await updateProduct(productId, formData) : await saveProduct(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(productId ? "Produto atualizado!" : "Produto salvo!");
      router.push("/produtos");
    });
  };

  /**
   * Publicar/despublicar (D-10) é uma ação distinta de "Salvar produto" —
   * nunca disparada pelo submit do form, sempre pelo próprio botão
   * secundário, com seu próprio `useTransition` para não desabilitar o botão
   * de salvar enquanto alterna o status. Sem diálogo de confirmação
   * (reversível, baixo risco — T-03-12, 03-UI-SPEC.md).
   */
  function handleTogglePublish() {
    if (!productId) return;
    const willPublish = currentStatus !== "published";

    startPublishTransition(async () => {
      const result = willPublish ? await publishProduct(productId) : await unpublishProduct(productId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCurrentStatus(willPublish ? "published" : "draft");
      toast.success(willPublish ? "Produto publicado!" : "Produto movido para rascunho.");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium text-gray-900">Identificação</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="rounded-md border border-gray-300 bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.name && <span className="text-sm text-error-solid">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className="text-sm font-medium text-gray-700">
            Marca
          </label>
          <div className="relative">
            <select
              id="brand"
              {...register("brand")}
              className="w-full min-h-11 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="">Selecione a marca</option>
              {BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
          {errors.brand && <span className="text-sm text-error-solid">{errors.brand.message}</span>}
        </div>

        {isBrandOther && (
          <div className="flex flex-col gap-1">
            <label htmlFor="brandOther" className="text-sm font-medium text-gray-700">
              Qual marca?
            </label>
            <input
              id="brandOther"
              type="text"
              {...register("brandOther")}
              className="rounded-md border border-gray-300 bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
            />
            {errors.brandOther && (
              <span className="text-sm text-error-solid">{errors.brandOther.message}</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="line" className="text-sm font-medium text-gray-700">
            Linha (opcional)
          </label>
          <input
            id="line"
            type="text"
            placeholder="Ex.: Mercurial"
            {...register("line")}
            className="rounded-md border border-gray-300 bg-white px-3 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.line && <span className="text-sm text-error-solid">{errors.line.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium text-gray-900">Solado &amp; Categoria</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="sole" className="text-sm font-medium text-gray-700">
            Solado (opcional)
          </label>
          <div className="relative">
            <select
              id="sole"
              {...register("sole")}
              className="w-full min-h-11 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="">—</option>
              {SOLES.map((sole) => (
                <option key={sole} value={sole}>
                  {sole}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-gray-700">
            Categoria (opcional)
          </label>
          <div className="relative">
            <select
              id="category"
              {...register("category")}
              className="w-full min-h-11 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="">—</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="fulfillment" className="text-sm font-medium text-gray-700">
            Modalidade (opcional)
          </label>
          <div className="relative">
            <select
              id="fulfillment"
              {...register("fulfillment")}
              className="w-full min-h-11 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="">—</option>
              {FULFILLMENTS.map((fulfillment) => (
                <option key={fulfillment.value} value={fulfillment.value}>
                  {fulfillment.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium text-gray-900">Preço</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium text-gray-700">
            Preço
          </label>
          <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 h-11 transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-subtle">
            <span className="text-base text-gray-500">R$</span>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...register("price")}
              className="w-full text-base text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          {errors.price && <span className="text-sm text-error-solid">{errors.price.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium text-gray-900">Visibilidade</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="hideWhenSoldOut" className="text-sm font-medium text-gray-700">
            Exibir quando esgotado
          </label>
          <div className="relative">
            <select
              id="hideWhenSoldOut"
              {...register("hideWhenSoldOut")}
              className="w-full min-h-11 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-9 h-11 text-base text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle"
            >
              <option value="">Usar padrão da loja</option>
              <option value="false">Sempre mostrar (esmaecido)</option>
              <option value="true">Ocultar da vitrine</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          </div>
        </div>
      </div>

      <SizeGrid control={control} productId={productId} />

      <PhotoUploader productId={productId} initialPhotos={initialPhotos} onPendingFilesChange={setPendingPhotoFiles} />

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-medium text-gray-900">Descrição</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={4}
            {...register("description")}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary-subtle placeholder:text-gray-400"
          />
          {errors.description && (
            <span className="text-sm text-error-solid">{errors.description.message}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover active:bg-primary-active active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:pointer-events-none"
        >
          {isPending ? "Salvando…" : "Salvar produto"}
        </button>

        {/* Publicar/Voltar para rascunho (D-10) só existe em modo edição —
            ação separada do submit, nunca renderizada na criação. */}
        {productId && (
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={isPublishPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPublishPending
              ? "Salvando…"
              : currentStatus === "published"
                ? "Voltar para rascunho"
                : "Publicar"}
          </button>
        )}
      </div>
    </form>
  );
}
