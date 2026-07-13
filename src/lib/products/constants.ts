/**
 * Listas fixas usadas pelo formulário de produto (03-UI-SPEC.md §Fixed
 * lists). Marca/solado/categoria/modalidade NÃO têm check constraint no
 * banco (Plan 03-01) — validação de enumeração vive só aqui + em
 * `productSchema`, evitando migration de correção se a lista mudar.
 */

/** Marca (D-05): lista fixa + "Outra" (texto livre via campo brandOther). */
export const BRANDS = [
  "Nike",
  "Adidas",
  "Puma",
  "Mizuno",
  "Under Armour",
  "New Balance",
  "Umbro",
  "Outra",
] as const;

/** Solado (D-07): códigos padrão da indústria. */
export const SOLES = ["FG", "AG", "TF", "IC", "MG", "SG"] as const;

/** Categoria (RESEARCH Open Question 1, adotada em 03-UI-SPEC.md). */
export const CATEGORIES = ["Chuteira", "Tênis", "Chinelo", "Outro"] as const;

/** Modalidade (sob encomenda / pronta entrega / ambos). */
export const FULFILLMENTS = [
  { value: "sob_encomenda", label: "Sob encomenda" },
  { value: "pronta_entrega", label: "Pronta entrega" },
  { value: "ambos", label: "Ambos" },
] as const;

/**
 * Pré-seleção padrão de tamanhos ao cadastrar um produto novo (D-02):
 * a faixa mais comum, marcada como esgotado por padrão (D-03). O grid
 * completo (D-01) continua 36-45 — usado pelo Plan 03-03 para permitir
 * marcar manualmente 36/44/45.
 */
export const DEFAULT_SIZE_RANGE = [37, 38, 39, 40, 41, 42, 43] as const;

/** Grid completo de tamanhos disponíveis (36-45), usado pelo Plan 03-03. */
export const SIZE_GRID = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] as const;
