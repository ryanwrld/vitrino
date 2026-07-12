import { describe, it, expect } from "vitest";
import { generateQrDataUrl } from "@/lib/qr";
import { buildStoreUrl } from "@/lib/slug/store-url";

/**
 * `qrcode` roda em Node sem precisar de mock de canvas (LOJA-03) — a prova
 * automatizada aqui é que o data URL PNG é gerado corretamente para a URL
 * pública da vitrine; o preview visual e a leitura por câmera real ficam
 * para o human-check do plano.
 */
describe("generateQrDataUrl", () => {
  it("resolve para uma string data:image/png;base64, para a URL pública da vitrine", async () => {
    const url = buildStoreUrl("minha-loja");
    const dataUrl = await generateQrDataUrl(url);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
