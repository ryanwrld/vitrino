"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

export type AuthActionResult = { error: string } | void;

/**
 * Gera um slug único para a loja a partir do local-part do email do
 * revendedor + sufixo aleatório curto, normalizado para lowercase
 * (Alternativa Considerada no 01-RESEARCH.md: lowercase no save em vez de
 * `citext`). A UI de customização de slug chega na Fase 2 — aqui só
 * garantimos um valor único desde o cadastro (constraint UNIQUE já existe
 * na migration do Plan 02).
 */
function generateStoreSlug(email: string): string {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "loja";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Cadastro (AUTH-01): cria o usuário no Supabase Auth (D-01 — acesso
 * imediato, sem verificação de email), grava a linha `stores` (slug único
 * auto-gerado) e a linha `store_settings` (onboarding_completed_at NULL),
 * e redireciona para o wizard de onboarding (D-04) — nunca direto para o
 * Dashboard.
 */
export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? "Não foi possível criar a conta. Tente novamente." };
  }

  const slug = generateStoreSlug(parsed.data.email);
  const storeName = parsed.data.email.split("@")[0];

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({ owner_id: signUpData.user.id, name: storeName, slug })
    .select("id")
    .single();

  if (storeError || !store) {
    return { error: "Conta criada, mas não foi possível preparar sua loja. Tente novamente." };
  }

  const { error: settingsError } = await supabase
    .from("store_settings")
    .insert({ store_id: store.id, onboarding_completed_at: null });

  if (settingsError) {
    return { error: "Conta criada, mas não foi possível concluir a configuração inicial. Tente novamente." };
  }

  redirect("/onboarding");
}

/**
 * Login (AUTH-02). Mensagem de erro genérica em qualquer falha — nunca
 * enumerar se o email existe ou não (mitiga Information Disclosure, ver
 * threat_model T-01-08 do plano).
 */
export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: 'Email ou senha inválidos' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: 'Email ou senha inválidos' };
  }

  redirect("/dashboard"); // guard de onboarding decide se o revendedor realmente chega lá
}

/**
 * Logout (AUTH-03), disponível a partir de qualquer página do painel
 * (botão no dashboard nesta fase; layout compartilhado nas próximas).
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
