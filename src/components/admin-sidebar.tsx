"use client";

import { useRef } from "react";
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
                ? "flex min-h-11 items-center border-l-2 border-[#0D21A1] pl-3 -ml-3 font-medium text-[#0D21A1]"
                : "flex min-h-11 items-center pl-3 -ml-3 text-[#6B6B6B]"
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

  return (
    <>
      {/* Desktop: sidebar fixa, sempre no DOM, só visível >= md */}
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-[#E7F2FD] bg-white p-4 md:flex">
        <nav className="flex flex-col gap-3">
          <NavLinks pathname={pathname} />
        </nav>
        <form action={signOutAction} className="mt-auto border-t border-[#E7F2FD] pt-4">
          <button type="submit" className="min-h-11 text-sm text-[#6B6B6B]">
            Sair da conta
          </button>
        </form>
      </aside>

      {/* Mobile: hambúrguer + <dialog> nativo, sempre no DOM, só visível < md */}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex min-h-11 min-w-11 items-center justify-center md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Menu de navegação"
        className="m-0 h-dvh max-h-none w-64 max-w-none bg-white p-4 backdrop:bg-black/50"
        onCancel={closeDrawer}
      >
        <div className="flex flex-col gap-6">
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
          <form action={signOutAction} className="mt-auto border-t border-[#E7F2FD] pt-4">
            <button type="submit" className="min-h-11 text-sm text-[#6B6B6B]">
              Sair da conta
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
