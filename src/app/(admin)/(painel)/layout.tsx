import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

/**
 * Layout do grupo de rotas aninhado `(painel)` — isola a sidebar às páginas
 * autenticadas (Dashboard/Produtos/Configurações), sem afetar as páginas
 * públicas de auth que continuam vivendo direto sob `(admin)/` (Pitfall 4 de
 * 06-RESEARCH.md). Este é o ÚNICO `<main>` das páginas do painel — cada
 * página movida para dentro de `(painel)/` troca sua raiz `<main>` por
 * `<div>` para evitar landmark duplicado (Pitfall 5).
 */
export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="min-h-dvh flex-1 bg-white">{children}</main>
    </div>
  );
}
