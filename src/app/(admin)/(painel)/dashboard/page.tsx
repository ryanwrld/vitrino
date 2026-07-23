import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  ImageOff,
  MessageCircle,
  PackagePlus,
  XCircle,
} from "lucide-react";
import { requireCompletedOnboarding } from "@/lib/auth/onboarding-guard";
import { createClient } from "@/lib/supabase/server";
import { queryProducts } from "@/lib/products/list";
import {
  queryRecentActivity,
  queryTodayStats,
  queryTrendRanking,
  type ActivityFeedItem,
  type TrendRankingItem,
} from "@/lib/dashboard/metrics";
import { formatBRLPrice } from "@/lib/currency/brl";
import { DashboardAutoRefresh } from "./dashboard-auto-refresh";

/**
 * Dashboard v1.1 "Dashboard de Tendência" (MTR-03..MTR-11), substituindo o
 * dashboard all-time da Fase 6 (MTR-01/MTR-02). Server Component totalmente
 * dinâmico (sem `"use cache"`) — mesma disciplina de `/produtos`.
 *
 * Filtro de período (7/15/30 dias) e paginação do feed são dirigidos por
 * `searchParams` (mesma convenção já usada em `/produtos` e na vitrine
 * pública) — trocar o filtro é navegação, não estado client-side solto.
 *
 * Escopo validado num mockup navegável extenso antes desta implementação;
 * nudge por clique, "avise-me quando chegar" e "compartilhar catálogo"
 * foram propostos, prototipados e explicitamente descartados — ver
 * PROJECT.md "Out of Scope" antes de reintroduzir qualquer um dos três.
 */

const VALID_PERIODS = [7, 15, 30] as const;
type Period = (typeof VALID_PERIODS)[number];

function parsePeriod(raw: string | undefined): Period {
  const parsed = Number(raw);
  return (VALID_PERIODS as readonly number[]).includes(parsed) ? (parsed as Period) : 7;
}

function parseFeedLimit(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 5 ? Math.floor(parsed / 5) * 5 : 5;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

/** Sparkline inline via SVG puro — sem lib de gráfico, sem client JS. Trecho
 * final do período (~20% dos dias) ganha destaque em `text-primary`; o
 * resto fica em tom neutro (`text-gray-300`/`dark:text-gray-700`), seguindo
 * o mesmo princípio de "período atual em destaque" de um stat-tile comum. */
function Sparkline({ values }: { values: number[] }) {
  const w = 84;
  const h = 28;
  const pad = 4;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [fx] = points[0];
  const [lx] = points[points.length - 1];
  const area = `${line} L${lx.toFixed(1)},${(h - pad).toFixed(1)} L${fx.toFixed(1)},${(h - pad).toFixed(1)} Z`;
  const tailCount = Math.max(2, Math.round(values.length * 0.2));
  const tail = points
    .slice(-tailCount)
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const [ex, ey] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="shrink-0">
      <path d={area} className="fill-primary/10 dark:fill-blue-300/15" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="text-gray-300 dark:text-gray-700" />
      <path d={tail} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="text-primary dark:text-blue-300" />
      <circle cx={ex} cy={ey} r={4} className="fill-primary dark:fill-blue-300 stroke-white dark:stroke-gray-900" strokeWidth={2} />
    </svg>
  );
}

