import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

/**
 * Guard de auth explícito e direto (`getUser()`), SEM reaproveitar
 * `requireCompletedOnboarding` — chamar esse guard aqui criaria um loop de
 * redirect (`/onboarding` → `/onboarding`), conforme a Deviation #1 do
 * `01-03-SUMMARY.md`, documentada especificamente para esta página: "a
 * página /onboarding que o Plan 05 vai criar também precisa chamar seu
 * próprio guard de auth no topo (ex.: reaproveitando getUser() diretamente)".
 *
 * `(admin)/layout.tsx` monta `<SessionWatcher />` para todo o grupo mas NÃO
 * redireciona globalmente (ver mesma Deviation) — cada página protegida é
 * responsável pelo seu próprio gate.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return <OnboardingWizard />;
}
