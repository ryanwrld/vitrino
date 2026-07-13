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

  // Tamanhos escolhidos (D-01) chegam como JSON string num único campo
  // "sizes" (convenção documentada em productSchema.ts e usada por
  // product-form.tsx no onSubmit) — revalidados aqui mesmo formato
  // (size inteiro 36-45, available boolean, T-03-08) antes de qualquer
  // insert em `products`/`product_sizes`.
  const sizesRaw = formData.get("sizes");
  let sizesInput: unknown = [];
  if (typeof sizesRaw === "string" && sizesRaw.trim().length > 0) {
    try {
      sizesInput = JSON.parse(sizesRaw);
    } catch {
      return { error: "Dados de tamanhos inválidos." };
    }
  }

  const sizesParsed = productSchema.shape.sizes.safeParse(sizesInput);
  if (!sizesParsed.success) {
    return { error: "Dados de tamanhos inválidos." };
  }
  const sizes = sizesParsed.data ?? [];

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

  // Só as linhas escolhidas (nunca a grade inteira) — um produto sem
  // nenhum tamanho marcado fica sem linhas em `product_sizes` (rascunho,
  // D-10 — a Fase 4 deriva "esgotado" via EXISTS falso).
  if (sizes.length > 0) {
    const { error: sizesInsertError } = await owned.supabase.from("product_sizes").insert(
      sizes.map((item) => ({
        product_id: product.id,
        size: item.size,
        available: item.available,
      }))
    );

    if (sizesInsertError) {
      return { error: "Não foi possível salvar os tamanhos do produto. Tente novamente." };
    }
  }

  return { success: true, id: product.id };
}

/**
 * Atalho "Marcar produto inteiro como esgotado" (D-04). Resolução de
 * ambiguidade documentada em 03-RESEARCH.md: um único UPDATE em lote sobre
 * `product_sizes`, sem coluna extra de disponibilidade agregada em
 * `products`. A policy RLS de `product_sizes` (subquery
 * product_id -> products -> stores.owner_id) garante que só afeta linhas de
 * produtos da própria loja — chamado num produto de outra loja atualiza 0
 * linhas, sem erro (T-03-09, testado em tests/products/availability.test.ts).
 */
export async function markProductEsgotado(productId: string): Promise<ProductActionResult> {
  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  const { error } = await owned.supabase
    .from("product_sizes")
    .update({ available: false })
    .eq("product_id", productId);

  if (error) {
    return { error: "Não foi possível marcar o produto como esgotado. Tente novamente." };
  }

  return { success: true, id: productId };
}
