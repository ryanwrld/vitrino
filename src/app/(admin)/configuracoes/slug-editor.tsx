"use client";

/**
 * Placeholder da edição de slug (D-01–D-04, D-08). A implementação real
 * (slugify-as-you-type, debounce de 400ms, checagem via
 * `checkSlugAvailability`, diálogo de confirmação e `updateStoreSlug`)
 * chega no plano 02-05 — este componente existe apenas para fechar a
 * estrutura da página "Link e QR Code" e permitir que 02-04 seja buildável
 * de ponta a ponta.
 */
export type SlugEditorProps = {
  currentSlug: string;
};

export function SlugEditor({ currentSlug }: SlugEditorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#111111]">Link da vitrine</label>
      <p className="text-base text-[#111111]">/loja/{currentSlug}</p>
      <p className="text-xs text-[#6B6B6B]">Edição do link em breve.</p>
    </div>
  );
}
