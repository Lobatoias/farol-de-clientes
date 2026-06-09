"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, ChevronRight, Search } from "lucide-react";
import type { ChurnEvent } from "@/lib/types";
import { CHURN_REASONS } from "@/lib/types";
import { cn, formatBRL, formatDate } from "@/lib/utils";

interface EnrichedChurnEvent extends ChurnEvent {
  clientName: string;
}

interface ChurnHistoryClientProps {
  events: EnrichedChurnEvent[];
}

const PERIOD_OPTIONS = [
  { value: "all", label: "Tudo" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 3 meses" },
  { value: "180", label: "Últimos 6 meses" },
  { value: "365", label: "Últimos 12 meses" },
] as const;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ChurnHistoryClient({ events }: ChurnHistoryClientProps) {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>(
    "all"
  );
  const [reason, setReason] = useState<string>("all");
  const [csm, setCsm] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Coleta os CSMs únicos pra dropdown
  const csmOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.csmAtTime) set.add(e.csmAtTime);
    }
    return [...set].sort();
  }, [events]);

  // Filtra
  const filtered = useMemo(() => {
    const periodFrom = period === "all" ? null : daysAgoISO(parseInt(period));
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (periodFrom && e.churnedAt < periodFrom) return false;
      if (reason !== "all" && !e.reasons.includes(reason as never)) return false;
      if (csm !== "all" && (e.csmAtTime ?? "") !== csm) return false;
      if (q && !e.clientName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, period, reason, csm, query]);

  const totalLost = filtered.reduce(
    (s, e) => s + (e.monthlyRevenueAtTime ?? 0),
    0
  );

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
          <Filter className="size-3" />
          Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <FilterField
            label="Período"
            value={period}
            onChange={(v) => setPeriod(v as typeof period)}
            options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <FilterField
            label="Motivo"
            value={reason}
            onChange={setReason}
            options={[
              { value: "all", label: "Todos" },
              ...CHURN_REASONS.map((r) => ({ value: r, label: r })),
            ]}
          />
          <FilterField
            label="Responsável"
            value={csm}
            onChange={setCsm}
            options={[
              { value: "all", label: "Todos" },
              ...csmOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold block">
              Cliente
            </label>
            <div className="relative">
              <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nome…"
                className="w-full h-9 pl-7 pr-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </div>
          </div>
        </div>

        {/* Contadores */}
        <div className="flex items-center justify-between pt-2 border-t border-[color:var(--border)] text-xs">
          <span className="text-[color:var(--muted-foreground)]">
            <span className="font-semibold text-[color:var(--foreground)] tabular-nums">
              {filtered.length}
            </span>{" "}
            de {events.length}{" "}
            {events.length === 1 ? "evento" : "eventos"}
          </span>
          {totalLost > 0 && (
            <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums">
              {formatBRL(totalLost)} de MRR perdido
            </span>
          )}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Nenhum evento bate com os filtros.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] overflow-hidden">
          <ul>
            {filtered.map((e) => (
              <li
                key={e.id}
                className="border-b border-[color:var(--border)] last:border-0"
              >
                <Link
                  href={`/cliente/${e.taskId}`}
                  className="block px-4 py-3 hover:bg-[color:var(--muted)]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold truncate">
                          {e.clientName}
                        </span>
                        {e.reasons.map((r) => (
                          <span
                            key={r}
                            className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-[color:var(--muted-foreground)]">
                        Saiu em{" "}
                        <span className="text-[color:var(--foreground)] font-medium">
                          {formatDate(e.churnedAt)}
                        </span>
                        {e.csmAtTime && (
                          <>
                            {" · "}
                            CSM da época:{" "}
                            <span className="text-[color:var(--foreground)] font-medium">
                              {e.csmAtTime}
                            </span>
                          </>
                        )}
                        {e.nicheAtTime && (
                          <>
                            {" · "}
                            {e.nicheAtTime}
                          </>
                        )}
                      </p>
                      {e.reasonDetails && (
                        <p className="text-xs text-[color:var(--muted-foreground)] line-clamp-2 leading-relaxed mt-1">
                          {e.reasonDetails}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          e.monthlyRevenueAtTime
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-[color:var(--muted-foreground)]"
                        )}
                      >
                        {e.monthlyRevenueAtTime
                          ? formatBRL(e.monthlyRevenueAtTime)
                          : "—"}
                      </span>
                      <span className="text-[10px] text-[color:var(--muted-foreground)]">
                        /mês perdido
                      </span>
                      <ChevronRight className="size-3 text-[color:var(--muted-foreground)] mt-1" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
