import { describe, expect, it } from "vitest";
import { config } from "@/middleware";

/**
 * Converte um padrão de `config.matcher` do Next.js (sintaxe de path-to-regexp
 * simplificada, ex.: "/admin/:path*") em uma RegExp equivalente, apenas para
 * fins deste smoke test — não é o matcher real do Next.js em produção, mas
 * verifica que o padrão declarado cobre exatamente o prefixo esperado e nada
 * além dele (SC-7, Armadilha 5 do 01-RESEARCH.md).
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:path\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function isCovered(pathname: string): boolean {
  return config.matcher.some((pattern) => patternToRegex(pattern).test(pathname));
}

describe("middleware config.matcher", () => {
  it("é exatamente ['/admin/:path*']", () => {
    expect(config.matcher).toEqual(["/admin/:path*"]);
  });

  it("cobre /admin/dashboard", () => {
    expect(isCovered("/admin/dashboard")).toBe(true);
  });

  it("NÃO cobre a vitrine pública /loja/[slug]", () => {
    expect(isCovered("/loja/loja-teste")).toBe(false);
  });

  it("NÃO cobre a home /", () => {
    expect(isCovered("/")).toBe(false);
  });

  it("NÃO cobre /login", () => {
    expect(isCovered("/login")).toBe(false);
  });

  it("NÃO cobre /cadastro", () => {
    expect(isCovered("/cadastro")).toBe(false);
  });
});
