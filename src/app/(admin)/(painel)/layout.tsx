import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout do grupo de rotas aninhado `(painel)` — isola a sidebar às páginas
 * autenticadas (Dashboard/Produtos/Configurações), sem afetar as páginas
 * públicas de auth que continuam vivendo direto sob `(admin)/` (Pitfall 4 de
 * 06-RESEARCH.md). Este é o ÚNICO `<main>` das páginas do painel — cada
 * página movida para dentro de `(painel)/` troca sua raiz `<main>` por
 * `<div>` para evitar landmark duplicado (Pitfall 5).
 *
 * Busca o nome da loja aqui (mesmo padrão de query já usado em
 * dashboard/produtos/configuracoes) só para exibir no rodapé da sidebar
 * (design system: bloco de conta com iniciais + nome da loja) — leitura
 * pura, nenhuma mutação nova.
 */
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let storeName: string | null = null;
  let storeSlug: string | null = null;
  if (userData.user) {
    const { data: store } = await supabase
      .from("stores")
      .select("name, slug")
      .eq("owner_id", userData.user.id)
      .single();
    storeName = store?.name ?? null;
    storeSlug = store?.slug ?? null;
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminSidebar storeName={storeName} storeSlug={storeSlug} />
      <main className="flex min-h-dvh flex-1 flex-col bg-gray-50">
        <AdminHeader storeName={storeName} />
        {children}
      </main>
    </div>
  );
}
