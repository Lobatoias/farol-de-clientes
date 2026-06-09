"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, UserMinus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHURN_REASONS } from "@/lib/types";

interface ChurnDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export function ChurnDialog({
  open,
  onClose,
  clientId,
  clientName,
}: ChurnDialogProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [churnedAt, setChurnedAt] = useState(today);
  const [reason, setReason] = useState<string>(CHURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (open) {
      setChurnedAt(today);
      setReason(CHURN_REASONS[0]);
      setDetails("");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function submit() {
    if (saving) return;
    startSaving(async () => {
      try {
        const res = await fetch(`/api/churn/${clientId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            churnedAt,
            reason,
            reasonDetails: details.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        setError(null);
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar"
      />
      <div
        className={cn(
          "relative bg-[color:var(--card-elevated)] border border-[color:var(--border)] rounded-2xl shadow-2xl",
          "w-full max-w-md p-6 space-y-5 animate-fade-up"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
              <UserMinus className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Marcar saída
              </h2>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                {clientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-md hover:bg-[color:var(--muted)] grid place-items-center text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="churn-date"
              className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold"
            >
              Data da saída
            </label>
            <input
              id="churn-date"
              type="date"
              value={churnedAt}
              onChange={(e) => setChurnedAt(e.target.value)}
              max={today}
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="churn-reason"
              className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold"
            >
              Motivo principal
            </label>
            <select
              id="churn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
            >
              {CHURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="churn-details"
              className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold"
            >
              Detalhes (opcional)
            </label>
            <textarea
              id="churn-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Contexto, o que falamos com o cliente, lições aprendidas…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 resize-none"
              maxLength={1000}
            />
            <p className="text-[10px] text-[color:var(--muted-foreground)] text-right">
              {details.length}/1000
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3 flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              O cliente sai do Dashboard. CSM, mensalidade e nicho atuais
              ficam registrados como snapshot pra análise histórica.
            </p>
          </div>

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400">⚠️ {error}</p>
          )}
        </div>

        <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-medium px-3 h-9 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="text-xs font-medium px-4 h-9 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? "Salvando…" : "Confirmar saída"}
          </button>
        </div>
      </div>
    </div>
  );
}
