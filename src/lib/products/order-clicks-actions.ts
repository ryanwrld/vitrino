"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action PÚBLICA/ANÔNIMA — arquivo deliberadamente SEPARADO de
 * src/lib/products/actions.ts (owner-scoped, autenticado), mesma disciplina
 * de src/lib/products/public-actions.ts (04). NUNCA importar/chamar
 * getOwnedStore() neste arquivo.
 *
 * `logOrderClick` registra o clique em "Pedir agora" (T-05-09/T-05-10) de
 * forma fire-and-forget (D-10): try/catch que só loga via console.error,
 * NUNCA lança — quem chama (product-order-panel.tsx) dispara isto dentro de
 * um startTransition sem nunca esperar o resultado, e a navegação nativa do
 * `<a href>` ao wa.me nunca é atrasada por esta chamada.
 *
 * Insert BARE (sem `.select()`/`.single()`) — o papel `anon` não tem
 * nenhuma policy de leitura em `order_clicks` (05-01, Pitfall 2); encadear
 * `.select()` faria um insert bem-sucedido parecer uma falha (o SELECT
 * pós-insert retornaria vazio/erro mesmo com a linha gravada). Só o `error`
 * do insert é inspecionado.
 */
export async function logOrderClick(storeId: string, productId: string, size: number): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("order_clicks").insert({ store_id: storeId, product_id: productId, size });

    if (error) {
      console.error("logOrderClick: insert falhou", error);
    }
  } catch (err) {
    console.error("logOrderClick: erro inesperado", err);
  }
}
