"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  const [reasons, setReasons] = useState<Set<string>>(() => new Set());
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // Garante que createPortal só roda no client (não no SSR)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setChurnedAt(today);
      setReasons(new Set());
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

  function toggleReason(r: string) {
    setReasons((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  function submit() {
    if (saving) return;
    if (reasons.size === 0) {
      setError("Selecione ao menos 1 motivo");
      return;
    }
    startSaving(async () => {
      try {
        const res = await fetch(`/api/churn/${clientId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            churnedAt,
            reasons: [...reasons],
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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 animate-fade-in"
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
          "w-full max-w-md p-6 space-y-5 animate-fade-up max-h-[92vh] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="churn-dialog-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
              <UserMinus className="size-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2
                id="churn-dialog-title"
                className="text-base font-semibold tracking-tight"
              >
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
              // Foco inicial no primeiro campo do form (a11y)
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="date"
              value={churnedAt}
              onChange={(e) => setChurnedAt(e.target.value)}
              max={today}
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
                Motivos da saída
              </span>
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  reasons.size > 0
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-[color:var(--muted-foreground)]"
                )}
              >
                {reasons.size} selecionado{reasons.size === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-1 max-h-56 overflow-y-auto rounded-lg border border-[color:var(--border)] p-1.5">
              {CHURN_REASONS.map((r) => {
                const isChecked = reasons.has(r);
                return (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => toggleReason(r)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors",
                        isChecked
                          ? "bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100"
                          : "hover:bg-[color:var(--muted)]/50"
                      )}
                      aria-pressed={isChecked}
                    >
                      <span
                        className={cn(
                          "size-4 rounded border grid place-items-center shrink-0 transition-all",
                          isChecked
                            ? "bg-rose-600 border-rose-600 text-white"
                            : "border-[color:var(--border)] bg-[color:var(--background)]"
                        )}
                      >
                        {isChecked && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="leading-tight">{r}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] text-[color:var(--muted-foreground)] leading-relaxed">
              Marque todos que se aplicam — ajuda a IA a achar padrões depois.
            </p>
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
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              ⚠️ {error}
            </p>
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
            disabled={saving || reasons.size === 0}
            className="text-xs font-medium px-4 h-9 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {saving ? "Salvando…" : "Confirmar saída"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
