"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  // Diálogo de confirmação de publicar/despublicar (Seção 6, item 10) — mesmo
  // padrão nativo <dialog> do diálogo de exclusão em product-list.tsx.
  const publishDialogRef = useRef<HTMLDialogElement>(null);
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
   * de salvar enquanto alterna o status. Efeito público imediato — abre um
   * diálogo de confirmação (Seção 6, item 10) antes de chamar a Server
   * Action, mesmo padrão do diálogo de exclusão em product-list.tsx.
   */
  function handleTogglePublish() {
    if (!productId) return;
    publishDialogRef.current?.showModal();
  }

  function handleConfirmTogglePublish() {
    if (!productId) return;
    const willPublish = currentStatus !== "published";

    startPublishTransition(async () => {
      const result = willPublish ? await publishProduct(productId) : await unpublishProduct(productId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setCurrentStatus(willPublish ? "published" : "draft");
        toast.success(willPublish ? "Produto publicado!" : "Produto movido para rascunho.");
      }
      publishDialogRef.current?.close();
    });
  }

  const willPublish = currentStatus !== "published";

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-ink">Identificação</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Nome
          </label>
          <input
            id="name"
            type="text"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
          />
          {errors.name && <span className="text-sm text-danger">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className="text-sm font-medium text-ink">
            Marca
          </label>
          <select
            id="brand"
            aria-invalid={errors.brand ? true : undefined}
            {...register("brand")}
            className="select-chevron rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
          >
            <option value="">Selecione a marca</option>
            {BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          {errors.brand && <span className="text-sm text-danger">{errors.brand.message}</span>}
        </div>

        {isBrandOther && (
          <div className="flex flex-col gap-1">
            <label htmlFor="brandOther" className="text-sm font-medium text-ink">
              Qual marca?
            </label>
            <input
              id="brandOther"
              type="text"
              aria-invalid={errors.brandOther ? true : undefined}
              {...register("brandOther")}
              className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
            />
            {errors.brandOther && (
              <span className="text-sm text-danger">{errors.brandOther.message}</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="line" className="text-sm font-medium text-ink">
            Linha (opcional)
          </label>
          <input
            id="line"
            type="text"
            placeholder="Ex.: Mercurial"
            aria-invalid={errors.line ? true : undefined}
            {...register("line")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand aria-invalid:border-danger"
          />
          {errors.line && <span className="text-sm text-danger">{errors.line.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-ink">Solado &amp; Categoria</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="sole" className="text-sm font-medium text-ink">
            Solado (opcional)
          </label>
          <select
            id="sole"
            {...register("sole")}
            className="select-chevron rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
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
          <label htmlFor="category" className="text-sm font-medium text-ink">
            Categoria (opcional)
          </label>
          <select
            id="category"
            {...register("category")}
            className="select-chevron rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
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
          <label htmlFor="fulfillment" className="text-sm font-medium text-ink">
            Modalidade (opcional)
          </label>
          <select
            id="fulfillment"
            {...register("fulfillment")}
            className="select-chevron rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
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
        <h2 className="text-xl font-medium text-ink">Preço</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium text-ink">
            Preço
          </label>
          <div
            className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 focus-within:border-brand ${
              errors.price ? "border-danger" : "border-surface"
            }`}
          >
            <span className="text-base text-muted">R$</span>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={errors.price ? true : undefined}
              {...register("price")}
              className="w-full text-base outline-none"
            />
          </div>
          {errors.price && <span className="text-sm text-danger">{errors.price.message}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-ink">Visibilidade</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="hideWhenSoldOut" className="text-sm font-medium text-ink">
            Exibir quando esgotado
          </label>
          <select
            id="hideWhenSoldOut"
            {...register("hideWhenSoldOut")}
            className="select-chevron rounded-lg border border-surface bg-white px-3 py-2 text-base outline-none focus:border-brand"
          >
            <option value="">Usar padrão da loja</option>
            <option value="false">Sempre mostrar (esmaecido)</option>
            <option value="true">Ocultar da vitrine</option>
          </select>
        </div>
      </div>

      <SizeGrid control={control} productId={productId} />

      <PhotoUploader productId={productId} initialPhotos={initialPhotos} onPendingFilesChange={setPendingPhotoFiles} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-ink">Descrição</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            {...register("description")}
            className="rounded-lg border border-surface bg-white px-3 py-2 text-sm outline-none focus:border-brand aria-invalid:border-danger"
          />
          {errors.description && (
            <span className="text-sm text-danger">{errors.description.message}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-brand px-4 py-2 font-medium text-white transition disabled:opacity-60"
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
            className="rounded-lg border border-black px-4 py-2 font-medium text-black transition disabled:opacity-60"
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

      {productId && (
        <dialog ref={publishDialogRef} className="rounded-xl p-6 backdrop:bg-black/40">
          <h2 className="text-xl font-medium text-ink">
            {willPublish ? "Publicar produto na sua vitrine?" : "Tirar produto da vitrine?"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {willPublish
              ? "O produto ficará visível para qualquer pessoa que acessar sua vitrine."
              : "O produto deixa de aparecer na sua vitrine pública imediatamente."}
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => publishDialogRef.current?.close()}
              className="rounded-lg border border-black px-4 py-2 font-medium text-black"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPublishPending}
              onClick={handleConfirmTogglePublish}
              className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {isPublishPending ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
