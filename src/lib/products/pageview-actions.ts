"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action PÚBLICA/ANÔNIMA — arquivo deliberadamente SEPARADO de
 * src/lib/products/actions.ts (owner-scoped, autenticado), mesma disciplina
 * de order-clicks-actions.ts (05) e public-actions.ts (04). NUNCA importar/
 * chamar getOwnedStore() neste arquivo.
 *
 * `logPageview` registra um acesso à vitrine pública (grid = product_id
 * null, detalhe = product_id) de forma fire-and-forget: try/catch que só
 * loga via console.error, NUNCA lança — quem chama (pageview-tracker.tsx)
 * dispara isto dentro de um startTransition sem nunca esperar o resultado,
 * e a navegação nunca é atrasada por esta chamada.
 *
 * Insert BARE (sem encadear select ou single) — o papel `anon` não tem
 * nenhuma policy de leitura em `pageviews` (mesmo Pitfall 2 de
 * 05-RESEARCH.md); encadear uma leitura pós-insert faria um insert
 * bem-sucedido parecer uma falha. Só o `error` do insert é inspecionado.
 */
export async function logPageview(storeId: string, productId: string | null): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("pageviews").insert({ store_id: storeId, product_id: productId });

    if (error) {
      console.error("logPageview: insert falhou", error);
    }
  } catch (err) {
    console.error("logPageview: erro inesperado", err);
  }
}
