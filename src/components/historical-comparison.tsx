import { TrendingUp, CalendarRange } from "lucide-react";
import type { ChurnMonth } from "@/lib/churn-analytics";
import type { MetricSnapshot } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";

interface HistoricalComparisonProps {
  churnMonths: ChurnMonth[];
  monthlyMrr: Array<{ ym: string; label: string; activeMrr: number }>;
}

/**
 * Comparação mês a mês: saídas (dado retroativo de churn_events) +
 * faturamento ativo (de metric_snapshots, acumula a partir de hoje).
 * Separa ciclo normal de alerta real.
 */
export function HistoricalComparison({
  churnMonths,
  monthlyMrr,
}: HistoricalComparisonProps) {
  const maxChurn = Math.max(1, ...churnMonths.map((m) => m.count));
  const totalChurn = churnMonths.reduce((s, m) => s + m.count, 0);
  const maxMrr = Math.max(1, ...monthlyMrr.map((m) => m.activeMrr));

  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-[color:var(--muted)] grid place-items-center">
          <CalendarRange className="size-4 text-[color:var(--muted-foreground)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Evolução mês a mês</h3>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            Separa ciclo normal de alerta real
          </p>
        </div>
      </div>

      {/* Saídas por mês */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
            Saídas por mês
          </h4>
          <span className="text-[11px] text-[color:var(--muted-foreground)]">
            {totalChurn} no período
          </span>
        </div>
        {totalChurn === 0 ? (
          <p className="text-xs text-[color:var(--muted-foreground)] py-3">
            Nenhuma saída nos últimos {churnMonths.length} meses. 🎉
          </p>
        ) : (
          <div className="flex items-end gap-2 h-28 pt-2">
            {churnMonths.map((m) => (
              <div
                key={m.ym}
                className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                title={
                  m.count > 0
                    ? `${m.count} saída(s) · ${formatBRL(m.monthlyRevenueLost)}/mês`
                    : "Sem saídas"
                }
              >
                <span className="text-[11px] font-medium tabular-nums text-[color:var(--foreground)]">
                  {m.count || ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    m.count > 0
                      ? "bg-rose-500/80"
                      : "bg-[color:var(--muted)]"
                  )}
                  style={{
                    height: `${m.count > 0 ? Math.max((m.count / maxChurn) * 100, 8) : 3}%`,
                  }}
                />
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Faturamento ativo (MRR) mês a mês */}
      <div className="space-y-2 pt-1 border-t border-[color:var(--border)]">
        <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold pt-3">
          Faturamento ativo (MRR)
        </h4>
        {monthlyMrr.length === 0 ? (
          <p className="text-xs text-[color:var(--muted-foreground)] py-2 leading-relaxed">
            O histórico de faturamento começa a ser registrado agora — a cada
            dia o sistema guarda um retrato da base. Em algumas semanas dá pra
            ver a tendência aqui.
          </p>
        ) : monthlyMrr.length === 1 ? (
          <div className="flex items-baseline gap-2 py-1">
            <TrendingUp className="size-4 text-emerald-500" />
            <span className="text-xl font-bold tabular-nums">
              {formatBRL(monthlyMrr[0].activeMrr)}
            </span>
            <span className="text-xs text-[color:var(--muted-foreground)]">
              em {monthlyMrr[0].label} · a comparação aparece no próximo mês
            </span>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-24 pt-2">
            {monthlyMrr.map((m) => (
              <div
                key={m.ym}
                className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                title={`${m.label}: ${formatBRL(m.activeMrr)}`}
              >
                <span className="text-[10px] font-medium tabular-nums text-[color:var(--muted-foreground)]">
                  {Math.round(m.activeMrr / 1000)}k
                </span>
                <div
                  className="w-full rounded-t-md bg-emerald-500/80"
                  style={{ height: `${Math.max((m.activeMrr / maxMrr) * 100, 8)}%` }}
                />
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
