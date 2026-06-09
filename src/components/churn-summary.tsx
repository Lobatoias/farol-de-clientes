import Link from "next/link";
import { UserMinus, ArrowRight, TrendingDown } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import type { ChurnBucket, ChurnByReason } from "@/lib/churn-analytics";

interface ChurnSummaryProps {
  buckets: ChurnBucket[];
  byReasonLast12mo: ChurnByReason[];
  totalEvents: number;
}

export function ChurnSummary({
  buckets,
  byReasonLast12mo,
  totalEvents,
}: ChurnSummaryProps) {
  if (totalEvents === 0) {
    return (
      <section className="space-y-3 animate-fade-up">
        <Header />
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
          <UserMinus className="size-6 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-medium">Nenhuma saída registrada</p>
          <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
            Quando marcar um cliente como saída, ele aparece aqui agregado por
            período.
          </p>
        </div>
      </section>
    );
  }

  // KPIs em destaque: este mês + últimos 3 + últimos 12
  const thisMonth = buckets.find((b) => b.label === "Este mês");
  const last3 = buckets.find((b) => b.label === "Últimos 3 meses");
  const last12 = buckets.find((b) => b.label === "Últimos 12 meses");

  return (
    <section className="space-y-4 animate-fade-up">
      <Header />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {thisMonth && <ChurnKpi bucket={thisMonth} tone="rose" />}
        {last3 && <ChurnKpi bucket={last3} tone="amber" />}
        {last12 && <ChurnKpi bucket={last12} tone="neutral" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Tabela: todos os buckets */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] overflow-hidden">
          <header className="px-4 py-3 border-b border-[color:var(--border)]">
            <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              Comparativo por período
            </h3>
          </header>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              <tr className="border-b border-[color:var(--border)]">
                <th className="text-left px-4 py-2.5">Período</th>
                <th className="text-right px-4 py-2.5">Saídas</th>
                <th className="text-right px-4 py-2.5">R$/mês perdido</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr
                  key={b.label}
                  className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--muted)]/30 transition-colors"
                >
                  <td className="px-4 py-2.5">{b.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {b.count}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums",
                      b.monthlyRevenueLost > 0
                        ? "text-rose-600 dark:text-rose-400 font-medium"
                        : "text-[color:var(--muted-foreground)]"
                    )}
                  >
                    {b.monthlyRevenueLost > 0
                      ? formatBRL(b.monthlyRevenueLost)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Motivos (últimos 12 meses) */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 space-y-3">
          <header className="flex items-center justify-between gap-2">
            <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              Motivos · últimos 12 meses
            </h3>
            <Link
              href="/saidas"
              className="text-[11px] inline-flex items-center gap-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
            >
              Ver histórico
              <ArrowRight className="size-3" />
            </Link>
          </header>
          {byReasonLast12mo.length === 0 ? (
            <p className="text-xs text-[color:var(--muted-foreground)] py-6 text-center">
              Sem saídas nos últimos 12 meses.
            </p>
          ) : (
            <ul className="space-y-2">
              {byReasonLast12mo.map((r) => (
                <li key={r.reason} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.reason}</span>
                    <span className="text-xs tabular-nums text-[color:var(--muted-foreground)]">
                      {r.count} · {Math.round(r.pct * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[color:var(--muted)] overflow-hidden">
                    <div
                      className="h-full bg-rose-500/80 transition-all duration-500"
                      style={{ width: `${r.pct * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-2">
      <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
        <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />
      </div>
      <div>
        <h2 className="text-base font-semibold">Saídas</h2>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Clientes perdidos por período + R$/mês de mensalidade que saiu
        </p>
      </div>
    </header>
  );
}

function ChurnKpi({
  bucket,
  tone,
}: {
  bucket: ChurnBucket;
  tone: "rose" | "amber" | "neutral";
}) {
  const toneClasses = {
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/40",
      icon: "text-rose-600 dark:text-rose-400",
      val: "text-rose-600 dark:text-rose-400",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      icon: "text-amber-600 dark:text-amber-400",
      val: "text-amber-600 dark:text-amber-400",
    },
    neutral: {
      bg: "bg-[color:var(--muted)]",
      icon: "text-[color:var(--muted-foreground)]",
      val: "text-[color:var(--foreground)]",
    },
  }[tone];

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
          {bucket.label}
        </p>
        <div
          className={cn("size-8 rounded-lg grid place-items-center", toneClasses.bg)}
        >
          <UserMinus className={cn("size-4", toneClasses.icon)} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            bucket.count > 0
              ? toneClasses.val
              : "text-[color:var(--muted-foreground)]"
          )}
        >
          {bucket.count}
        </p>
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {bucket.count === 1 ? "saída" : "saídas"}
        </span>
      </div>
      <p className="text-[11px] text-[color:var(--muted-foreground)] mt-2">
        {bucket.monthlyRevenueLost > 0
          ? `${formatBRL(bucket.monthlyRevenueLost)} de MRR perdido`
          : "Sem perda de mensalidade registrada"}
      </p>
    </div>
  );
}
