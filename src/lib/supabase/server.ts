import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveSupabaseCredentials } from "@/lib/supabase/env";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Lê/escreve a sessão via cookies httpOnly geridos pelo Next.js.
 *
 * Nunca usar `getSession()` sozinho para decisões de gate (middleware/guard
 * de rota) — sempre `getUser()`, que revalida o token contra o servidor
 * Supabase (ver 01-RESEARCH.md, Padrão 1).
 *
 * Credenciais resolvidas via `resolveSupabaseCredentials()` — NUNCA
 * `process.env.NEXT_PUBLIC_SUPABASE_URL` direto aqui: sob teste (Vitest),
 * isso apontava silenciosamente para produção (ver comentário do módulo).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = resolveSupabaseCredentials();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component — pode ser ignorado com
            // segurança porque middleware.ts já renova a sessão via
            // updateSession() em toda request.
          }
        },
      },
    }
  );
}
