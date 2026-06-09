"use client";

import { useMemo, useState } from "react";
import { PieChart, Users, Layers, MessageSquare } from "lucide-react";
import type { ChurnEvent } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";
import { DonutChart } from "./donut-chart";

interface ChurnBreakdownProps {
  events: ChurnEvent[];
}

type Dimension = "csm" | "niche" | "reason";

interface GroupStat {
  key: string;
  count: number;
  monthlyRevenueLost: number;
}

// Paleta deliberada — usa rose pra reforçar contexto de "perda" mas mistura
// neutros e accent pra cada segmento ficar distinguível
const CHURN_PALETTE = [
  "#e11d48", // rose-600
  "#f59e0b", // amber-500
  "#0891b2", // cyan-600
  "#64748b", // slate-500
  "#2563eb", // blue-600
  "#0d9488", // teal-600
  "#a855f7", // purple-500
  "#84cc16", // lime-500
];

const DIMENSIONS: Array<{
  key: Dimension;
  label: string;
  emptyLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "csm", label: "Por responsável", emptyLabel: "Sem responsável", icon: Users },
  { key: "niche", label: "Por nicho", emptyLabel: "Sem nicho", icon: Layers },
  { key: "reason", label: "Por motivo", emptyLabel: "Sem motivo", icon: MessageSquare },
];

function buildGroups(
  events: ChurnEvent[],
  dim: Dimension,
  emptyLabel: string
): GroupStat[] {
  const map = new Map<string, GroupStat>();
  for (const e of events) {
    const keys: string[] =
      dim === "csm"
        ? [e.csmAtTime?.trim() || emptyLabel]
        : dim === "niche"
        ? [e.nicheAtTime?.trim() || emptyLabel]
        : e.reasons.length > 0
        ? [...e.reasons]
        : [emptyLabel];

    for (const k of keys) {
      let cur = map.get(k);
      if (!cur) {
        cur = { key: k, count: 0, monthlyRevenueLost: 0 };
        map.set(k, cur);
      }
      cur.count++;
      // Em multi-reason cada motivo ganha o MRR cheio (comparável entre buckets);
      // pra CSM e nicho um evento conta só 1 vez.
      cur.monthlyRevenueLost += e.monthlyRevenueAtTime ?? 0;
    }
  }
  return Array.from(map.values());
}

export function ChurnBreakdown({ events }: ChurnBreakdownProps) {
  const [dim, setDim] = useState<Dimension>("csm");
  const [hovered, setHovered] = useState<string | null>(null);

  const dimMeta = DIMENSIONS.find((d) => d.key === dim)!;
  const stats = useMemo(
    () => buildGroups(events, dim, dimMeta.emptyLabel),
    [events, dim, dimMeta.emptyLabel]
  );

  const totalMrrLost = stats.reduce((s, x) => s + x.monthlyRevenueLost, 0);
  const totalCount = events.length;
  // Mostra por R$ perdido se houver dado financeiro suficiente
  const groupsWithMrr = stats.filter((s) => s.monthlyRevenueLost > 0).length;
  const hasMeaningfulRevenue =
    totalMrrLost > 0 &&
    groupsWithMrr >= Math.max(1, Math.ceil(stats.length * 0.4));
  const showByCount = !hasMeaningfulRevenue;
  const totalForPct = showByCount ? totalCount : totalMrrLost;

  const sorted = [...stats].sort((a, b) =>
    showByCount
      ? b.count - a.count
      : b.monthlyRevenueLost - a.monthlyRevenueLost
  );

  const segments = sorted.map((s, i) => ({
    label: s.key,
    value: showByCount ? s.count : s.monthlyRevenueLost,
    color: CHURN_PALETTE[i % CHURN_PALETTE.length],
  }));

  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:shadow-md animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
              <PieChart className="size-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              Distribuição de perdas
            </h3>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {showByCount
              ? `${totalCount} ${totalCount === 1 ? "saída" : "saídas"} agrupadas — quem está perdendo mais`
              : `${formatBRL(totalMrrLost)} de mensalidade perdida agregada`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DimensionTabs current={dim} onChange={(d) => {
            setDim(d);
            setHovered(null);
          }} />
          <ModeBadge byRevenue={hasMeaningfulRevenue} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
        {/* Donut */}
        <div className="flex justify-center lg:justify-start">
          <DonutChart
            segments={segments}
            size={210}
            thickness={32}
            centerValue={
              showByCount
                ? totalCount.toString()
                : formatBRL(totalMrrLost)
            }
            centerLabel={
              showByCount
                ? totalCount === 1
                  ? "saída"
                  : "saídas"
                : "perdido/mês"
            }
            hoveredLabel={hovered}
            onHoverChange={setHovered}
            hoveredCenterFormat={(seg, pct) => ({
              value: showByCount
                ? `${seg.value}`
                : formatBRL(seg.value),
              label: `${truncate(seg.label, 24)} · ${pct.toFixed(pct < 10 ? 1 : 0)}%`,
            })}
          />
        </div>

        {/* Legenda */}
        <ul className="space-y-3">
          {sorted.map((stat, i) => {
            const value = showByCount ? stat.count : stat.monthlyRevenueLost;
            const pct = totalForPct > 0 ? (value / totalForPct) * 100 : 0;
            const color = CHURN_PALETTE[i % CHURN_PALETTE.length];
            const isHovered = hovered === stat.key;
            const isDimmed = hovered !== null && !isHovered;
            return (
              <li
                key={stat.key}
                className="group animate-fade-up cursor-pointer transition-opacity duration-200"
                style={{
                  animationDelay: `${i * 50}ms`,
                  opacity: isDimmed ? 0.4 : 1,
                }}
                onMouseEnter={() => setHovered(stat.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-3 rounded shrink-0 transition-transform duration-200"
                      style={{
                        backgroundColor: color,
                        transform: isHovered ? "scale(1.25)" : "scale(1)",
                      }}
                    />
                    <span
                      className={cn(
                        "font-medium truncate transition-colors duration-200",
                        isHovered && "text-[color:var(--foreground)]"
                      )}
                      title={stat.key}
                    >
                      {stat.key}
                    </span>
                    <span className="text-[11px] text-[color:var(--muted-foreground)] shrink-0 tabular-nums">
                      {stat.count}{" "}
                      {stat.count === 1 ? "saída" : "saídas"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!showByCount && stat.monthlyRevenueLost > 0 && (
                      <span className="text-xs text-rose-600 dark:text-rose-400 tabular-nums font-medium">
                        {formatBRL(stat.monthlyRevenueLost)}
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums w-14 text-right">
                      {pct < 1 ? "< 1%" : `${pct.toFixed(pct < 10 ? 1 : 0)}%`}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(pct, 1)}%`,
                      backgroundColor: color,
                      filter: isHovered ? "brightness(1.15)" : "brightness(1)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function DimensionTabs({
  current,
  onChange,
}: {
  current: Dimension;
  onChange: (d: Dimension) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)]"
    >
      {DIMENSIONS.map((d) => {
        const Icon = d.icon;
        const active = current === d.key;
        return (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(d.key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium transition-all",
              active
                ? "bg-[color:var(--card)] text-[color:var(--foreground)] shadow-sm ring-1 ring-[color:var(--border)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            )}
          >
            <Icon className="size-3" />
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

function ModeBadge({ byRevenue }: { byRevenue: boolean }) {
  if (byRevenue) {
    return (
      <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium ring-1 ring-inset ring-rose-200 dark:ring-rose-900">
        por R$ perdido
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] font-medium ring-1 ring-inset ring-[color:var(--border)]">
      por nº de saídas
    </span>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
