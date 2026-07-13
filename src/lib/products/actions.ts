"use server";

import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { parseBRLPrice } from "@/lib/currency/brl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type ProductActionResult = { error: string } | { success: true; id: string };

/**
 * Sequência "getUser() -> localizar loja por owner_id" — copiada verbatim de
 * src/lib/settings/actions.ts linhas 63-84 (03-PATTERNS.md §Owner-scoped
 * store lookup permite duplicar; extrair para módulo compartilhado é
 * opcional). Toda Server Action de produto começa por aqui, antes de
 * qualquer mutação no banco.
 */
async function getOwnedStore(): Promise<
  | { error: string }
  | { supabase: SupabaseClient<Database>; userId: string; storeId: string }
> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const { data: store, error: storeLookupError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userData.user.id)
    .single();

  if (storeLookupError || !store) {
    return { error: "Não foi possível localizar sua loja. Tente novamente." };
  }

  return { supabase, userId: userData.user.id, storeId: store.id };
}

/**
 * Cadastra um produto novo (PROD-01/PROD-02, D-08/D-09). Campos obrigatórios
 * são só nome/marca/preço — os demais (line/sole/category/fulfillment/
 * description) ficam `null` quando vazios, permitindo o rascunho rápido que
 * D-09 exige. `status` nasce `'draft'` por padrão (coluna `default 'draft'`
 * da migration 0003) — nenhum produto entra publicado.
 *
 * NÃO toca em `product_sizes`/`product_photos` aqui — essas são fatias
 * separadas (Plans 03-03/03-04).
 */
export async function saveProduct(formData: FormData): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    brandOther: formData.get("brandOther") ?? "",
    line: formData.get("line") ?? "",
    sole: formData.get("sole") ?? "",
    category: formData.get("category") ?? "",
    fulfillment: formData.get("fulfillment") || undefined,
    price: formData.get("price"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const isBrandOther = parsed.data.brand === "Outra";
  if (isBrandOther && !parsed.data.brandOther) {
    return { error: "Informe a marca quando selecionar \"Outra\"." };
  }

  const price = parseBRLPrice(parsed.data.price);
  if (price === null) {
    return { error: "Informe um preço válido, ex.: 199,90." };
  }

  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  const { data: product, error: insertError } = await owned.supabase
    .from("products")
    .insert({
      store_id: owned.storeId,
      name: parsed.data.name,
      brand: parsed.data.brand,
      brand_other: isBrandOther ? parsed.data.brandOther || null : null,
      line: parsed.data.line || null,
      sole: parsed.data.sole || null,
      category: parsed.data.category || null,
      fulfillment: parsed.data.fulfillment ?? null,
      price,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (insertError || !product) {
    return { error: "Não foi possível salvar o produto. Verifique sua conexão e tente novamente." };
  }

  return { success: true, id: product.id };
}
