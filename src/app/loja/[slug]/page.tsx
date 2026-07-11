/**
 * Placeholder público da vitrine — Server Component sem NENHUMA checagem de
 * auth. Esta rota prova, por construção, que a vitrine pública (Fase 4)
 * nunca é bloqueada por login (restrição rígida do PROJECT.md, SC-7).
 *
 * Não adicionar aqui nenhum client Supabase autenticado nem revalidação de
 * sessão — isolamento garantido pelo matcher estreito do middleware
 * (`/admin/:path*`), não por uma checagem em runtime nesta página.
 */
type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LojaPublicaPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">Vitrine: {slug}</h1>
      <p className="text-sm text-gray-500">
        Placeholder público — sem autenticação (Fase 1). O catálogo completo
        chega na Fase 4.
      </p>
    </main>
  );
}
