"use server";

import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { parseBRLPrice } from "@/lib/currency/brl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type ProductActionResult = { error: string } | { success: true; id: string };

/**
 * Assinaturas de magic bytes por content-type aceito para fotos de produto —
 * mesma checagem de src/lib/settings/actions.ts (`validateLogoFile`,
 * 03-PATTERNS.md §Magic-byte + size file validation), duplicada aqui pela
 * mesma razão documentada lá: `validateLogoFile` não é exportada e este
 * plano (03-04) não modifica src/lib/settings/actions.ts.
 */
const PHOTO_MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_PRODUCT = 5;

function photoExtension(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

/**
 * Mesma ordem de checagem de `validateLogoFile` (type -> size -> assinatura)
 * e mesmas mensagens do Copywriting Contract (03-UI-SPEC.md).
 */
async function validatePhotoFile(file: File): Promise<{ error: string } | null> {
  const signature = PHOTO_MAGIC_BYTES[file.type];
  if (!signature) {
    return { error: "Envie apenas fotos em JPG, PNG ou WEBP." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "Essa foto passou do limite de 5MB." };
  }
  const headerBytes = new Uint8Array(await file.slice(0, signature.length).arrayBuffer());
  const matchesSignature = signature.every((byte, index) => headerBytes[index] === byte);
  if (!matchesSignature) {
    return { error: "Envie apenas fotos em JPG, PNG ou WEBP." };
  }
  return null;
}

type OwnedStore = { supabase: SupabaseClient<Database>; userId: string; storeId: string };

/**
 * Núcleo compartilhado do pipeline de upload de fotos (03-RESEARCH.md
 * Pattern 2), usado tanto por `saveProduct` (fotos anexadas ao mesmo
 * FormData da criação) quanto por `addProductPhotos` (edição, Plan 03-05).
 * Recontagem server-side de existentes + novas ANTES de qualquer upload
 * (Pitfall 6 — nunca confiar só no limite de 5 aplicado na UI); todas as
 * fotos são validadas (magic bytes + 5MB) antes de qualquer upload, para
 * nunca deixar um upload parcial quando uma foto do lote é inválida.
 * `position` é sempre um índice sequencial contínuo às fotos já existentes
 * (posição 0 = capa, D-11); o path usa sempre um `crypto.randomUUID()`,
 * nunca o nome original do arquivo.
 */
async function uploadAndInsertPhotos(
  owned: OwnedStore,
  productId: string,
  photos: File[]
): Promise<{ error: string } | null> {
  if (photos.length === 0) {
    return null;
  }

  const { count: existingCount, error: countError } = await owned.supabase
    .from("product_photos")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countError) {
    return { error: "Não foi possível verificar as fotos existentes. Tente novamente." };
  }

  const startPosition = existingCount ?? 0;
  if (startPosition + photos.length > MAX_PHOTOS_PER_PRODUCT) {
    return { error: "Você já atingiu o limite de 5 fotos por produto." };
  }

  for (const photo of photos) {
    const validationError = await validatePhotoFile(photo);
    if (validationError) {
      return validationError;
    }
  }

  for (const [index, photo] of photos.entries()) {
    const path = `${owned.userId}/${productId}/${crypto.randomUUID()}.${photoExtension(photo.type)}`;
    const { error: uploadError } = await owned.supabase.storage
      .from("product-images")
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      return { error: "Não foi possível enviar uma das fotos. Tente novamente." };
    }

    const { error: insertError } = await owned.supabase.from("product_photos").insert({
      product_id: productId,
      storage_path: path,
      position: startPosition + index,
    });

    if (insertError) {
      return { error: "Não foi possível salvar uma das fotos. Tente novamente." };
    }
  }

  return null;
}

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

  // Fotos (D-11/D-12/D-13, PROD-03) são opcionais no cadastro (D-09) — o
  // product-form.tsx anexa cada File já comprimido no cliente sob o mesmo
  // campo "photos" (append em loop, nunca .set). Reusa o mesmo helper que
  // `addProductPhotos` (edição) chama, para nunca duplicar a lógica de
  // validação/recontagem (Task 2 do 03-04-PLAN.md).
  const photoFiles = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photoFiles.length > 0) {
    const photoError = await uploadAndInsertPhotos(owned, product.id, photoFiles);
    if (photoError) {
      return photoError;
    }
  }

  return { success: true, id: product.id };
}

