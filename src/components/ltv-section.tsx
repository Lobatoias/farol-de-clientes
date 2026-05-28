"use client";

import { Trophy, Clock, TrendingUp, Coins } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { calculateLTV, formatTenure } from "@/lib/metrics";
import { CountUp } from "./count-up";
import { StatusDot } from "./status-badge";
import type { Client } from "@/lib/types";

interface LTVSectionProps {
  clients: Client[];
}

export function LTVSection({ clients }: LTVSectionProps) {
  const metrics = calculateLTV(clients);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-6 space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center">
              <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              LTV e retenção
            </h3>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Quanto tempo seus clientes ficam e quanto isso vira de receita acumulada.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] ring-1 ring-inset ring-[color:var(--border)]">
          {metrics.clientsWithData}/{clients.length} com dados
        </span>
      </div>

      {metrics.clientsWithData === 0 ? (
        <div className="text-center py-8 text-sm text-[color:var(--muted-foreground)]">
          Preencha <strong>Mensalidade</strong> e <strong>Cliente desde</strong> em ao menos 1 cliente pra ver as métricas.
        </div>
      ) : (
        <>
          {/* Stats principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              icon={<Clock className="size-4" />}
              tone="primary"
              label="Retenção média"
              value={formatTenure(metrics.avgTenureMonths)}
              hint="entre clientes com dados"
            />
            <Stat
              icon={<TrendingUp className="size-4" />}
              tone="good"
              label="LTV médio"
              numericValue={metrics.avgLTV}
              format={(n) => formatBRL(n)}
              hint="receita acumulada por cliente"
            />
            <Stat
              icon={<Coins className="size-4" />}
              tone="good"
              label="LTV total"
              numericValue={metrics.totalLTV}
              format={(n) => formatBRL(n)}
              hint="soma de todos os LTVs"
            />
            <Stat
              icon={<Trophy className="size-4" />}
              tone="neutral"
              label="MRR cumulativo"
              numericValue={metrics.totalMRR}
              format={(n) => formatBRL(n)}
              hint="todas as mensalidades somadas"
            />
          </div>

          {/* Top clientes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Top 5 clientes por LTV</h4>
              <span className="text-[11px] text-[color:var(--muted-foreground)]">
                ordenado por receita acumulada
              </span>
            </div>
            <ul className="space-y-2">
              {metrics.perClient
                .filter((p) => p.hasFullData)
                .slice(0, 5)
                .map((p, i) => {
                  const pctOfTotal =
                    metrics.totalLTV > 0
                      ? (p.estimatedLTV / metrics.totalLTV) * 100
                      : 0;
                  return (
                    <li
                      key={p.clientId}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--muted)]/30 transition-colors"
                    >
                      <span className="size-7 rounded-md bg-[color:var(--muted)] grid place-items-center text-xs font-bold tabular-nums shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusDot status={p.status} />
                          <span className="font-medium truncate">{p.name}</span>
                          {p.niche && (
                            <span className="text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-wide">
                              {p.niche}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5">
                          {formatBRL(p.monthlyRevenue)}/mês ·{" "}
                          {formatTenure(p.tenureMonths)} de casa
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold tabular-nums">
                          {formatBRL(p.estimatedLTV)}
                        </div>
                        <div className="text-[10px] text-[color:var(--muted-foreground)] tabular-nums">
                          {pctOfTotal.toFixed(pctOfTotal < 10 ? 1 : 0)}% do total
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>

          <p className="text-[11px] text-[color:var(--muted-foreground)] pt-3 border-t border-[color:var(--border)]">
            ⚠️ Estimativa baseada na base <strong>atual</strong> (sem dados de churn).
            Conforme você marcar clientes que sairam, o cálculo fica mais preciso.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
  numericValue,
  format,
  hint,
}: {
  icon: React.ReactNode;
  tone: "neutral" | "primary" | "good" | "warn" | "danger";
  label: string;
  value?: string;
  numericValue?: number;
  format?: (n: number) => string;
  hint?: string;
}) {
  const iconBg = {
    neutral: "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
    primary: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    good: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  }[tone];

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold leading-tight">
          {label}
        </p>
        <div className={cn("size-7 rounded-md grid place-items-center shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
        {numericValue !== undefined && format ? (
          <CountUp to={numericValue} format={format} />
        ) : (
          value
        )}
      </p>
      {hint && (
        <p className="text-[10px] text-[color:var(--muted-foreground)] mt-1.5 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}
