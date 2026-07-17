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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:py-10">
      <div>
        <Link href="/produtos" className="text-sm text-gray-500 transition-colors duration-150 hover:text-gray-900">
          ← Voltar
        </Link>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-gray-900">Novo produto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os detalhes — o produto aparece na vitrine assim que for publicado.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
