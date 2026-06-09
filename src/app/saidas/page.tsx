import Link from "next/link";
import { UserMinus, ArrowLeft, TrendingDown } from "lucide-react";
import { getClients } from "@/lib/clients";
import { loadAllChurnEvents } from "@/lib/churn";
import { buildChurnBuckets } from "@/lib/churn-analytics";
import { ChurnHistoryClient } from "@/components/churn-history-client";
import { ChurnAIInsights } from "@/components/churn-ai-insights";
import { ChurnBreakdown } from "@/components/churn-breakdown";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SaidasPage() {
  const [allClients, churnEvents] = await Promise.all([
    getClients(),
    loadAllChurnEvents(),
  ]);

  // Indexa clientes por id pra pegar o nome (mesmo que tenha saído)
  const nameById = new Map<string, string>();
  for (const c of allClients) nameById.set(c.id, c.name);

  // Decora eventos com o nome do cliente
  const enrichedEvents = churnEvents.map((ev) => ({
    ...ev,
    clientName: nameById.get(ev.taskId) ?? "(cliente removido)",
  }));

  const buckets = buildChurnBuckets(churnEvents);
  const last12 = buckets.find((b) => b.label === "Últimos 12 meses");
  const eventsLast12mo = last12
    ? churnEvents.filter(
        (e) => e.churnedAt >= last12.from && e.churnedAt <= last12.to
      )
    : [];

  const totalLost = churnEvents.reduce(
    (s, e) => s + (e.monthlyRevenueAtTime ?? 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors animate-fade-in"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Voltar ao dashboard
      </Link>

      <div className="space-y-1 animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
            <UserMinus className="size-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
            Histórico de saídas
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Clientes que saíram
        </h1>
        <p className="text-sm text-[color:var(--muted-foreground)] max-w-2xl">
          Todos os ex-clientes com data, motivo, responsável da época e
          mensalidade perdida. Filtre por período, motivo ou CSM pra encontrar
          padrões.
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-up stagger-1">
        <KpiBox
          icon={<UserMinus className="size-4" />}
          label="Total de saídas"
          value={churnEvents.length.toString()}
        />
        <KpiBox
          icon={<TrendingDown className="size-4" />}
          label="MRR perdido (acumulado)"
          value={formatBRL(totalLost)}
          tone="danger"
        />
        <KpiBox
          icon={<UserMinus className="size-4" />}
          label="Saídas — últimos 12 meses"
          value={(eventsLast12mo.length).toString()}
          tone={eventsLast12mo.length > 0 ? "warn" : "neutral"}
        />
      </div>

      {/* Distribuição de perdas — donut com 3 dimensões togláveis */}
      <ChurnBreakdown events={churnEvents} />

      {/* Análise de padrões com IA */}
      <ChurnAIInsights hasEvents={enrichedEvents.length > 0} />

      {/* Histórico com filtros (client-side) */}
      <section className="space-y-3 animate-fade-up stagger-3">
        <h2 className="text-base font-semibold">Histórico completo</h2>
        {enrichedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-12 text-center">
            <UserMinus className="size-8 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-medium">Nenhuma saída registrada</p>
            <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
              Quando marcar um cliente como saída, ele aparece aqui.
            </p>
          </div>
        ) : (
          <ChurnHistoryClient events={enrichedEvents} />
        )}
      </section>

      <p className="text-[10px] text-[color:var(--muted-foreground)] text-center pt-4">
        Atualizado em {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}

function KpiBox({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const iconBg = {
    neutral: "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  }[tone];
  const valColor = {
    neutral: "text-[color:var(--foreground)]",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
          {label}
        </p>
        <div className={`size-8 rounded-lg grid place-items-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p
        className={`text-3xl font-bold tabular-nums tracking-tight ${valColor}`}
      >
        {value}
      </p>
    </div>
  );
}
