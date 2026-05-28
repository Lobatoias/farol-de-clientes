"use client";

import { useState } from "react";
import {
  Trophy,
  Clock,
  TrendingUp,
  Coins,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
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
  const [showAll, setShowAll] = useState(false);

  const visibleClients = metrics.perClient.filter((p) => p.hasFullData);
  const displayClients = showAll ? visibleClients : visibleClients.slice(0, 5);

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
          {/* Linha 1: Métricas atuais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              icon={<Clock className="size-4" />}
              tone="primary"
              label="Retenção média"
              value={formatTenure(metrics.avgTenureMonths)}
              hint="tempo médio na agência"
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
              icon={<AlertTriangle className="size-4" />}
              tone={metrics.riskPct > 0.3 ? "danger" : metrics.riskPct > 0.15 ? "warn" : "neutral"}
              label="LTV em risco"
              numericValue={metrics.ltvAtRisk}
              format={(n) => formatBRL(n)}
              hint={`${Math.round(metrics.riskPct * 100)}% · amarelo + vermelho`}
            />
          </div>

          {/* Linha 2: Forecast */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-7 rounded-md bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
                <CalendarClock className="size-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-sm font-semibold">Projeção otimista</h4>
            </div>
            <p className="text-[11px] text-[color:var(--muted-foreground)] mb-4 ml-9">
              Assume que <strong>todos</strong> os clientes ativos mantêm a mensalidade. Considere o LTV em risco acima ({formatBRL(metrics.ltvAtRisk)}) como teto pra ajustar.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <ForecastTile
                label="Hoje"
                value={metrics.totalLTV}
                hint="LTV acumulado atual"
              />
              <ForecastTile
                label="+12 meses"
                value={metrics.forecast12mo}
                hint={`+${formatBRL(metrics.forecast12mo - metrics.totalLTV)}`}
                accent="primary"
              />
              <ForecastTile
                label="+24 meses"
                value={metrics.forecast24mo}
                hint={`+${formatBRL(metrics.forecast24mo - metrics.totalLTV)}`}
                accent="good"
              />
            </div>
          </div>

          {/* Por nicho */}
          {metrics.byNiche.length > 1 && (
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-7 rounded-md bg-violet-50 dark:bg-violet-950/40 grid place-items-center">
                  <Layers className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-sm font-semibold">LTV por nicho</h4>
                <span className="text-[11px] text-[color:var(--muted-foreground)]">
                  · onde está o valor da sua base
                </span>
              </div>
              <ul className="space-y-2">
                {metrics.byNiche.map((n) => {
                  const pct = metrics.totalLTV > 0 ? (n.totalLTV / metrics.totalLTV) * 100 : 0;
                  return (
                    <li key={n.niche}>
                      <div className="flex items-center justify-between gap-2 text-sm mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{n.niche}</span>
                          <span className="text-[11px] text-[color:var(--muted-foreground)] shrink-0 tabular-nums">
                            {n.count} {n.count === 1 ? "cliente" : "clientes"} · {formatBRL(n.avgLTV)} médio
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-[color:var(--muted-foreground)] tabular-nums">
                            {formatBRL(n.totalLTV)}
                          </span>
                          <span className="text-sm font-semibold tabular-nums w-12 text-right">
                            {pct.toFixed(pct < 10 ? 1 : 0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-[color:var(--muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Tabela de clientes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">
                {showAll ? `Todos os ${visibleClients.length} clientes` : "Top 5 clientes"}{" "}
                <span className="text-[11px] text-[color:var(--muted-foreground)] font-normal">
                  · ordenado por LTV
                </span>
              </h4>
              {visibleClients.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="size-3" />
                      Mostrar só top 5
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3" />
                      Mostrar todos ({visibleClients.length - 5} a mais)
                    </>
                  )}
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {displayClients.map((p, i) => {
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

function ForecastTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "primary" | "good";
}) {
  const color =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "primary"
      ? "text-blue-600 dark:text-blue-400"
      : "text-[color:var(--foreground)]";
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold mb-2">
        {label}
      </p>
      <p className={cn("text-xl font-bold tabular-nums tracking-tight", color)}>
        <CountUp to={value} format={(n) => formatBRL(n)} />
      </p>
      {hint && (
        <p className="text-[10px] text-[color:var(--muted-foreground)] mt-1 tabular-nums">
          {hint}
        </p>
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

  const valueColor = {
    neutral: "text-[color:var(--foreground)]",
    primary: "text-[color:var(--foreground)]",
    good: "text-[color:var(--foreground)]",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
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
      <p className={cn("text-2xl font-bold tabular-nums tracking-tight leading-none", valueColor)}>
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
