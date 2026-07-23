/**
 * Resolve as credenciais Supabase a usar, com uma blindagem crítica: sob
 * `NODE_ENV === "test"` (setado automaticamente pelo Vitest em toda
 * `vitest run`), NUNCA usar `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`
 * (produção) — mesmo que só existam essas.
 *
 * Achado real (auditoria do dashboard, 2026-07-23): qualquer teste de
 * integração que chame uma Server Action de verdade (`signUpAction`,
 * `saveOnboarding`, etc. — não só os que usam `createAnonClient()` de
 * `tests/setup/supabase-test.ts`) acaba passando por `createClient()` deste
 * módulo, que até aqui SEMPRE lia `NEXT_PUBLIC_SUPABASE_URL` hardcoded — ou
 * seja, gravava contas/lojas de teste reais em PRODUÇÃO a cada `vitest run`,
 * apesar de `TEST_SUPABASE_URL` existir e estar corretamente configurado
 * como projeto isolado. A tabela `stores` de produção acumulou centenas de
 * linhas `vitrino.onboarding.*`/`vitrino.signout.*` por causa disso.
 *
 * A defesa aqui espelha a mesma postura de `tests/setup/supabase-test.ts`:
 * sob teste, exige `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` e falha alto
 * e cedo se estiverem ausentes — nunca cai de volta em produção em
 * silêncio.
 */
export function resolveSupabaseCredentials(): { url: string; anonKey: string } {
  if (process.env.NODE_ENV === "test") {
    const url = process.env.TEST_SUPABASE_URL;
    const anonKey = process.env.TEST_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "NODE_ENV=test mas TEST_SUPABASE_URL/TEST_SUPABASE_ANON_KEY ausentes — " +
          "criar o cliente Supabase real (@/lib/supabase/server) sob teste NUNCA cai de volta " +
          "em NEXT_PUBLIC_SUPABASE_URL (produção). Configure .env.local com o projeto de teste."
      );
    }

    return { url, anonKey };
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
