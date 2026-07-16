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
        <h1 className="text-2xl font-bold text-black">Novo produto</h1>
      </div>

      <ProductForm />

      <Link
        href="/produtos"
        className="rounded-lg border border-black px-4 py-2 text-center font-medium text-black transition hover:bg-black hover:text-white"
      >
        Voltar
      </Link>
    </div>
  );
}
