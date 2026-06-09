"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, ListChecks, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compara dois sets de inteiros — true se idênticos. */
function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

interface ActionChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: string[];
  /** Identificador único do escopo (clientId, "niche:X", "csm:Y", "global"). */
  scopeId: string;
  /** Qual checklist (corresponde à chave de ACTION_CHECKLISTS). */
  checklistKey: string;
  /** Índices inicialmente marcados (vindos do Supabase). */
  initialChecked: number[];
}

export function ActionChecklistDialog({
  open,
  onClose,
  title,
  subtitle,
  items,
  scopeId,
  checklistKey,
  initialChecked,
}: ActionChecklistDialogProps) {
  // Estado local sincroniza com initialChecked sempre que o diálogo reabre
  // Estabilizamos o set inicial pra evitar resets a cada re-render do parent
  const initialKey = useMemo(
    () => [...initialChecked].sort((a, b) => a - b).join(","),
    [initialChecked]
  );
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(initialChecked)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Garante que createPortal só roda no client (não no SSR)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Última versão persistida no servidor (referência) — pra evitar POSTs redundantes
  const lastPersistedRef = useRef<Set<number>>(new Set(initialChecked));
  // Timer do debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag pra distinguir mudança vinda do usuário vs vinda do sync
  const isSyncingRef = useRef(false);

  // Reset quando reabre com novo cliente/checklist (initialKey identifica o conteúdo)
  useEffect(() => {
    if (!open) return;
    isSyncingRef.current = true;
    setChecked(new Set(initialChecked));
    lastPersistedRef.current = new Set(initialChecked);
    setError(null);
    // Reset flag depois do próximo tick
    queueMicrotask(() => {
      isSyncingRef.current = false;
    });
    // initialChecked não é estável — usamos initialKey como proxy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scopeId, checklistKey, initialKey]);

  // ESC pra fechar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Persiste o estado atual no servidor (debounced).
  // Roda sempre que `checked` muda E não é uma sincronização vinda do server.
  useEffect(() => {
    if (!open) return;
    if (isSyncingRef.current) return;
    if (setsEqual(checked, lastPersistedRef.current)) return;

    // Debounce: cancela timer anterior, agenda novo POST em 400ms
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const snapshot = new Set(checked);
      const indices = [...snapshot].sort((a, b) => a - b);
      setSaving(true);
      try {
        const res = await fetch("/api/checklist-progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scopeId,
            checklistKey,
            checkedIndices: indices,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        lastPersistedRef.current = snapshot;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar");
      } finally {
        setSaving(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [checked, open, scopeId, checklistKey]);

  const progress = useMemo(() => {
    const done = items.reduce(
      (acc, _item, idx) => acc + (checked.has(idx) ? 1 : 0),
      0
    );
    return { done, total: items.length };
  }, [checked, items]);

  const allDone = progress.done === progress.total && progress.total > 0;

  function toggle(idx: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function reset() {
    setChecked(new Set());
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
          "w-full max-w-lg p-6 space-y-5 animate-fade-up max-h-[90vh] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
              <ListChecks className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2
                id="action-dialog-title"
                className="text-base font-semibold tracking-tight"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                  {subtitle}
                </p>
              )}
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

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                "font-medium tabular-nums",
                allDone
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[color:var(--muted-foreground)]"
              )}
            >
              {progress.done} de {progress.total} concluído{progress.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-[10px] text-[color:var(--muted-foreground)]">
                  salvando…
                </span>
              )}
              {progress.done > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-foreground)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <RotateCcw className="size-3" />
                  Resetar
                </button>
              )}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-[color:var(--muted)] overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 ease-out",
                allDone ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.done / progress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
          {error && (
            <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Lista de itens */}
        <ul className="space-y-2">
          {items.map((item, i) => {
            const isChecked = checked.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all group",
                    isChecked
                      ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20"
                      : "border-[color:var(--border)] hover:bg-[color:var(--muted)]/40 hover:border-[color:var(--muted-foreground)]/30"
                  )}
                  aria-pressed={isChecked}
                >
                  {/* Checkbox custom */}
                  <span
                    className={cn(
                      "size-6 rounded-md grid place-items-center text-[10px] font-bold tabular-nums shrink-0 mt-0.5 transition-all",
                      isChecked
                        ? "bg-emerald-500 text-white"
                        : "bg-[color:var(--muted)] text-[color:var(--foreground)] group-hover:bg-blue-100 dark:group-hover:bg-blue-950/60"
                    )}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <p
                    className={cn(
                      "text-sm leading-relaxed transition-all",
                      isChecked
                        ? "line-through text-[color:var(--muted-foreground)]"
                        : "text-[color:var(--foreground)]"
                    )}
                  >
                    {item}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-between gap-3">
          <p className="text-[11px] text-[color:var(--muted-foreground)] flex items-center gap-1.5 flex-1">
            <CheckCircle2 className="size-3 shrink-0" />
            <span className="leading-tight">
              {allDone
                ? "Tudo concluído. Bom trabalho."
                : "Marque os itens conforme avançar — fica salvo pra todo mundo do time."}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "text-xs font-medium px-3 h-8 rounded-md text-white transition-colors shrink-0",
              allDone
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {allDone ? "Fechar" : "Entendi"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
