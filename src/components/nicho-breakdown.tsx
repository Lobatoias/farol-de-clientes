"use client";

import { useState } from "react";
import { PieChart, TrendingUp } from "lucide-react";
import type { Client } from "@/lib/types";
import { formatBRL } from "@/lib/utils";
import { DonutChart } from "./donut-chart";

interface NichoBreakdownProps {
  clients: Client[];
}

interface NichoStats {
  nicho: string;
  count: number;
  totalRevenue: number;
}

// Paleta deliberada — sem purple/pink (financial dashboard guideline)
// Trust blue + neutro + accent colors sólidos
const NICHO_PALETTE = [
  "#2563eb", // blue-600
  "#10b981", // emerald-500
  "#0891b2", // cyan-600
  "#f59e0b", // amber-500
  "#64748b", // slate-500
  "#0d9488", // teal-600
  "#e11d48", // rose-600 (último recurso)
];

export function NichoBreakdown({ clients }: NichoBreakdownProps) {
  const stats = buildStats(clients);
  const totalRevenue = stats.reduce((s, n) => s + n.totalRevenue, 0);
  const totalClients = stats.reduce((s, n) => s + n.count, 0);
  const hasRevenue = totalRevenue > 0;
  const showByCount = !hasRevenue;
  const totalForPct = showByCount ? totalClients : totalRevenue;

  const sorted = [...stats].sort((a, b) =>
    showByCount ? b.count - a.count : b.totalRevenue - a.totalRevenue
  );

  const segments = sorted.map((s, i) => ({
    label: s.nicho,
    value: showByCount ? s.count : s.totalRevenue,
    color: NICHO_PALETTE[i % NICHO_PALETTE.length],
  }));

  // Hover sincronizado entre donut e legenda
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:shadow-md animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
              <PieChart className="size-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              Distribuição por nicho
            </h3>
          </div>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {showByCount
              ? `Como sua base se reparte entre os ${stats.length} nichos`
              : `De onde vem o faturamento mensal`}
          </p>
        </div>
        <ModeBadge byRevenue={hasRevenue} />
      </div>

      {stats.length === 0 ? (
        <p className="text-sm text-[color:var(--muted-foreground)] py-8 text-center">
          Nenhum cliente com nicho definido.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
          {/* Donut */}
          <div className="flex justify-center lg:justify-start">
            <DonutChart
              segments={segments}
              size={210}
              thickness={32}
              centerValue={showByCount ? totalClients.toString() : formatBRL(totalRevenue)}
              centerLabel={showByCount ? "clientes" : "faturamento"}
              hoveredLabel={hovered}
              onHoverChange={setHovered}
              hoveredCenterFormat={(seg, pct) => ({
                value: showByCount
                  ? `${seg.value}`
                  : formatBRL(seg.value),
                label: `${seg.label} · ${pct.toFixed(pct < 10 ? 1 : 0)}%`,
              })}
            />
          </div>

          {/* Legenda + barras com stagger + hover sync */}
          <ul className="space-y-3">
            {sorted.map((stat, i) => {
              const value = showByCount ? stat.count : stat.totalRevenue;
              const pct = totalForPct > 0 ? (value / totalForPct) * 100 : 0;
              const color = NICHO_PALETTE[i % NICHO_PALETTE.length];
              const isHovered = hovered === stat.nicho;
              const isDimmed = hovered !== null && !isHovered;
              return (
                <li
                  key={stat.nicho}
                  className="group animate-fade-up cursor-pointer transition-opacity duration-200"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    opacity: isDimmed ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHovered(stat.nicho)}
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
                        className={`font-medium truncate transition-colors duration-200 ${
                          isHovered ? "text-[color:var(--foreground)]" : ""
                        }`}
                      >
                        {stat.nicho}
                      </span>
                      <span className="text-[11px] text-[color:var(--muted-foreground)] shrink-0 tabular-nums">
                        {stat.count}{" "}
                        {stat.count === 1 ? "cliente" : "clientes"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {!showByCount && stat.totalRevenue > 0 && (
                        <span className="text-xs text-[color:var(--muted-foreground)] tabular-nums">
                          {formatBRL(stat.totalRevenue)}
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
      )}

      {!hasRevenue && stats.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[color:var(--border)]">
          <p className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1.5">
            <TrendingUp className="size-3" />
            Quando você preencher mensalidades, a distribuição passa a refletir
            o faturamento em vez do nº de clientes.
          </p>
        </div>
      )}
    </div>
  );
}

function ModeBadge({ byRevenue }: { byRevenue: boolean }) {
  if (byRevenue) {
    return (
      <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900">
        por faturamento
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] font-medium ring-1 ring-inset ring-[color:var(--border)]">
      por nº de clientes
    </span>
  );
}

function buildStats(clients: Client[]): NichoStats[] {
  const map = new Map<string, NichoStats>();
  for (const c of clients) {
    const nicho = c.niche?.trim() || "Sem nicho";
    let s = map.get(nicho);
    if (!s) {
      s = { nicho, count: 0, totalRevenue: 0 };
      map.set(nicho, s);
    }
    s.count++;
    s.totalRevenue += c.monthlyRevenue ?? 0;
  }
  return Array.from(map.values());
}
