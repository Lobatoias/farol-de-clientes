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
    hint?: string;
    max?: string;
  }> = [
    {
      field: "lastMeetingAt",
      label: "Última",
      icon: Calendar,
      hint: values.lastMeetingAt
        ? formatRelative(values.lastMeetingAt)
        : undefined,
      max: today,
    },
    {
      field: "nextMeetingAt",
      label: "Próxima",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-3 text-sm transition-all hover:shadow-md">
      <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
        Reuniões
      </h4>
      {rows.map(({ field, label, icon: Icon, hint, max }) => (
        <div key={field} className="flex items-center gap-2">
          <Icon className="size-3.5 text-[color:var(--muted-foreground)] shrink-0" />
          <label
            htmlFor={`meeting-${field}`}
            className="shrink-0 text-[color:var(--muted-foreground)]"
          >
            {label}:
          </label>
          <input
            id={`meeting-${field}`}
            type="date"
            value={values[field]}
            max={max}
            disabled={saving !== null}
            onChange={(e) => save(field, e.target.value)}
            className={cn(
              "h-7 px-1.5 rounded-md border border-transparent bg-transparent font-medium text-sm",
              "hover:border-[color:var(--border)] hover:bg-[color:var(--muted)]/40",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60",
              "transition-colors disabled:opacity-60",
              !values[field] && "text-[color:var(--muted-foreground)]"
            )}
          />
          {saving === field && (
            <Loader2 className="size-3.5 animate-spin text-[color:var(--muted-foreground)]" />
          )}
          {savedOk === field && (
            <Check className="size-3.5 text-emerald-500 animate-fade-in" />
          )}
          {hint && saving !== field && savedOk !== field && (
            <span className="text-[11px] text-[color:var(--muted-foreground)] truncate">
              {hint}
            </span>
          )}
        </div>
      ))}
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
