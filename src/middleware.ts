import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Único ponto de entrada de middleware do projeto. Escopo estritamente
 * limitado a `/admin/:path*` — NUNCA um matcher catch-all com allowlist
 * interna (Antipadrão #1 do 01-RESEARCH.md; CVE-2025-29927 é o precedente).
 *
 * A rota pública `/loja/[slug]` (e qualquer outra fora de `/admin`) deve
 * ser inalcançável por este middleware por construção, não por exceção.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/admin/:path*'],
};
