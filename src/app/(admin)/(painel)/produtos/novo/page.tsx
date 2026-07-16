import Link from "next/link";
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { ProductForm } from "../product-form";

/**
 * Rota `/produtos/novo` — formulário de cadastro (D-08, tela única). Mesmo
 * gate combinado de auth + onboarding que `/dashboard`/`/configuracoes`
 * (`requireCompletedOnboarding` como primeira linha).
 */
export default async function NovoProdutoPage() {
  await requireCompletedOnboarding();

  return (
    <div className="bg-white mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Novo produto</h1>
      </div>

      <ProductForm />

      <Link
        href="/produtos"
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-900 transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      >
        Voltar
      </Link>
    </div>
  );
}
