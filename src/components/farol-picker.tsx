"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { Status } from "@/lib/types";
import { cn, statusConfig } from "@/lib/utils";

interface FarolPickerProps {
  clientId: string;
  currentStatus: Status;
  disabled?: boolean;
  size?: "sm" | "md";
}

const ORDER: Status[] = ["verde", "amarelo", "vermelho"];

export function FarolPicker({
  clientId,
  currentStatus,
  disabled = false,
  size = "sm",
}: FarolPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayed = optimistic ?? currentStatus;
  const cfg = statusConfig[displayed];

  function handleSelect(e: React.MouseEvent, status: Status) {
    e.preventDefault();
    e.stopPropagation();
    if (status === currentStatus || isPending) {
      setOpen(false);
      return;
    }
    setOptimistic(status);
    setError(null);
    setOpen(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/farol/${clientId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        router.refresh();
        // Mantém o optimistic mais tempo pra dar tempo do refresh chegar
        setTimeout(() => setOptimistic(null), 2500);
      } catch (err) {
        setOptimistic(null);
        setError(err instanceof Error ? err.message : "Falha");
        setTimeout(() => setError(null), 4000);
      }
    });
  }

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setOpen(!open);
  }

  return (
    <div
      className="relative inline-flex"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isPending}
        title={disabled ? "Cliente sem cadastro mestre" : "Mudar Farol"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium transition-colors",
          cfg.bg,
          cfg.ring,
          cfg.text,
          size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
          !disabled && "hover:brightness-110 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isPending ? (
          <Loader2 className={cn("animate-spin", size === "sm" ? "size-2.5" : "size-3")} />
        ) : (
          <span className={cn("rounded-full", cfg.dot, size === "sm" ? "size-1.5" : "size-2")} />
        )}
        <span className="uppercase tracking-wide">{cfg.label}</span>
      </button>

      {open && !disabled && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg overflow-hidden min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          {ORDER.map((s) => {
            const c = statusConfig[s];
            const active = s === displayed;
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => handleSelect(e, s)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[color:var(--muted)] transition-colors",
                  active && "bg-[color:var(--muted)]"
                )}
              >
                <span className={cn("size-2 rounded-full", c.dot)} />
                <span className="flex-1 text-left">{c.label}</span>
                {active && <Check className="size-3" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="absolute right-0 top-full mt-1 z-50 text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-1 rounded border border-rose-200 dark:border-rose-900 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
