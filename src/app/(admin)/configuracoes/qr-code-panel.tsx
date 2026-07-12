"use client";

/**
 * Placeholder do painel de QR Code + copiar link (D-09–D-13). A
 * implementação real (geração de QR via `qrcode`, botão "Baixar PNG" e
 * "Copiar" via Clipboard API) chega no plano 02-06 — este componente existe
 * apenas para fechar a estrutura da página "Link e QR Code" e permitir que
 * 02-04 seja buildável de ponta a ponta.
 */
export type QrCodePanelProps = {
  publicUrl: string;
};

export function QrCodePanel({ publicUrl }: QrCodePanelProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#111111]">URL pública</label>
      <p className="text-base text-[#111111] break-all">{publicUrl}</p>
      <p className="text-xs text-[#6B6B6B]">QR Code e cópia de link em breve.</p>
    </div>
  );
}
