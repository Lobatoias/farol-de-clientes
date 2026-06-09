"use client";

import { useState } from "react";
import { Users, UserMinus, TrendingDown, Wallet, ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import type { CsmStat } from "@/lib/churn-analytics";

interface CsmPerformanceProps {
  stats: CsmStat[];
  periodLabel: string;
}

export function CsmPerformance({ stats, periodLabel }: CsmPerformanceProps) {
  const [expanded, setExpanded] = useState(false);

  if (stats.length === 0) return null;

  const visible = expanded ? stats : stats.slice(0, 6);
  const hasMore = stats.length > 6;
  const totalActive = stats.reduce((s, x) => s + x.activeCount, 0);
  const totalMrr = stats.reduce((s, x) => s + x.activeMrr, 0);
  const totalChurn = stats.reduce((s, x) => s + x.churnCount, 0);
  const totalChurnMrr = stats.reduce((s, x) => s + x.churnMrrLost, 0);

  return (
    <section className="space-y-3 animate-fade-up stagger-5">
      <header className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
          <Users className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Desempenho por responsável</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Carteira atual vs saídas {periodLabel.toLowerCase()} · ranqueado por
            quem está perdendo mais
          </p>
        </div>
      </header>

      {/* Sumário do time */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SumTile
          icon={<Users className="size-4" />}
          label="Ativos sob gestão"
          value={totalActive.toString()}
          hint={`${stats.length} ${stats.length === 1 ? "responsável" : "responsáveis"}`}
        />
        <SumTile
          icon={<Wallet className="size-4" />}
          label="MRR sob gestão"
          value={formatBRL(totalMrr)}
        />
        <SumTile
          icon={<UserMinus className="size-4" />}
          label="Saídas no período"
          value={totalChurn.toString()}
          tone={totalChurn > 0 ? "warn" : "neutral"}
        />
        <SumTile
          icon={<TrendingDown className="size-4" />}
          label="R$ perdido no período"
          value={totalChurnMrr > 0 ? formatBRL(totalChurnMrr) : "R$ 0"}
          tone={totalChurnMrr > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold bg-[color:var(--muted)]/30">
            <tr className="border-b border-[color:var(--border)]">
              <th className="text-left px-4 py-3">Responsável</th>
              <th className="text-right px-4 py-3">Ativos</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">
                MRR carteira
              </th>
              <th className="text-right px-4 py-3">Saídas</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">
                R$ perdido
              </th>
              <th className="text-right px-4 py-3">Churn rate</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s, i) => (
              <CsmRow key={s.csm} stat={s} rank={i + 1} />
            ))}
          </tbody>
        </table>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2.5 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/30 transition-colors border-t border-[color:var(--border)] inline-flex items-center justify-center gap-1.5"
          >
            {expanded ? (
              <>
                <ChevronDown className="size-3" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronRight className="size-3" />
                Ver todos os {stats.length} responsáveis
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}

function CsmRow({ stat, rank }: { stat: CsmStat; rank: number }) {
  const churnRatePct = Math.round(stat.churnRate * 100);
  const rateColor =
    churnRatePct >= 30
      ? "text-rose-600 dark:text-rose-400"
      : churnRatePct >= 15
      ? "text-amber-600 dark:text-amber-400"
      : churnRatePct > 0
      ? "text-[color:var(--muted-foreground)]"
      : "text-emerald-600 dark:text-emerald-400";

  return (
    <tr className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--muted)]/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="size-6 rounded-md bg-[color:var(--muted)] grid place-items-center text-[10px] font-bold tabular-nums shrink-0">
            {rank}
          </span>
          <span className="font-medium truncate">{stat.csm}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{stat.activeCount}</td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {stat.activeMrr > 0 ? (
          formatBRL(stat.activeMrr)
        ) : (
          <span className="text-[color:var(--muted-foreground)]">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            "tabular-nums",
            stat.churnCount > 0
              ? "text-rose-600 dark:text-rose-400 font-semibold"
              : "text-[color:var(--muted-foreground)]"
          )}
        >
          {stat.churnCount}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
        {stat.churnMrrLost > 0 ? (
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            {formatBRL(stat.churnMrrLost)}
          </span>
        ) : (
          <span className="text-[color:var(--muted-foreground)]">—</span>
        )}
      </td>
      <td className={cn("px-4 py-3 text-right tabular-nums font-medium", rateColor)}>
        {churnRatePct}%
      </td>
    </tr>
  );
}

function SumTile({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
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
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
          {label}
        </p>
        <div className={cn("size-7 rounded-md grid place-items-center", iconBg)}>
          {icon}
        </div>
      </div>
      <p
        className={cn("text-2xl font-bold tabular-nums tracking-tight", valColor)}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-[color:var(--muted-foreground)] mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
