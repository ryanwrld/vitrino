"use client";

import { useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { ChevronLeft, Copy } from "lucide-react";
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { formatBRLPrice, formatBRLPriceInput } from "@/lib/currency/brl";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp/order-message";
import { decideOrderAction } from "@/lib/whatsapp/order-guard";
import { ImageWithFallback } from "../image-with-fallback";

/**
 * Composição condicional de className — mesmo `cn()` local de
 * `size-grid.tsx` (clsx + tailwind-merge). Não extraído para um util
 * compartilhado neste plano: os dois componentes replicam a mesma linha,
 * seguindo o precedente já estabelecido na Fase 3.
 */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type ProductOrderPanelProps = {
  product: {
    name: string;
    line: string | null;
    sole: string | null;
    price: number;
  };
  sizes: { size: number; available: boolean }[];
  whatsappE164: string;
  messageTemplate: string;
  coverUrl: string | null;
  galleryUrls: string[];
  storeId: string;
  productId: string;
  slug: string;
};

const TOOLTIP_DISMISS_MS = 2500;

/**
 * Painel de pedido da página de detalhe (PED-01/02/03/04, D-02/D-03/D-04/
 * D-07/D-08/D-10). Client Component porque exige estado de seleção de
 * tamanho + handlers de clique/teclado — a leitura de dados (store,
 * produto, tamanhos, store_settings) já aconteceu no Server Component pai
 * (page.tsx, Plan 05-04 Task 2).
 *
 * "Pedir agora" é SEMPRE um `<a href>` real (nunca `disabled`, D-02): href
 * alterna entre "#" (sem tamanho) e a URL wa.me real (com tamanho).
 * `decideOrderAction` (05-02) decide se o clique deve navegar ou ser
 * interceptado — só o caminho inválido chama `preventDefault()`; o caminho
 * válido deixa a navegação nativa do anchor acontecer (nunca
 * `window.open`/`router.push`, T-05-11). O log fire-and-forget do clique
 * (`logOrderClick`, Task 3 deste plano) é fiado no caminho válido, sem
 * nunca gatear a UI por `isPending` (D-10).
 *
 * Pílulas de tamanho: `available === false` faz o handler early-return
 * (revalidação no clique) — cobre mouse E teclado, já que `pointer-events-
 * none` sozinho NÃO bloqueia Enter/Space (05-RESEARCH.md Pitfall 1);
 * `tabIndex={-1}` remove a pílula esgotada do fluxo de Tab.
 *
 * "Copiar mensagem" (D-07/D-08) é SEMPRE visível — nunca um fallback
 * condicional — e usa a MESMA string composta do wa.me (incluindo a linha
 * de foto), via `copyText` como primeiro `await` dentro da transition
 * (05-RESEARCH.md Pitfall 6, mesmo padrão de `qr-code-panel.tsx`).
 */
export function ProductOrderPanel({
  product,
  sizes,
  whatsappE164,
  messageTemplate,
  coverUrl,
  galleryUrls,
  storeId,
  productId,
  slug,
}: ProductOrderPanelProps) {
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPending, startCopyTransition] = useTransition();

  const galleryRef = useRef<HTMLDivElement>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  function handleGalleryScroll() {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActivePhotoIndex(index);
  }

  function handleSelectSize(size: number, available: boolean) {
    // Revalidação no clique (mouse E teclado, Pitfall 1) — pointer-events-none
    // não bloqueia Enter/Space, então este early-return é a defesa real.
    if (!available) return;
    setSelectedSize(size);
  }

  // A1 (05-RESEARCH.md): {modelo} interpola product.name, com product.line
  // "folded in" quando presente — o template não tem placeholder próprio
  // para line.
  const modelo = product.line ? `${product.name} - ${product.line}` : product.name;
  // A2 (05-RESEARCH.md): sole ausente vira string vazia, nunca "null"/"undefined"
  // literal na mensagem.
  const solado = product.sole ?? "";
  const precoFormatado = formatBRLPriceInput(product.price);

  const message = buildOrderMessage(messageTemplate, {
    modelo,
    solado,
    tamanho: selectedSize !== null ? String(selectedSize) : "",
    preco: precoFormatado,
    fotoUrl: coverUrl,
  });

  const href = selectedSize !== null ? buildWhatsAppUrl(whatsappE164, message) : "#";

  function handleOrderClick(event: MouseEvent<HTMLAnchorElement>) {
    const { shouldNavigate, shouldShake } = decideOrderAction(selectedSize);

    if (!shouldNavigate) {
      event.preventDefault();
      if (shouldShake) {
        // Incrementar shakeKey força o remount do anchor (key={shakeKey}) —
        // reinicia a animação CSS mesmo em cliques rápidos repetidos
        // (05-RESEARCH.md Pitfall 4).
        setShakeKey((key) => key + 1);
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), TOOLTIP_DISMISS_MS);
      }
      return;
    }

    // Caminho válido: NUNCA chamar preventDefault aqui — é o que garante a
    // navegação nativa do <a> em webviews in-app (T-05-11). O registro
    // fire-and-forget do clique (logOrderClick) é fiado neste ponto pela
    // Task 3, sem nunca atrasar/bloquear esta navegação (D-10).
  }

  function handleCopy() {
    startCopyTransition(async () => {
      const ok = await copyText(message);
      if (ok) {
        toast.success("Mensagem copiada!");
      } else {
        toast.error("Não foi possível copiar. Tente novamente.");
      }
    });
  }

  const photosToRender = galleryUrls.length > 0 ? galleryUrls : [coverUrl];

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/loja/${slug}`} className="flex w-fit items-center gap-1 text-sm text-[#6B6B6B]">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Voltar
      </Link>

      <div className="flex flex-col gap-2">
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto"
        >
          {photosToRender.map((url, index) => (
            <div
              key={url ?? index}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-xl bg-[#F5F5F3]"
            >
              <ImageWithFallback src={url} alt={product.name} />
            </div>
          ))}
        </div>
        {photosToRender.length > 1 && (
          <span className="text-center text-xs text-[#6B6B6B]">
            Foto {activePhotoIndex + 1} de {photosToRender.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#111111]">{product.name}</h1>
        <span className="text-sm font-medium text-[#111111]">{formatBRLPrice(product.price)}</span>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[#111111]">Escolha o tamanho</h2>
        <div className="grid grid-cols-5 gap-2">
          {sizes.map(({ size, available }) => (
            <button
              key={size}
              type="button"
              onClick={() => handleSelectSize(size, available)}
              aria-pressed={selectedSize === size}
              tabIndex={available ? 0 : -1}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-base transition",
                available && selectedSize !== size && "border-[#F5F5F3] bg-white text-[#111111]",
                available && selectedSize === size && "border-[#00C46A] bg-[#00C46A] text-white",
                !available &&
                  "pointer-events-none border-[#F5F5F3] bg-[#F5F5F3] text-[#6B6B6B] line-through opacity-60"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col gap-2">
        {showTooltip && (
          <div className="absolute -top-10 left-0 rounded-lg bg-[#111111] px-3 py-1.5 text-xs text-white">
            Selecione um tamanho
          </div>
        )}
        <a
          key={shakeKey}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOrderClick}
          className={cn(
            "min-h-11 w-full rounded-lg bg-[#00C46A] px-4 py-2 text-center text-sm font-medium text-white transition",
            shakeKey > 0 && "animate-shake"
          )}
        >
          Pedir agora
        </a>

        <button
          type="button"
          onClick={handleCopy}
          disabled={isPending}
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-[#6B6B6B] px-4 py-2 text-center text-sm font-medium text-[#6B6B6B] transition disabled:opacity-60"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar mensagem
        </button>
      </div>
    </div>
  );
}
