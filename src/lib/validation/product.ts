import { z } from "zod";

/**
 * Schema de validação do cadastro/edição de produto (PROD-01/PROD-02,
 * D-05..D-09). Revalidado SEMPRE dentro do Server Action `saveProduct`
 * (nunca confiar só no client) — ver 03-PATTERNS.md §Validation convention,
 * mesmo espírito de `onboardingSchema`.
 *
 * `price` fica como string bruta (min 1) — o parsing decimal acontece no
 * servidor via `parseBRLPrice` (03-RESEARCH.md Pitfall 3), nunca
 * `z.number()` sobre um input com vírgula decimal.
 */
export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do modelo"),
  brand: z.string().trim().min(1, "Selecione a marca"),
  brandOther: z.string().trim().optional(),
  line: z.string().trim().optional(),
  sole: z.string().trim().optional(),
  category: z.string().trim().optional(),
  fulfillment: z.enum(["sob_encomenda", "pronta_entrega", "ambos"]).optional(),
  price: z.string().trim().min(1, "Informe o preço"),
  description: z.string().trim().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
