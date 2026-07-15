import Link from "next/link";

/**
 * 404 escopado à rota de detalhe do produto (PED-01/PED-02, D-01) — primeiro
 * `not-found.tsx` do projeto (sem analog direto no codebase). Cobre três
 * casos indistinguíveis por design (Pitfall 8, 05-RESEARCH.md): produto
 * inexistente, não publicado, ou oculto pela regra de esgotado — nenhum
 * deles deve vazar a existência real do produto via mensagem diferenciada.
 *
 * `not-found.tsx` não recebe `params` (convenção do App Router) — o `slug`
 * da loja não está disponível neste escopo, então o link de retorno aponta
 * para a raiz do site ("/"), não para `/loja/[slug]`. Limitação documentada
 * (05-04-PLAN.md Task 2): sem `useSelectedLayoutSegments`/reconstrução de
 * URL, o simples link genérico é preferido por não introduzir complexidade
 * extra para um caso de erro.
 */
export default function ProductNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-3 bg-white px-4 py-6 text-center">
      <h1 className="text-2xl font-bold text-[#111111]">Produto não encontrado</h1>
      <p className="text-[#6B6B6B]">Este produto não está mais disponível ou o link mudou.</p>
      <Link href="/" className="text-sm font-medium text-[#00C46A]">
        Voltar para a loja
      </Link>
    </main>
  );
}
