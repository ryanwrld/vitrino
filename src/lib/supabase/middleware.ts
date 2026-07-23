import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSupabaseCredentials } from "@/lib/supabase/env";

/**
 * Helper de refresh de sessão usado por `src/middleware.ts`. Cria um
 * server client ligado aos cookies do request/response e chama `getUser()`
 * a cada requisição para forçar a revalidação/renovação do token — nunca
 * `getSession()` sozinho para decisão de gate (ver 01-RESEARCH.md, Padrão 1
 * e Antipadrões a Evitar).
 *
 * Importante: nenhum código deve rodar entre `createServerClient` e
 * `getUser()` — qualquer lógica extra ali pode fazer o refresh de token
 * falhar silenciosamente para o usuário.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = resolveSupabaseCredentials();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
