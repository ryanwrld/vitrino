import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Dashboard mínimo desta fase — só existe para provar que:
 * (a) é inalcançável sem sessão válida e sem onboarding completo
 *     (`requireCompletedOnboarding` — gate combinado por composição
 *     sequencial de auth + dados, nunca por uma condição fundida);
 * (b) o logout (AUTH-03) está acessível a partir do painel.
 * Métricas reais e conteúdo completo chegam na Fase 6.
 */
export default async function DashboardPage() {
  await requireCompletedOnboarding();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-[#0D3D2B]">Bem-vindo(a) de volta!</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">Sua vitrine está pronta para receber pedidos.</p>
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg border border-[#0D3D2B] px-4 py-2 font-medium text-[#0D3D2B] transition hover:bg-[#0D3D2B] hover:text-white"
        >
          Sair da conta
        </button>
      </form>
    </main>
  );
}
