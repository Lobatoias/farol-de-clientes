"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus, AlertTriangle, RotateCcw } from "lucide-react";
import { ChurnDialog } from "./churn-dialog";
import type { ChurnEvent } from "@/lib/types";
import { formatBRL, formatDate } from "@/lib/utils";

interface ClientChurnSectionProps {
  clientId: string;
  clientName: string;
  isChurned?: boolean;
  lastChurnEvent?: ChurnEvent;
}

export function ClientChurnSection({
  clientId,
  clientName,
  isChurned,
  lastChurnEvent,
}: ClientChurnSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [undoing, startUndo] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function undoChurn() {
    if (undoing) return;
    if (
      !confirm(
        "Desfazer a saída? O cliente volta pro Dashboard e o evento é apagado."
      )
    ) {
      return;
    }
    startUndo(async () => {
      try {
        const res = await fetch(`/api/churn/${clientId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao desfazer");
      }
    });
  }

  if (isChurned && lastChurnEvent) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-5 space-y-3 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 grid place-items-center">
              <UserMinus className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Cliente saiu em {formatDate(lastChurnEvent.churnedAt)}
              </h3>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                Não aparece mais no Dashboard, KPIs nem nas análises ativas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={undoChurn}
            disabled={undoing}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 h-8 rounded-md border border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="size-3" />
            {undoing ? "Desfazendo…" : "Desfazer saída"}
          </button>
        </div>

        <div className="pt-3 border-t border-rose-200/60 dark:border-rose-900/40 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-800/80 dark:text-rose-300/80 mb-1.5">
              Motivos ({lastChurnEvent.reasons.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lastChurnEvent.reasons.map((r) => (
                <span
                  key={r}
                  className="text-xs px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900/80"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ChurnFactBox
              label="CSM da época"
              value={lastChurnEvent.csmAtTime ?? "—"}
            />
            <ChurnFactBox
              label="Mensalidade perdida"
              value={
                lastChurnEvent.monthlyRevenueAtTime
                  ? formatBRL(lastChurnEvent.monthlyRevenueAtTime)
                  : "—"
              }
            />
            <ChurnFactBox
              label="Nicho"
              value={lastChurnEvent.nicheAtTime ?? "—"}
            />
          </dl>
        </div>

        {lastChurnEvent.reasonDetails && (
          <div className="pt-3 border-t border-rose-200/60 dark:border-rose-900/40">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-rose-800/80 dark:text-rose-300/80 mb-1">
              Detalhes
            </p>
            <p className="text-sm text-rose-900 dark:text-rose-100 leading-relaxed whitespace-pre-wrap">
              {lastChurnEvent.reasonDetails}
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-700 dark:text-rose-300">⚠️ {error}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[color:var(--border)] text-sm hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-900 hover:text-rose-700 dark:hover:text-rose-300 transition-all"
      >
        <UserPlus className="size-3.5 rotate-180" />
        Marcar como saída
      </button>
      <ChurnDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}

function ChurnFactBox({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 md:col-span-2" : ""}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-800/80 dark:text-rose-300/80">
        {label}
      </p>
      <p className="text-sm font-medium text-rose-900 dark:text-rose-100 mt-0.5">
        {value}
      </p>
    </div>
  );
}
