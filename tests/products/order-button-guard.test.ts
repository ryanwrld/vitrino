import { describe, it, expect } from "vitest";
import { decideOrderAction } from "@/lib/whatsapp/order-guard";

describe("decideOrderAction", () => {
  it("sem tamanho selecionado (null): não navega, sacode", () => {
    expect(decideOrderAction(null)).toEqual({
      shouldNavigate: false,
      shouldShake: true,
    });
  });

  it("com tamanho selecionado: navega, não sacode", () => {
    expect(decideOrderAction(42)).toEqual({
      shouldNavigate: true,
      shouldShake: false,
    });
  });
});
