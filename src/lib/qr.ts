import QRCode from "qrcode";

/**
 * Gera um QR code PNG (data URL base64) para a URL pública da vitrine
 * (D-09–D-11, LOJA-03). Nível de correção de erro padrão (M) é suficiente —
 * sem composição de logo no QR (D-10, fora de escopo do MVP).
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 240, margin: 2 });
}
