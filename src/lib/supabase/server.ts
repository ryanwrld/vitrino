import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Lê/escreve a sessão via cookies httpOnly geridos pelo Next.js.
 *
 * Nunca usar `getSession()` sozinho para decisões de gate (middleware/guard
 * de rota) — sempre `getUser()`, que revalida o token contra o servidor
 * Supabase (ver 01-RESEARCH.md, Padrão 1).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
