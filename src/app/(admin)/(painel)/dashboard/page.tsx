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
    { label: "Total de produtos", value: totalProdutos, Icon: Package, iconClass: "text-black", numberClass: "text-ink" },
    { label: "Disponíveis", value: disponiveis, Icon: CheckCircle2, iconClass: "text-brand", numberClass: "text-brand" },
    { label: "Esgotados", value: esgotados, Icon: XCircle, iconClass: "text-muted", numberClass: "text-muted" },
    { label: "Acessos", value: acessos, Icon: Eye, iconClass: "text-black", numberClass: "text-ink" },
  ];

  return (
    <div className="bg-white mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-bold text-black">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1 rounded-lg border border-surface bg-white p-4">
            <div className="flex items-center gap-1">
              <card.Icon className={`h-5 w-5 ${card.iconClass}`} aria-hidden="true" />
              <span className="text-sm font-medium text-muted">{card.label}</span>
            </div>
            <span className={`text-3xl font-bold ${card.numberClass}`}>{card.value}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium text-ink">Produtos recentes</h2>
        {recentes.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {recentes.map((product) => {
              const brandLabel = product.brand === "Outra" && product.brand_other ? product.brand_other : product.brand;
              const secondaryLine = [brandLabel, product.line].filter(Boolean).join(" · ");

              return (
                <li key={product.id}>
                  <Link
                    href={`/produtos/${product.id}/editar`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-surface bg-white p-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {product.coverUrl ? (
                        <Image src={product.coverUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-6 w-6 text-muted" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium text-ink">{product.name}</span>
                      {secondaryLine && <span className="truncate text-xs text-muted">{secondaryLine}</span>}
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          product.disponivel ? "text-brand" : "text-muted"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${product.disponivel ? "bg-brand" : "bg-muted"}`}
                          aria-hidden="true"
                        />
                        {product.disponivel ? "Disponível" : "Esgotado"}
                      </span>
                    </div>

                    <span className="shrink-0 text-sm font-medium text-ink">{formatBRLPrice(product.price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-surface px-4 py-8 text-center">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-ink">Nenhum produto cadastrado ainda</span>
              <span className="text-sm text-muted">
                Cadastre seu primeiro produto para começar a vender pelo WhatsApp.
              </span>
            </div>
            <Link
              href="/produtos/novo"
              className="rounded-lg bg-brand px-4 py-2 text-center font-medium text-white transition"
            >
              Novo produto
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium text-ink">Mais visualizados</h2>
        {maisVisualizados.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {maisVisualizados.map((item, index) => (
              <li key={item.productId}>
                <Link
                  href={`/produtos/${item.productId}/editar`}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-surface bg-white p-3"
                >
                  <span className="w-5 text-sm font-medium text-muted">{index + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base text-ink">{item.name}</span>
                    {item.secondary && <span className="truncate text-xs text-muted">{item.secondary}</span>}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    {item.views}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-surface px-4 py-8 text-center">
            <span className="font-medium text-ink">Ainda sem visualizações</span>
            <span className="text-sm text-muted">
              Assim que sua vitrine receber acessos, os produtos mais vistos aparecem aqui.
            </span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium text-ink">Cliques no WhatsApp</h2>
        {cliquesWhatsapp.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {cliquesWhatsapp.map((item, index) => (
              <li key={item.productId}>
                <Link
                  href={`/produtos/${item.productId}/editar`}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-surface bg-white p-3"
                >
                  <span className="w-5 text-sm font-medium text-muted">{index + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base text-ink">{item.name}</span>
                    {item.secondary && <span className="truncate text-xs text-muted">{item.secondary}</span>}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {item.clicks}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-surface px-4 py-8 text-center">
            <span className="font-medium text-ink">Ainda sem cliques</span>
            <span className="text-sm text-muted">
              Assim que clientes clicarem em &quot;Pedir agora&quot;, os produtos mais pedidos aparecem aqui.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
