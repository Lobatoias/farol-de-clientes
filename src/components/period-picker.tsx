"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  /** ISO YYYY-MM-DD */
  from: string;
  /** ISO YYYY-MM-DD */
  to: string;
}

interface Preset {
  key: string;
  label: string;
  compute: () => DateRange;
}

// === Helpers de data ===============================================

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function lastMonthRange(): DateRange {
  const now = new Date();
  const m = now.getMonth() - 1;
  const year = m < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = m < 0 ? 11 : m;
  const from = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { from, to };
}

export const PRESETS: Preset[] = [
  { key: "today", label: "Hoje", compute: () => ({ from: todayISO(), to: todayISO() }) },
  { key: "yesterday", label: "Ontem", compute: () => ({ from: daysAgoISO(1), to: daysAgoISO(1) }) },
  { key: "7d", label: "Últimos 7 dias", compute: () => ({ from: daysAgoISO(7), to: todayISO() }) },
  { key: "14d", label: "Últimos 14 dias", compute: () => ({ from: daysAgoISO(14), to: todayISO() }) },
  { key: "30d", label: "Últimos 30 dias", compute: () => ({ from: daysAgoISO(30), to: todayISO() }) },
  { key: "this-month", label: "Este mês", compute: () => ({ from: thisMonthStart(), to: todayISO() }) },
  { key: "last-month", label: "Mês passado", compute: () => lastMonthRange() },
  { key: "90d", label: "Últimos 3 meses", compute: () => ({ from: daysAgoISO(90), to: todayISO() }) },
  { key: "180d", label: "Últimos 6 meses", compute: () => ({ from: daysAgoISO(180), to: todayISO() }) },
  { key: "365d", label: "Últimos 12 meses", compute: () => ({ from: daysAgoISO(365), to: todayISO() }) },
  { key: "max", label: "Máximo", compute: () => ({ from: "1900-01-01", to: todayISO() }) },
];

/** Formata "10 de mai. – 08 de jun. de 2026" */
export function formatRangeBR(range: DateRange): string {
  const from = new Date(range.from + "T00:00:00");
  const to = new Date(range.to + "T00:00:00");
  const fromYear = from.getFullYear();
  const toYear = to.getFullYear();

  const fromStr = from
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
  const toStr = to
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");

  if (range.from === range.to) {
    return `${fromStr} de ${toYear}`;
  }
  if (fromYear === toYear) {
    return `${fromStr} – ${toStr} de ${toYear}`;
  }
  return `${fromStr} de ${fromYear} – ${toStr} de ${toYear}`;
}

/** Tenta achar o preset que corresponde exatamente ao range. */
export function findMatchingPreset(range: DateRange): Preset | null {
  for (const p of PRESETS) {
    const r = p.compute();
    if (r.from === range.from && r.to === range.to) return p;
  }
  return null;
}

// === Componente =====================================================

interface PeriodPickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Alinhamento do dropdown. */
  align?: "left" | "right";
}

export function PeriodPicker({ value, onChange, align = "left" }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);

  // Sync custom inputs quando value muda externamente
  useEffect(() => {
    setCustomFrom(value.from);
    setCustomTo(value.to);
  }, [value.from, value.to]);

  // Click fora pra fechar
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open]);

  const matched = useMemo(() => findMatchingPreset(value), [value]);
  const triggerLabel = matched?.label ?? "Personalizado";
  const dateLabel = formatRangeBR(value);

  function pickPreset(p: Preset) {
    onChange(p.compute());
    setOpen(false);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    // Se from > to, troca pra usuário não perder tempo
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    onChange({ from, to });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg",
          "border border-[color:var(--border)] bg-[color:var(--card-elevated)]",
          "text-sm hover:border-[color:var(--muted-foreground)]/40 transition-all",
          open && "border-blue-500/60 ring-2 ring-blue-500/20"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Calendar className="size-3.5 text-[color:var(--muted-foreground)]" />
        <span className="font-medium">{triggerLabel}</span>
        <span className="text-xs text-[color:var(--muted-foreground)] hidden md:inline">
          {dateLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-3 text-[color:var(--muted-foreground)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-72 rounded-xl",
            "bg-[color:var(--card-elevated)] border border-[color:var(--border)] shadow-2xl",
            "animate-fade-up",
            align === "right" ? "right-0" : "left-0"
          )}
          role="listbox"
        >
          <ul className="py-1.5 max-h-72 overflow-y-auto">
            {PRESETS.map((p) => {
              const selected = matched?.key === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => pickPreset(p)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left",
                      "hover:bg-[color:var(--muted)]/60 transition-colors",
                      selected && "bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium"
                    )}
                  >
                    <span>{p.label}</span>
                    {selected && <Check className="size-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[color:var(--border)] p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              Período personalizado
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={todayISO()}
                className="flex-1 min-w-0 h-9 px-2 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
              <span className="text-[color:var(--muted-foreground)]">–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                max={todayISO()}
                className="flex-1 min-w-0 h-9 px-2 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="w-full h-9 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar período
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
