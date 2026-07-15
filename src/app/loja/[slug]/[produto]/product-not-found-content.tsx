import Link from "next/link";

/**
 * Conteúdo do 404 escopado à rota de detalhe do produto (PED-01/PED-02,
 * D-01), extraído de `not-found.tsx` pra ser reusado também dentro de
 * `page.tsx` — que TEM `slug` em escopo (`not-found.tsx` de segmento não
 * recebe `params`, então nunca consegue linkar de volta pra loja certa;
 * ver `05-VERIFICATION.md` gap #10). `page.tsx` renderiza este componente
 * diretamente (em vez de `notFound()`) quando a loja existe mas o produto
 * não é visível, passando `backHref={/loja/${slug}}`. O `not-found.tsx` de
 * segmento continua existindo como fallback genérico (`backHref="/"`) só
 * para o caso em que a própria loja não existe pelo slug da URL.
 */
export function ProductNotFoundContent({ backHref }: { backHref: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-3 bg-white px-4 py-6 text-center">
      <h1 className="text-2xl font-bold text-[#111111]">Produto não encontrado</h1>
      <p className="text-[#6B6B6B]">Este produto não está mais disponível ou o link mudou.</p>
      <Link href={backHref} className="text-sm font-medium text-[#00C46A]">
        Voltar para a loja
      </Link>
    </main>
  );
}
