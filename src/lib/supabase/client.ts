import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components (ex.: o listener
 * `onAuthStateChange` que monta a renovação silenciosa de sessão, Plan 03).
 *
 * Convenção do projeto: código server-side importa de `lib/supabase/server`,
 * código client-side importa daqui — nunca misturar os dois.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
