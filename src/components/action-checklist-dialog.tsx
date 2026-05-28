"use client";

import { useEffect } from "react";
import { X, CheckCircle2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: string[];
}

export function ActionChecklistDialog({
  open,
  onClose,
  title,
  subtitle,
  items,
}: ActionChecklistDialogProps) {
  // ESC pra fechar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
          "w-full max-w-lg p-6 space-y-5 animate-fade-up"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
      >
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

        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--muted)]/30 transition-colors group"
            >
              <span className="size-6 rounded-md bg-[color:var(--muted)] grid place-items-center text-[10px] font-bold tabular-nums shrink-0 mt-0.5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 transition-colors">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>

        <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-between">
          <p className="text-[11px] text-[color:var(--muted-foreground)] flex items-center gap-1.5">
            <CheckCircle2 className="size-3" />
            Checklist sugerida — adapte ao contexto do seu cliente
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 h-8 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
