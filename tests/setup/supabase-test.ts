import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import type { Database } from "@/lib/database.types";

/**
 * Carrega variáveis de `.env.local` (raiz do projeto) para `process.env` caso
 * ainda não estejam definidas. O Next.js faz isso automaticamente para
 * `next dev`/`next build`, mas o Vitest roda fora desse pipeline — sem isso,
 * `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` ficariam vazias
 * ao rodar `npx vitest run` diretamente.
 */
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. " +
      "Configure .env.local com as credenciais do projeto Supabase antes de rodar os testes de RLS."
  );
}

export type TestClient = SupabaseClient<Database>;

/**
 * Client Supabase anônimo (sem sessão) — usa apenas a anon key pública, nunca
 * a service_role. Útil para operações que não exigem autenticação.
 */
export function createAnonClient(): TestClient {
  return createSupabaseClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
}

export interface SeededAccount {
  /** Client Supabase autenticado como este usuário (anon key + sessão real). */
  client: TestClient;
  userId: string;
  email: string;
}

/**
 * Cadastra (`signUp`) e autentica (`signInWithPassword`) uma conta real de
 * teste — NUNCA via service_role ou SQL Editor (Padrão 4 do 01-RESEARCH.md:
 * "confirmar via chamadas diretas de API, cliente Supabase autenticado como
 * cada usuário, não apenas via UI"). O client retornado deve ser usado para
 * toda escrita subsequente em `stores`/`store_settings`, para que os dados
 * sejam gravados através das policies RLS reais (nunca via bypass admin).
 */
export async function seedAuthenticatedAccount(labelForEmail: string): Promise<SeededAccount> {
  const client = createSupabaseClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  const uniqueSuffix = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const email = `vitrino.rls.${labelForEmail}.${uniqueSuffix}@gmail.com`;
  const password = "TesteIsolamentoRLS123!";

  const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
  if (signUpError) {
    throw new Error(`Falha ao cadastrar conta de teste (${labelForEmail}): ${signUpError.message}`);
  }

  let userId = signUpData.user?.id;
  let session = signUpData.session;

  if (!session) {
    // Alguns projetos Supabase exigem confirmação de email antes de emitir
    // sessão já no signUp. Tentamos signInWithPassword em seguida — só
    // funciona se "Confirm email" estiver desabilitado no projeto (D-01 do
    // 01-RESEARCH.md: cadastro dá acesso imediato, sem verificação de email).
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.session) {
      throw new Error(
        `Não foi possível autenticar a conta de teste (${labelForEmail}) após o cadastro. ` +
          'Isso normalmente indica que "Confirm email" está habilitado no projeto Supabase — ' +
          "desabilite em Authentication > Providers > Email (ou rode `supabase config push` " +
          "após `supabase login`, já que supabase/config.toml já declara enable_confirmations = false) " +
          `para rodar este teste, conforme D-01. Erro original: ${signInError?.message ?? "sessão ausente após signIn"}`
      );
    }
    session = signInData.session;
    userId = signInData.user?.id ?? userId;
  }

  if (!userId) {
    throw new Error(`Cadastro da conta de teste (${labelForEmail}) não retornou um user id.`);
  }

  return { client, userId, email };
}
