"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, List, Settings } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { VitrinoLogo } from "@/components/vitrino-logo";

/**
 * Itens de navegação do painel (D-07, copy verbatim): Dashboard, Produtos,
 * Configurações. "Sair da conta" fica separado no rodapé, nunca na lista.
 * Ícones seguem `ui_kits/admin/AdminShell.jsx` do design system (casa,
 * lista, engrenagem).
 */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/produtos", label: "Produtos", Icon: List },
  { href: "/configuracoes", label: "Configurações", Icon: Settings },
];

/**
 * Links de navegação compartilhados entre a sidebar desktop e o drawer
 * mobile (mesmo componente interno, nunca duas implementações divergentes).
 * Link ativo via `usePathname().startsWith(item.href)` — como cada item tem
 * um prefixo distinto (`/dashboard`, `/produtos`, `/configuracoes`), não há
 * colisão entre eles. Estilo pill (fundo `bg-primary-subtle`/texto `primary`
 * quando ativo) conforme `components/navigation/NavItem.jsx` do design
 * system — substitui o antigo indicador de borda esquerda.
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
                ? "flex min-h-11 items-center gap-3 rounded-md bg-primary-subtle px-3 font-semibold text-primary transition-colors duration-150"
                : "flex min-h-11 items-center gap-3 rounded-md px-3 font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900"
            }
          >
            <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Cabeçalho de logo ("swatch" azul + wordmark "Vitrino"), replicado no topo
 * da sidebar desktop e do drawer mobile (`ui_kits/admin/AdminShell.jsx`).
 */
function LogoMark() {
  return (
    <div className="flex items-center gap-2 px-3">
      <VitrinoLogo size={28} className="text-primary" />
      <span className="font-display text-lg font-extrabold text-gray-900">Vitrino</span>
    </div>
  );
}

/**
 * Bloco de conta no rodapé da sidebar (iniciais + nome da loja + rótulo
 * "revendedor"), conforme `AdminShell.jsx`. `storeName` vem de uma query já
 * existente no layout do painel — puramente exibição, sem mutação nova.
 */
function AccountBlock({ storeName }: { storeName: string | null }) {
  const initials = storeName
    ? storeName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : "?";

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-3 pt-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
          {initials}
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-gray-900">{storeName ?? "Sua loja"}</span>
          <span className="text-xs text-gray-500">revendedor</span>
        </div>
      </div>
      <form action={signOutAction}>
        <button type="submit" className="min-h-11 text-sm text-gray-500 transition-colors duration-150 hover:text-gray-900">
          Sair da conta
        </button>
      </form>
    </div>
  );
}

/**
 * AdminSidebar (D-05/D-06): sidebar fixa no desktop (`<aside hidden md:flex>`)
 * + hambúrguer que abre um drawer `<dialog>` nativo no mobile
 * (`<button md:hidden>` + `.showModal()`). Ambos sempre no DOM — CSS decide
 * a visibilidade (mesma técnica de `loja/[slug]/page.tsx`).
 */
export function AdminSidebar({ storeName }: { storeName: string | null }) {
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
      <aside className="hidden w-[232px] shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-3 py-5 md:flex">
        <LogoMark />
        <nav className="flex flex-col gap-0.5">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="mt-auto">
          <AccountBlock storeName={storeName} />
        </div>
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
        <div className="flex h-full flex-col gap-6 animate-scale-in">
          <div className="flex items-center justify-between">
            <LogoMark />
            <button
              type="button"
              onClick={closeDrawer}
              className="flex min-h-11 min-w-11 items-center justify-center"
              aria-label="Fechar menu"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5" onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) {
              closeDrawer();
            }
          }}>
            <NavLinks pathname={pathname} />
          </nav>
          <div className="mt-auto">
            <AccountBlock storeName={storeName} />
          </div>
        </div>
      </dialog>
    </>
  );
}
