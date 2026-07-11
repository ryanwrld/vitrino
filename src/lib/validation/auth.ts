import { z } from "zod";

/**
 * Schemas de validação de auth. Revalidados SEMPRE dentro do Server Action
 * (nunca confiar só no client) — ver 01-PATTERNS.md §Validation convention.
 */
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Informe seu email")
    .email("Email inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Informe seu email")
    .email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
