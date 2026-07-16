import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Eye, ImageOff, MessageCircle, Package, XCircle } from "lucide-react";
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { createClient } from "@/lib/supabase/server";
import { queryProducts } from "@/lib/products/list";
import { queryAccessCount, queryTopOrderClickProducts, queryTopViewedProducts } from "@/lib/dashboard/metrics";
import { formatBRLPrice } from "@/lib/currency/brl";

/**
 * Dashboard (MTR-01, MTR-02, 06-03-PLAN.md Task 3, D-04 — única página).
 * Server Component totalmente dinâmico (sem `"use cache"`) — mesma
 * disciplina de `/produtos`, para que produtos/métricas recém-alterados
 * apareçam imediatamente.
 *
 * Todos os números são totais desde sempre (all-time, D-03, sem janela de
 * tempo). Total/disponível/esgotado/recentes vêm de UMA chamada a
 * `queryProducts(supabase, store.id, {})` (RESEARCH.md "Don't Hand-Roll" —
 * zero SQL nova para isso); acessos e as duas listas Top-10 vêm de
 * `@/lib/dashboard/metrics` (views `product_pageview_counts`/
 * `product_order_click_counts`, migration 0006).
 *
 * "Mais visualizados" e "Cliques no WhatsApp" são SEMPRE duas listas
 * paralelas e independentes (D-08/D-09) — nunca fundidas num único número.
 *
 * Raiz é um `<div>` (não elemento `main`) — o único landmark `main` do
 * painel vive em `(painel)/layout.tsx` desde o Plan 06-04, que também
 * repontou `tests/ui/dark-mode-contrast.test.ts` para essa entrada.
 */
export default async function DashboardPage() {
  await requireCompletedOnboarding();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userData.user!.id)
    .single();

  if (!store) {
    redirect("/onboarding");
  }

  const [produtos, acessos, maisVisualizados, cliquesWhatsapp] = await Promise.all([
    queryProducts(supabase, store.id, {}),
    queryAccessCount(supabase, store.id),
    queryTopViewedProducts(supabase, store.id),
    queryTopOrderClickProducts(supabase, store.id),
  ]);

  const totalProdutos = produtos.length;
  const disponiveis = produtos.filter((product) => product.disponivel).length;
  const esgotados = totalProdutos - disponiveis;

  // queryProducts já ordena por created_at desc por padrão (sort="recente") —
  // os 5 primeiros são sempre os 5 mais recentes.
  const recentes = produtos.slice(0, 5).map((product) => ({
    ...product,
    coverUrl: product.coverPath
      ? supabase.storage.from("product-images").getPublicUrl(product.coverPath).data.publicUrl
      : null,
  }));

  const statCards = [
    { label: "Total de produtos", value: totalProdutos, Icon: Package },
    { label: "Disponíveis", value: disponiveis, Icon: CheckCircle2 },
    { label: "Esgotados", value: esgotados, Icon: XCircle },
    { label: "Acessos", value: acessos, Icon: Eye },
  ];

  return (
    <div className="bg-white mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral da sua vitrine.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1.5 rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-1.5">
              <card.Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <span className="font-display text-3xl font-extrabold text-gray-900">{card.value}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="font-display font-bold text-gray-900">Produtos recentes</h2>
        {recentes.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {recentes.map((product) => {
              const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
              const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

              return (
                <li key={product.id}>
                  <Link
                    href={`/produtos/${product.id}/editar`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {product.coverUrl ? (
                        <Image src={product.coverUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-6 w-6 text-gray-400" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-display font-medium text-gray-900">{product.name}</span>
                      {secondaryLine && <span className="truncate text-xs text-gray-500">{secondaryLine}</span>}
                      <span
                        className={`flex items-center gap-1 text-xs transition-colors duration-150 ${
                          product.disponivel ? "text-success-fg" : "text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${product.disponivel ? "bg-success-solid" : "bg-gray-400"}`}
                          aria-hidden="true"
                        />
                        {product.disponivel ? "Disponível" : "Esgotado"}
                      </span>
                    </div>

                    <span className="shrink-0 text-sm font-medium text-gray-900">{formatBRLPrice(product.price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-gray-900">Nenhum produto cadastrado ainda</span>
              <span className="text-sm text-gray-500">
                Cadastre seu primeiro produto para começar a vender pelo WhatsApp.
              </span>
            </div>
            <Link
              href="/produtos/novo"
              className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover active:bg-primary-active active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Novo produto
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-display font-bold text-gray-900">Mais visualizados</h2>
          {maisVisualizados.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {maisVisualizados.map((item, index) => (
                <li key={item.productId}>
                  <Link
                    href={`/produtos/${item.productId}/editar`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <span className="w-5 text-sm font-medium text-gray-500">{index + 1}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-display text-base text-gray-900">{item.name}</span>
                      {item.secondary && <span className="truncate text-xs text-gray-500">{item.secondary}</span>}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-gray-500">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {item.views}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
              <span className="font-medium text-gray-900">Ainda sem visualizações</span>
              <span className="text-sm text-gray-500">
                Assim que sua vitrine receber acessos, os produtos mais vistos aparecem aqui.
              </span>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-display font-bold text-gray-900">Cliques no WhatsApp</h2>
          {cliquesWhatsapp.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {cliquesWhatsapp.map((item, index) => (
                <li key={item.productId}>
                  <Link
                    href={`/produtos/${item.productId}/editar`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <span className="w-5 text-sm font-medium text-gray-500">{index + 1}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-display text-base text-gray-900">{item.name}</span>
                      {item.secondary && <span className="truncate text-xs text-gray-500">{item.secondary}</span>}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-gray-500">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      {item.clicks}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
              <span className="font-medium text-gray-900">Ainda sem cliques</span>
              <span className="text-sm text-gray-500">
                Assim que clientes clicarem em &quot;Pedir agora&quot;, os produtos mais pedidos aparecem aqui.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
