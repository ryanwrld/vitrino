import { describe, it, expect } from "vitest";
import { normalizeWhatsAppBR } from "@/lib/phone/normalize-br";

/**
 * Cobre explicitamente os casos do catálogo de PITFALLS (01-RESEARCH.md
 * Armadilha 2): normalização de telefone deve acontecer UMA ÚNICA VEZ no
 * servidor e rejeitar entradas malformadas sem retornar número parcial.
 */
describe("normalizeWhatsAppBR", () => {
  it("normaliza número com parênteses e traços", () => {
    const result = normalizeWhatsAppBR("(11) 99999-9999");
    expect(result).toEqual({ e164Digits: "5511999999999" });
  });

  it("normaliza número com zero à esquerda no DDD", () => {
    const result = normalizeWhatsAppBR("(011) 99999-9999");
    expect(result).toEqual({ e164Digits: "5511999999999" });
  });

  it("normaliza número de 8 dígitos legado (sem o 9 inicial)", () => {
    const result = normalizeWhatsAppBR("(11) 9999-9999");
    expect(result).toHaveProperty("e164Digits");
    expect((result as { e164Digits: string }).e164Digits).toMatch(/^55\d+$/);
  });

  it("normaliza número sem DDI explícito", () => {
    const result = normalizeWhatsAppBR("11999999999");
    expect(result).toEqual({ e164Digits: "5511999999999" });
  });

  it("normaliza número com espaços não-quebráveis colados", () => {
    const result = normalizeWhatsAppBR("(11) 99999-9999");
    expect(result).toEqual({ e164Digits: "5511999999999" });
  });

  it("normaliza número já com DDI 55 e símbolo +", () => {
    const result = normalizeWhatsAppBR("+55 11 99999-9999");
    expect(result).toEqual({ e164Digits: "5511999999999" });
  });

  it("rejeita entrada inválida sem retornar número parcial", () => {
    const result = normalizeWhatsAppBR("123");
    expect(result).toEqual({ error: expect.any(String) });
    expect(result).not.toHaveProperty("e164Digits");
  });

  it("rejeita entrada vazia", () => {
    const result = normalizeWhatsAppBR("");
    expect(result).toEqual({ error: expect.any(String) });
  });
});