/**
 * Adiciona fotos a um produto já existente (modo edição, Plan 03-05; também
 * reutilizável por qualquer fluxo que precise anexar fotos fora do momento
 * de criação). Compartilha a mesma validação/recontagem de `saveProduct`
 * via `uploadAndInsertPhotos` — nunca duas implementações divergentes do
 * mesmo pipeline (03-RESEARCH.md Pattern 2).
 */
export async function addProductPhotos(productId: string, formData: FormData): Promise<ProductActionResult> {
  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  const photoFiles = formData.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const photoError = await uploadAndInsertPhotos(owned, productId, photoFiles);
  if (photoError) {
    return photoError;
  }

  return { success: true, id: productId };
}

/**
 * Persiste a nova ordem de fotos após um drag-and-drop (D-12) — nunca
 * renomeia/move o blob no bucket, só atualiza a coluna `position`
 * (03-RESEARCH.md Pattern 2). Como `(product_id, position)` é UNIQUE
 * (0003_products_schema_rls.sql), a estratégia usada é duas fases: primeiro
 * move todas as fotos do lote para posições temporárias negativas (nunca
 * colidem com posições reais, que são sempre >= 0), depois aplica as
 * posições finais — evita violar a constraint UNIQUE no meio da operação.
 * RLS garante escopo por dono: um id de foto de outra loja simplesmente não
 * é afetado por nenhum dos updates (0 linhas, sem erro), nunca vazando nem
 * quebrando o pipeline (T-03-10, testado cross-tenant no 03-04-PLAN.md).
 */
export async function updatePhotoOrder(
  order: { id: string; position: number }[]
): Promise<ProductActionResult> {
  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  if (order.length === 0) {
    return { success: true, id: "" };
  }

  for (const [index, item] of order.entries()) {
    const { error } = await owned.supabase
      .from("product_photos")
      .update({ position: -(index + 1) })
      .eq("id", item.id);

    if (error) {
      return { error: "Não foi possível reordenar as fotos. Tente novamente." };
    }
  }

  for (const item of order) {
    const { error } = await owned.supabase
      .from("product_photos")
      .update({ position: item.position })
      .eq("id", item.id);

    if (error) {
      return { error: "Não foi possível reordenar as fotos. Tente novamente." };
    }
  }

  return { success: true, id: order[0].id };
}

/**
 * Remove uma única foto (D-13): esvazia só aquele slot, nunca mexe nas
 * outras fotos do produto. Limpeza do blob no Storage é best-effort (o
 * `DELETE` da linha é a fonte de verdade, mesma disciplina de
 * `deleteProductPhotosStorage` abaixo) — se o storage_path não puder ser
 * lido (RLS bloqueia cross-tenant, ou linha já não existe), retorna erro
 * sem apagar nada, nunca prossegue "às cegas".
 */
export async function removePhoto(photoId: string): Promise<ProductActionResult> {
  const owned = await getOwnedStore();
  if ("error" in owned) {
    return { error: owned.error };
  }

  const { data: photo, error: fetchError } = await owned.supabase
    .from("product_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (fetchError || !photo) {
    return { error: "Não foi possível encontrar essa foto. Tente novamente." };
  }

  await owned.supabase.storage.from("product-images").remove([photo.storage_path]);

  const { error: deleteError } = await owned.supabase.from("product_photos").delete().eq("id", photoId);
  if (deleteError) {
    return { error: "Não foi possível remover a foto. Tente novamente." };
  }

  return { success: true, id: photoId };
}

/**
 * Helper reutilizável pelo Plan 03-05 (exclusão de produto) — Storage é um
 * sistema separado do Postgres, então `on delete cascade` limpa as LINHAS de
 * `product_photos` mas nunca os blobs no bucket (03-RESEARCH.md Pitfall 1).
 * Buscar todos os `storage_path` do produto e remover em lote ANTES (ou
 * depois, best-effort) do `DELETE FROM products` evita arquivos órfãos.
 * Recebe o `supabase` já autenticado do chamador (nunca cria um client novo)
 * para reusar a mesma sessão/RLS do Server Action de exclusão.
 */
export async function deleteProductPhotosStorage(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<void> {
  const { data: photos } = await supabase.from("product_photos").select("storage_path").eq("product_id", productId);

  if (photos && photos.length > 0) {
    await supabase.storage.from("product-images").remove(photos.map((photo) => photo.storage_path));
  }
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
