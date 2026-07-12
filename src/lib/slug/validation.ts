import { z } from "zod";

/**
 * Schema de validação de formato de slug (D-02, LOJA-02). Segue a convenção
 * de `src/lib/validation/onboarding.ts`: regex nomeada + `.trim()` + mensagem
 * em português + tipo inferido exportado. Revalidado sempre no servidor
 * (Server Action), nunca só no client — mesma disciplina do restante do
 * projeto.
 *
 * O texto de erro de charset ("Use apenas letras, números e hífens (3 a 30
 * caracteres).") é o contrato de copy exato do 02-UI-SPEC.md — não parafrasear.
 */
const SLUG_CHARSET_REGEX = /^[a-z0-9-]+$/;

export const slugSchema = z
  .string()
  .trim()
  .min(3, "O link precisa ter entre 3 e 30 caracteres")
  .max(30, "O link precisa ter entre 3 e 30 caracteres")
  .regex(SLUG_CHARSET_REGEX, "Use apenas letras, números e hífens (3 a 30 caracteres).")
  .refine(
    (value) => !value.startsWith("-") && !value.endsWith("-"),
    "O link não pode começar ou terminar com hífen"
  );

export type SlugInput = z.infer<typeof slugSchema>;
