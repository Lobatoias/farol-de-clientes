import { DollarSign, Lock } from "lucide-react";
import { getClients, isUsingMockData } from "@/lib/clients";
import { loadAllChurnEvents } from "@/lib/churn";
import { buildChurnBuckets, groupByReason, churnByMonth } from "@/lib/churn-analytics";
import { loadMetricSnapshots, snapshotsByMonth } from "@/lib/metric-snapshots";
import { FinanceiroEditor } from "@/components/financeiro-editor";
import { SourceBanner } from "@/components/source-banner";
import { NichoBreakdown } from "@/components/nicho-breakdown";
import { LTVSection } from "@/components/ltv-section";
import { ChurnSummary } from "@/components/churn-summary";
import { HistoricalComparison } from "@/components/historical-comparison";

export const metadata = { title: "Financeiro" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FinanceiroPage() {
  const [allClients, churnEvents, snapshots] = await Promise.all([
    getClients(),
    loadAllChurnEvents(),
    loadMetricSnapshots(),
  ]);
  // Métricas (LTV, NichoBreakdown, editor) excluem clientes que já saíram.
  // Strip meetingNotes — financeiro não exibe, e payload RSC fica grande à toa.
  const clients = allClients
    .filter((c) => !c.isChurned)
    .map((c) => ({ ...c, meetingNotes: undefined }));

  // Saídas: agrega por buckets + motivos dos últimos 12 meses
  const buckets = buildChurnBuckets(churnEvents);
  const last12 = buckets.find((b) => b.label === "Últimos 12 meses");
  const eventsLast12mo = last12
    ? churnEvents.filter(
        (e) => e.churnedAt >= last12.from && e.churnedAt <= last12.to
      )
    : [];
  const byReasonLast12mo = groupByReason(eventsLast12mo);

  // Comparação histórica: saídas por mês (retroativo) + MRR mês a mês (snapshots)
  const churnMonths = churnByMonth(churnEvents, 6);
  const monthlyMrr = snapshotsByMonth(snapshots).map(({ ym, snapshot }) => {
    const [, m] = ym.split("-");
    const labels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return {
      ym,
      label: `${labels[Number(m) - 1]}/${ym.slice(2, 4)}`,
      activeMrr: snapshot.activeMrr,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header — trust & authority pattern: clear hierarchy */}
      <div className="flex items-start justify-between gap-6 flex-wrap pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center">
              <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
              Financeiro privado
            </span>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] flex items-center gap-1 ring-1 ring-inset ring-[color:var(--border)]">
              <Lock className="size-2.5" />
              local
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mensalidade e contratos</h1>
          <p className="text-sm text-[color:var(--muted-foreground)] max-w-2xl leading-relaxed">
            Quanto cada cliente paga por mês, prazos de contrato e desde quando trabalha com a agência.
            Dados ficam <strong className="text-[color:var(--foreground)]">fora do ClickUp</strong>,
            em arquivo local gitignored. Edite inline — salva automático.
          </p>
        </div>
        <SourceBanner source={isUsingMockData() ? "mock" : "clickup"} count={clients.length} />
      </div>

      <LTVSection clients={clients} />

      <HistoricalComparison churnMonths={churnMonths} monthlyMrr={monthlyMrr} />

      <ChurnSummary
        buckets={buckets}
        byReasonLast12mo={byReasonLast12mo}
        totalEvents={churnEvents.length}
      />

      <NichoBreakdown clients={clients} />

      <FinanceiroEditor clients={clients} />
    </div>
  );
}
