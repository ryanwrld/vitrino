"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { copyText } from "@/lib/clipboard";

export type QrCodePanelProps = {
  publicUrl: string;
};

/**
 * Painel real de "Seu QR Code" + URL pública (D-09–D-13, LOJA-03/LOJA-04).
 * O preview do QR é renderizado direto num `<canvas>` ao montar (D-11) —
 * usa `QRCode.toCanvas` (não `generateQrDataUrl` de `src/lib/qr.ts`, que é o
 * helper node-testável equivalente usado pela suíte de testes; aqui
 * precisamos do canvas real do DOM para o botão "Baixar PNG" ler de volta
 * via `toDataURL`). Nível de correção de erro padrão (M), sem logo (D-10).
 */
export function QrCodePanel({ publicUrl }: QrCodePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCopying, startCopyTransition] = useTransition();
  // `qrReady` é derivado comparando o publicUrl já desenhado com o atual —
  // nunca um `setState` síncrono no corpo do efeito (mesmo padrão do fix em
  // slug-editor.tsx, react-hooks/set-state-in-effect: só chamamos
  // `setReadyUrl` dentro do callback assíncrono de `QRCode.toCanvas`).
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const qrReady = readyUrl === publicUrl;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    QRCode.toCanvas(canvas, publicUrl, { width: 240, margin: 2 })
      .then(() => {
        if (!cancelled) setReadyUrl(publicUrl);
      })
      .catch(() => {
        if (!cancelled) setReadyUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  function handleCopy() {
    startCopyTransition(async () => {
      const ok = await copyText(publicUrl);
      if (ok) {
        toast.success("Link copiado!");
      } else {
        toast.error("Não foi possível copiar o link. Selecione e copie manualmente.");
      }
    });
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "vitrine-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 text-gray-900">
        <QrCode className="h-5 w-5" />
        <h2 className="font-display font-bold">QR code</h2>
      </div>

      <div className="flex flex-col items-start gap-4 mt-2">
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 flex items-center justify-center">
          <canvas ref={canvasRef} width={240} height={240} className="rounded-md shadow-sm" />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!qrReady}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white p-3 text-sm font-semibold text-gray-900 transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar PNG
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="publicUrl" className="text-sm font-medium text-gray-700">
          URL pública
        </label>
        <div className="flex items-center gap-2">
          <input
            id="publicUrl"
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 h-11 text-base text-gray-900 outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            aria-label="Copiar"
            className="flex items-center gap-2 rounded-md bg-primary p-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover active:bg-primary-active active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:pointer-events-none"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}
