"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Itens de navegação do painel (D-07, copy verbatim): Dashboard, Produtos,
 * Configurações. "Sair da conta" fica separado no rodapé, nunca na lista.
 */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/produtos", label: "Produtos" },
  { href: "/configuracoes", label: "Configurações" },
];

/**
 * Links de navegação compartilhados entre a sidebar desktop e o drawer
 * mobile (mesmo componente interno, nunca duas implementações divergentes).
 * Link ativo via `usePathname().startsWith(item.href)` — como cada item tem
 * um prefixo distinto (`/dashboard`, `/produtos`, `/configuracoes`), não há
 * colisão entre eles.
 */
function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex min-h-11 items-center border-l-2 border-primary pl-3 -ml-3 font-medium text-primary transition-colors duration-150"
                : "flex min-h-11 items-center pl-3 -ml-3 text-gray-500 hover:text-gray-900 transition-colors duration-150"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * AdminSidebar (D-05/D-06): sidebar fixa no desktop (`<aside hidden md:flex>`)
 * + hambúrguer que abre um drawer `<dialog>` nativo no mobile
 * (`<button md:hidden>` + `.showModal()`). Ambos sempre no DOM — CSS decide
 * a visibilidade (mesma técnica de `loja/[slug]/page.tsx`).
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeDrawer() {
    dialogRef.current?.close();
  }

  // Fecha o drawer se a viewport cruzar para desktop (>= md) enquanto ele
  // está aberto — sem isso, o <dialog> continua aberto (e visualmente
  // sobreposto ao layout desktop) quando o usuário redimensiona a janela
  // ou sai da emulação mobile do DevTools sem fechar o menu primeiro.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    function handleChange(event: MediaQueryListEvent | MediaQueryList) {
      if (event.matches) {
        dialogRef.current?.close();
      }
    }
    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      {/* Desktop: sidebar fixa, sempre no DOM, só visível >= md */}
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-4 md:flex">
        <nav className="flex flex-col gap-3">
          <NavLinks pathname={pathname} />
        </nav>
        <form action={signOutAction} className="mt-auto border-t border-gray-200 pt-4">
          <button type="submit" className="min-h-11 text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150">
            Sair da conta
          </button>
        </form>
      </aside>

      {/* Mobile: barra de topo com o hambúrguer, acima de {children} (D-06 / UI-SPEC linha 132) — só visível < md */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="flex min-h-11 min-w-11 items-center justify-center"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="Menu de navegação"
        className="m-0 h-dvh max-h-none w-64 max-w-none bg-white p-4 backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
        onCancel={closeDrawer}
      >
        <div className="flex flex-col gap-6 animate-scale-in">
          <button
            type="button"
            onClick={closeDrawer}
            className="flex min-h-11 min-w-11 items-center justify-center self-end"
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <nav className="flex flex-col gap-3" onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) {
              closeDrawer();
            }
          }}>
            <NavLinks pathname={pathname} />
          </nav>
          <form action={signOutAction} className="mt-auto border-t border-gray-200 pt-4">
            <button type="submit" className="min-h-11 text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150">
              Sair da conta
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
