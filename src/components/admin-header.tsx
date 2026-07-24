"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

export function AdminHeader({ storeName }: { storeName: string | null }) {
  const initials = storeName
    ? storeName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : "?";

  return (
    <header className="hidden md:flex h-14 items-center justify-end gap-3 px-4 border-b border-gray-200 bg-gray-50 md:px-6 dark:border-gray-800 dark:bg-gray-925">
      {/* Sino de notificações — mesmo canto/nível do bloco de conta em
          qualquer página do painel (não só dashboard), levando pro
          histórico completo de atividade em /dashboard/atividade. */}
      <Link
        href="/dashboard/atividade"
        aria-label="Ver notificações"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </Link>
      <Link
        href="/configuracoes/loja"
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors duration-150 ${
          usePathname() === "/configuracoes/loja" ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <div className="flex min-w-0 flex-col leading-tight text-right">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{storeName ?? "Sua loja"}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">revendedor</span>
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: "#0D21A1" }}
        >
          {initials}
        </div>
      </Link>
    </header>
  );
}