function RankingList({
  title,
  items,
  metricLabel,
  MetricIcon,
}: {
  title: string;
  items: (TrendRankingItem & { coverUrl: string | null })[];
  metricLabel: string;
  MetricIcon: typeof Eye;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-display font-bold text-gray-900 dark:text-gray-50">{title}</h2>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const urgent = !item.disponivel && (item.isNew || (item.deltaPct ?? 0) > 0);
            return (
              <li key={item.productId} className="rounded-lg border border-gray-200 dark:border-gray-800">
                <div className={`flex min-h-11 flex-wrap items-center gap-3 rounded-lg p-3 ${urgent ? "bg-warning-bg dark:bg-warning-solid/15" : "bg-white dark:bg-gray-900"}`}>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {item.coverUrl ? (
                      <Image src={item.coverUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-display text-sm font-medium text-gray-900 dark:text-gray-50">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {item.secondary && <span className="truncate text-xs text-gray-500 dark:text-gray-400">{item.secondary}</span>}
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold ${
                          item.disponivel
                            ? "bg-success-bg text-success-fg dark:bg-success-solid/15"
                            : "bg-error-bg text-error-fg dark:bg-error-solid/15"
                        }`}
                      >
                        {item.disponivel ? "Disponível" : "Esgotado"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatBRLPrice(item.price)}</span>
                  </div>
                  <Sparkline values={item.trend} />
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-50">
                      <MetricIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                      {item.current} {metricLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-px text-[10px] font-bold ${
                        item.isNew
                          ? "bg-primary-subtle text-primary dark:bg-blue-400/15 dark:text-blue-300"
                          : "bg-success-bg text-success-fg dark:bg-success-solid/15"
                      }`}
                    >
                      {item.isNew ? "Novo" : `${(item.deltaPct ?? 0) >= 0 ? "+" : ""}${item.deltaPct}%`}
                    </span>
                  </div>
                  {urgent && (
                    <div className="flex w-full items-center justify-between gap-2 border-t border-warning-solid/20 pt-2 text-xs font-semibold text-warning-fg">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Em alta e esgotado
                      </span>
                      <Link href={`/produtos/${item.productId}/editar`} className="shrink-0 underline underline-offset-2">
                        Atualizar estoque →
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
          <span className="font-medium text-gray-900 dark:text-gray-50">Sem atividade suficiente nesse período</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Troque a janela de dias acima ou aguarde mais movimento na vitrine.</span>
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; feedLimit?: string }>;
}) {
  await requireCompletedOnboarding();

  const params = await searchParams;
  const periodo = parsePeriod(params.periodo);
  const feedLimit = parseFeedLimit(params.feedLimit);

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

  const produtos = await queryProducts(supabase, store.id, {});

  if (produtos.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visão geral da sua vitrine.</p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle dark:bg-blue-400/15">
            <PackagePlus className="h-7 w-7 text-primary dark:text-blue-300" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-display font-bold text-gray-900 dark:text-gray-50">Sua loja ainda não tem produtos</span>
            <span className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Assim que você cadastrar o primeiro, o placar do dia, o feed de atividade e os rankings de tendência
              começam a aparecer aqui sozinhos — nada pra configurar.
            </span>
          </div>
          <Link
            href="/produtos/novo"
            className="mt-2 rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition-all duration-150 hover:bg-primary-hover active:bg-primary-active active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            Cadastrar primeiro produto
          </Link>
        </div>
      </div>
    );
  }

  const [today, feed, maisVisualizados, cliquesWhatsapp] = await Promise.all([
    queryTodayStats(supabase, store.id),
    queryRecentActivity(supabase, store.id, feedLimit),
    queryTrendRanking(supabase, store.id, "views", periodo),
    queryTrendRanking(supabase, store.id, "clicks", periodo),
  ]);

  const disponiveis = produtos.filter((product) => product.disponivel).length;
  const esgotados = produtos.length - disponiveis;

  const resolveCover = (path: string | null) =>
    path ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl : null;

  const maisVisualizadosWithCover = maisVisualizados.map((item) => ({ ...item, coverUrl: resolveCover(item.coverPath) }));
  const cliquesWhatsappWithCover = cliquesWhatsapp.map((item) => ({ ...item, coverUrl: resolveCover(item.coverPath) }));

  const feedIcon = (item: ActivityFeedItem) => (item.type === "click" ? MessageCircle : Eye);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <DashboardAutoRefresh />
      <div>
        <h1 className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-50">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visão geral da sua vitrine — atualizado agora.</p>
      </div>

      {/* MTR-03: placar do dia — sempre hoje, nunca acumulado */}
      <div className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex flex-col gap-0.5 p-4">
          <span className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-50">{today.views}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Visualizações hoje</span>
        </div>
        <div className="flex flex-col gap-0.5 p-4">
          <span className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-50">{today.clicks}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Cliques em &quot;Pedir agora&quot; hoje</span>
        </div>
        <div className="flex flex-col gap-0.5 p-4">
          <span className="font-display text-2xl font-extrabold text-primary dark:text-blue-300">{today.conversionPct}%</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Taxa de conversão (view → clique)</span>
        </div>
      </div>

      {/* MTR-04: feed de atividade recente, com teto + "Ver mais" */}
      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-display font-bold text-gray-900 dark:text-gray-50">Atividade recente</h2>
        {feed.items.length > 0 ? (
          <>
            <ul className="flex flex-col gap-1">
              {feed.items.map((item, index) => {
                const Icon = feedIcon(item);
                return (
                  <li key={`${item.type}-${item.productId}-${item.createdAt}-${index}`} className="flex items-start gap-3 border-b border-gray-100 py-2 last:border-none dark:border-gray-800">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        item.type === "click"
                          ? "bg-success-bg text-success-fg dark:bg-success-solid/15"
                          : "bg-warning-bg text-warning-fg dark:bg-warning-solid/15"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {item.type === "click" ? (
                        <>
                          Alguém clicou em <b className="font-semibold text-gray-900 dark:text-gray-50">&quot;Pedir agora&quot;</b> — {item.productName}
                        </>
                      ) : (
                        <>
                          <b className="font-semibold text-gray-900 dark:text-gray-50">{item.count} visualizaç{item.count > 1 ? "ões" : "ão"}</b> nova{item.count > 1 ? "s" : ""} — {item.productName}
                        </>
                      )}
                      <span className="block text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {feed.hasMore && (
              <Link
                href={`/dashboard?periodo=${periodo}&feedLimit=${feedLimit + 5}`}
                className="flex items-center justify-center gap-1 rounded-md border-t border-gray-100 pt-3 text-sm font-semibold text-primary dark:border-gray-800 dark:text-blue-300"
              >
                Ver mais <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
            <span className="font-medium text-gray-900 dark:text-gray-50">Ainda sem atividade</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Assim que sua vitrine receber acessos ou pedidos, eles aparecem aqui.</span>
          </div>
        )}
      </section>

      {/* MTR-06..MTR-10: ranking de tendência, com filtro de período.
          Vem ANTES dos cards Disponíveis/Esgotados de propósito: aqui mora
          a única ação de verdade da tela ("Em alta e esgotado" + "Atualizar
          estoque →") — o que pede decisão sobe, o que é só contagem desce. */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {VALID_PERIODS.map((d) => (
            <Link
              key={d}
              href={`/dashboard?periodo=${d}&feedLimit=${feedLimit}`}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                d === periodo
                  ? "bg-white text-primary shadow-sm dark:bg-gray-900 dark:text-blue-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RankingList title="Mais visualizados — em alta" items={maisVisualizadosWithCover} metricLabel="views" MetricIcon={Eye} />
          <RankingList title="Cliques no WhatsApp — em alta" items={cliquesWhatsappWithCover} metricLabel="cliques" MetricIcon={MessageCircle} />
        </div>
      </div>

      {/* MTR-05: Disponíveis/Esgotados — sem "Total"/"Acessos" all-time */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-bg dark:bg-success-solid/15">
            <CheckCircle2 className="h-5 w-5 text-success-fg" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-50">{disponiveis}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Produtos disponíveis</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-bg dark:bg-error-solid/15">
            <XCircle className="h-5 w-5 text-error-fg" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={`font-display text-2xl font-extrabold ${esgotados > 0 ? "text-error-fg" : "text-gray-900 dark:text-gray-50"}`}>{esgotados}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Produtos esgotados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
