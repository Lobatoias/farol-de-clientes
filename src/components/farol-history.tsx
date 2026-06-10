"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Pencil, Check, X, Loader2 } from "lucide-react";
import type { FarolChange, Status } from "@/lib/types";
import { cn, formatRelative, statusConfig } from "@/lib/utils";

interface FarolHistoryProps {
  clientId: string;
  currentStatus: Status;
  statusChangedAt: string;
  history: FarolChange[];
}

const SEG_COLOR: Record<Status, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-rose-500",
};

const LABEL: Record<Status, string> = {
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

export function FarolHistory({
  clientId,
  currentStatus,
  statusChangedAt,
  history,
}: FarolHistoryProps) {
  const cfg = statusConfig[currentStatus];

  // Tendência: segmentos coloridos por status ao longo do tempo.
  // history vem desc (recente→antigo); invertendo dá esquerda→direita.
  const segments = useMemo(() => {
    if (history.length === 0) return [];
    const asc = [...history].reverse();
    const now = Date.now();
    const spans = asc.map((c, i) => {
      const start = new Date(c.changedAt).getTime();
      const end =
        i < asc.length - 1
          ? new Date(asc[i + 1].changedAt).getTime()
          : now;
      return { status: c.toStatus, ms: Math.max(end - start, 0) };
    });
    const total = spans.reduce((s, x) => s + x.ms, 0) || 1;
    return spans.map((s) => ({
      status: s.status,
      pct: Math.max((s.ms / total) * 100, 4),
    }));
  }, [history]);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-md bg-[color:var(--muted)] grid place-items-center">
          <Activity className="size-3.5 text-[color:var(--muted-foreground)]" />
        </div>
        <h4 className="text-sm font-semibold">Histórico de saúde</h4>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full",
            cfg.bg,
            cfg.text
          )}
        >
          <span className={cn("size-1.5 rounded-full", cfg.dot)} />
          {LABEL[currentStatus]} · {formatRelative(statusChangedAt)}
        </span>
      </div>

      {segments.length > 0 && (
        <div
          className="flex h-2 rounded-full overflow-hidden"
          title="Tempo em cada cor (mais à direita = mais recente)"
          aria-hidden
        >
          {segments.map((s, i) => (
            <span
              key={i}
              className={SEG_COLOR[s.status]}
              style={{ width: `${s.pct}%` }}
            />
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)] leading-relaxed">
          O histórico começa a ser registrado a partir da próxima vez que você
          mudar o farol deste cliente.
        </p>
      ) : (
        <ul className="space-y-2 pt-1">
          {history.map((change) => (
            <HistoryRow key={change.id} change={change} clientId={clientId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  change,
  clientId,
}: {
  change: FarolChange;
  clientId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(change.reason ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/farol-history/${change.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: draft, taskId: clientId }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        {change.fromStatus && (
          <>
            <span className={cn("size-2 rounded-full", SEG_COLOR[change.fromStatus])} />
            <span className="text-[color:var(--muted-foreground)]">→</span>
          </>
        )}
        <span className={cn("size-2 rounded-full", SEG_COLOR[change.toStatus])} />
        <span className="font-medium">{LABEL[change.toStatus]}</span>
        <span className="text-[color:var(--muted-foreground)] ml-auto">
          {formatRelative(change.changedAt)}
        </span>
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            maxLength={300}
            placeholder="Por que mudou?"
            aria-label="Motivo da mudança"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="flex-1 h-7 px-2 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            aria-label="Salvar motivo"
            className="size-7 rounded-md bg-emerald-600 text-white grid place-items-center hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(change.reason ?? "");
              setEditing(false);
            }}
            aria-label="Cancelar"
            className="size-7 rounded-md border border-[color:var(--border)] grid place-items-center hover:bg-[color:var(--muted)]"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : change.reason ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group/r flex items-start gap-1.5 mt-1 text-left text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
        >
          <span className="leading-relaxed">{change.reason}</span>
          <Pencil className="size-3 shrink-0 mt-0.5 opacity-0 group-hover/r:opacity-100 transition-opacity" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-[color:var(--muted-foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          + motivo
        </button>
      )}
    </li>
  );
}
