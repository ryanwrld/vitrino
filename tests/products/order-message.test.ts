import { describe, it, expect } from "vitest";
import {
  interpolateMessageTemplate,
  buildOrderMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp/order-message";
import { DEFAULT_MESSAGE_TEMPLATE } from "@/lib/validation/onboarding";

describe("interpolateMessageTemplate", () => {
  it("substitui as 4 chaves do DEFAULT_MESSAGE_TEMPLATE, incluindo acentos, sem duplicar 'R$'", () => {
    const result = interpolateMessageTemplate(DEFAULT_MESSAGE_TEMPLATE, {
      modelo: "Nike Mercurial São Paulo",
      solado: "FG",
      tamanho: "42",
      preco: "199,90",
    });

    expect(result).toContain("Modelo: Nike Mercurial São Paulo");
    expect(result).toContain("Solado: FG");
    expect(result).toContain("Tamanho: 42");
    expect(result).toContain("Preço: R$ 199,90");
    // "R$" só deve aparecer uma vez (o template já tem "R$" fixo; {preço}
    // NUNCA deve trazer um segundo "R$" embutido)
    expect(result.match(/R\$/g)?.length).toBe(1);
    expect(result).not.toContain("{modelo}");
    expect(result).not.toContain("{solado}");
    expect(result).not.toContain("{tamanho}");
    expect(result).not.toContain("{preço}");
  });
});

describe("buildOrderMessage", () => {
  const baseVars = {
    modelo: "Adidas Predator",
    solado: "IC",
    tamanho: "39",
    preco: "349,00",
  };

  it("anexa a linha 'Foto: <url>' quando fotoUrl não é null", () => {
    const message = buildOrderMessage(DEFAULT_MESSAGE_TEMPLATE, {
      ...baseVars,
      fotoUrl: "https://exemplo.supabase.co/storage/v1/object/public/product-images/foo.jpg",
    });

    expect(message).toContain(
      "Foto: https://exemplo.supabase.co/storage/v1/object/public/product-images/foo.jpg"
    );
  });

  it("NÃO anexa a linha 'Foto:' quando fotoUrl é null", () => {
    const message = buildOrderMessage(DEFAULT_MESSAGE_TEMPLATE, {
      ...baseVars,
      fotoUrl: null,
    });

    expect(message).not.toContain("Foto:");
  });
});

describe("buildWhatsAppUrl", () => {
  it("começa com https://wa.me/ e codifica a mensagem uma única vez, preservando acentos no round-trip", () => {
    const message = buildOrderMessage(DEFAULT_MESSAGE_TEMPLATE, {
      modelo: "Nike Mercurial São Paulo",
      solado: "FG",
      tamanho: "42",
      preco: "199,90",
      fotoUrl: "https://exemplo.supabase.co/storage/v1/object/public/product-images/foo.jpg",
    });

    const url = buildWhatsAppUrl("5511999999999", message);

    expect(url.startsWith("https://wa.me/5511999999999?text=")).toBe(true);

    // Ausência de codificação dupla: um espaço codificado uma vez vira "%20"
    // (nunca "%2520", que seria "%20" re-codificado — evidência de dupla
    // codificação).
    expect(url).not.toContain("%2520");
    expect(url).not.toContain("%25C3"); // "%C3" (primeiro byte UTF-8 de acento) re-codificado

    const [, encodedText] = url.split("?text=");
    const decoded = decodeURIComponent(encodedText);
    expect(decoded).toBe(message);
    expect(decoded).toContain("São Paulo");
    expect(decoded).toContain("Preço: R$ 199,90");
  });

  it("codifica a mensagem sem foto exatamente uma vez", () => {
    const message = buildOrderMessage(DEFAULT_MESSAGE_TEMPLATE, {
      modelo: "Puma Ção",
      solado: "TF",
      tamanho: "40",
      preco: "259,90",
      fotoUrl: null,
    });

    const url = buildWhatsAppUrl("5511988888888", message);
    const [, encodedText] = url.split("?text=");
    const decoded = decodeURIComponent(encodedText);

    expect(decoded).toBe(message);
    expect(decoded).not.toContain("Foto:");
  });
});
