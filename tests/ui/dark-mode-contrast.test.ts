import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Teste estático de regressão para o gap de contraste em dark mode (UAT M-4 +
 * achado bônus): o boilerplate do create-next-app inverte --background/--foreground
 * via @media (prefers-color-scheme: dark), mas o projeto NÃO tem dark mode
 * (CLAUDE.md confirma fora de escopo). Este teste lê os arquivos de fonte como
 * string (mesmo padrão de tests/middleware/matcher.test.ts) — não renderiza React.
 */

const ADMIN_PAGES_WITH_MAIN = [
  "src/app/(admin)/onboarding/onboarding-wizard.tsx",
  "src/app/(admin)/cadastro/page.tsx",
  "src/app/(admin)/login/page.tsx",
  "src/app/(admin)/dashboard/page.tsx",
  "src/app/(admin)/esqueci-senha/page.tsx",
  "src/app/(admin)/redefinir-senha/page.tsx",
];

function readSource(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

describe("dark mode contrast regression", () => {
  it("globals.css força color-scheme: light", () => {
    const css = readSource("src/app/globals.css");
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("globals.css NÃO reintroduz o flip de esquema escuro do boilerplate", () => {
    const css = readSource("src/app/globals.css");
    expect(css).not.toMatch(/@media[^{]*prefers-color-scheme:\s*dark/);
  });

  it.each(ADMIN_PAGES_WITH_MAIN)(
    "%s: <main> declara fundo claro explícito (bg-white)",
    (rel) => {
      const source = readSource(rel);
      const match = source.match(/<main[^>]*className="([^"]*)"/);
      expect(match).not.toBeNull();
      const className = match?.[1] ?? "";
      expect(className).toMatch(/\bbg-white\b/);
    },
  );
});
