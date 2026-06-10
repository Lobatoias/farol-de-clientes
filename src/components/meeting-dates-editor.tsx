"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CalendarClock, Check, Loader2 } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface MeetingDatesEditorProps {
  clientId: string;
  lastMeetingAt?: string; // ISO
  nextMeetingAt?: string; // ISO
}

type Field = "lastMeetingAt" | "nextMeetingAt";

/** ISO completo → valor de <input type="date"> (YYYY-MM-DD) */
function toDateInput(iso?: string): string {
  return iso ? iso.slice(0, 10) : "";
}

/**
 * Card "Reuniões" editável — grava direto nos campos de data da task
 * mestre no ClickUp (mesma fonte que o resto do app lê).
 */
export function MeetingDatesEditor({
  clientId,
  lastMeetingAt,
  nextMeetingAt,
}: MeetingDatesEditorProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    lastMeetingAt: toDateInput(lastMeetingAt),
    nextMeetingAt: toDateInput(nextMeetingAt),
  });
  const [saving, setSaving] = useState<Field | null>(null);
  const [savedOk, setSavedOk] = useState<Field | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setSaving(field);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${clientId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setSavedOk(field);
      setTimeout(() => setSavedOk(null), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const rows: Array<{
    field: Field;
    label: string;
    icon: typeof Calendar;
    max?: string;
  }> = [
    {
      field: "lastMeetingAt",
      label: "Última reunião",
      icon: Calendar,
      max: today,
    },
    {
      field: "nextMeetingAt",
      label: "Próxima reunião",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-4 text-sm transition-all hover:shadow-md">
      <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
        Reuniões
      </h4>
      <div className="space-y-3">
        {rows.map(({ field, label, icon: Icon, max }) => {
          const hint = values[field] ? formatRelative(values[field]) : "Sem data";
          return (
            <div
              key={field}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`meeting-${field}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--muted-foreground)]"
                >
                  <Icon className="size-3.5" />
                  {label}
                </label>
                {saving === field ? (
                  <Loader2 className="size-3.5 animate-spin text-[color:var(--muted-foreground)]" />
                ) : savedOk === field ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 animate-fade-in">
                    <Check className="size-3.5" />
                    salvo
                  </span>
                ) : (
                  <span className="text-[11px] text-[color:var(--muted-foreground)] truncate">
                    {hint}
                  </span>
                )}
              </div>
              <input
                id={`meeting-${field}`}
                type="date"
                value={values[field]}
                max={max}
                disabled={saving !== null}
                onChange={(e) => save(field, e.target.value)}
                className={cn(
                  "w-full h-9 px-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] font-medium text-sm",
                  "hover:border-[color:var(--muted-foreground)]/40",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60",
                  "transition-colors disabled:opacity-60",
                  !values[field] && "text-[color:var(--muted-foreground)]"
                )}
              />
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
          ⚠️ {error}
        </p>
      )}
      <p className="text-[10px] text-[color:var(--muted-foreground)] leading-relaxed">
        Salva direto no ClickUp ao escolher a data.
      </p>
    </div>
  );
}
