"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Escopo do dark mode: só o painel admin (dashboard/produtos/configurações)
 * — a vitrine pública mantém paleta de marca fixa por design. O provider
 * fica montado na raiz (padrão next-themes, evita FOUC via script bloqueante
 * no <head>), mas a classe "dark" só tem efeito visual dentro de
 * `.admin-scope` (ver @custom-variant em globals.css) — nenhuma página
 * pública referencia essa classe, então o toggle nunca vaza pra lá mesmo
 * que o usuário abra a vitrine na mesma sessão com o tema escuro ativo.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
