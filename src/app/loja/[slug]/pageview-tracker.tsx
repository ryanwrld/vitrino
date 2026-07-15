"use client";

import { startTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { logPageview } from "@/lib/products/pageview-actions";

/**
 * Tracker invisível montado uma única vez por `layout.tsx` da vitrine
 * (nunca em `page.tsx` — `page.tsx` recebe `searchParams` e remontaria a
 * cada troca de filtro, violando D-02). Mesmo formato de `SessionWatcher`
 * (`useEffect` + `return null`), mas reagindo a `usePathname()` em vez de
 * `onAuthStateChange`.
 *
 * A dependência do efeito é deliberadamente `pathname`, NUNCA
 * `searchParams` — `usePathname()` exclui a query string por definição, o
 * que garante que trocar um filtro/termo de busca (mesma pathname, query
 * diferente) não dispara um novo pageview (D-02). Só uma navegação real
 * (grid → detalhe, ou detalhe de um produto → outro) muda `pathname`.
 *
 * Disparo em `useEffect` (client-side), nunca no corpo de um Server
 * Component: crawlers de unfurling (WhatsApp/Facebook) fazem GET real na
 * página para gerar o preview de Open Graph, mas não executam JavaScript
 * do cliente — nunca chegam a montar este componente, então nunca inflam
 * a contagem (Pitfall 2 do 06-RESEARCH.md).
 */
export function PageviewTracker({ storeId }: { storeId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // pathname: "/loja/{slug}" (grid, D-01, product_id null) ou
    // "/loja/{slug}/{produto}" (detalhe, product_id presente).
    const segments = pathname.split("/").filter(Boolean); // ["loja", slug, produto?]
    const productId = segments.length >= 3 ? segments[2] : null;

    startTransition(() => {
      logPageview(storeId, productId).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
