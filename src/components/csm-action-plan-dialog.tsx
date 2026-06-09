"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Target,
  Compass,
  Quote,
  Lightbulb,
  Users,
  CalendarClock,
  MessageSquare,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import type { CsmActionPlan } from "@/lib/ai-csm-action-plan";

interface CsmActionPlanDialogProps {
  open: boolean;
  onClose: () => void;
  csm: string;
  /** Métricas básicas pra mostrar antes da geração (do CsmPerformance). */
  preview?: {
    activeCount: number;
    churnCount: number;
    churnRatePct: number;
    activeMrr: number;
    churnMrrLost: number;
  };
}

export function CsmActionPlanDialog({
  open,
  onClose,
  csm,
  preview,
}: CsmActionPlanDialogProps) {
  const [plan, setPlan] = useState<CsmActionPlan | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setError(null);
      // não limpa plan — preserva resultado entre reabertas
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function generate(force = false) {
    if (pending) return;
    startTransition(async () => {
      try {
        const qs = force ? "?force=1" : "";
        const res = await fetch(`/api/ai/csm-action-plan${qs}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ csm }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setPlan(body.plan);
        setCached(Boolean(body.cached));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao gerar");
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
          "w-full max-w-3xl p-6 space-y-5 animate-fade-up max-h-[92vh] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="csm-plan-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 grid place-items-center shrink-0">
              <Target className="size-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
                Plano de ação
              </p>
              <h2
                id="csm-plan-dialog-title"
                className="text-lg font-bold tracking-tight truncate"
              >
                {csm}
              </h2>
              {preview && (
                <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                  Churn rate{" "}
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {preview.churnRatePct.toFixed(1)}%
                  </span>{" "}
                  · {preview.churnCount} saídas /{" "}
                  {preview.activeCount} ativos
                  {preview.churnMrrLost > 0 && (
                    <>
                      {" · "}
                      <span className="text-rose-600 dark:text-rose-400">
                        {formatBRL(preview.churnMrrLost)}
                      </span>{" "}
                      perdido/mês
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-md hover:bg-[color:var(--muted)] grid place-items-center text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Estado inicial — sem plan ainda */}
        {!plan && !error && !pending && (
          <div className="rounded-xl border border-violet-200/60 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  Pronto pra gerar
                </p>
                <p className="text-xs text-violet-800/80 dark:text-violet-300/80 leading-relaxed">
                  A IA vai cruzar saídas sob <strong>{csm}</strong> + notas
                  das reuniões + clientes ativos dele em risco. Retorna
                  diagnóstico + plano 7/30/90 dias + roteiro de check-in.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => generate(false)}
              className="w-full h-10 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="size-4" />
              Gerar plano de ação
            </button>
          </div>
        )}

        {/* Loading */}
        {pending && (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-8 text-center space-y-2">
            <RefreshCw className="size-6 mx-auto text-violet-500 animate-spin" />
            <p className="text-sm font-medium">Analisando dados…</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Cruzando saídas + notas de reunião + ativos em risco
            </p>
          </div>
        )}

        {/* Erro */}
        {error && !pending && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex items-start gap-3"
          >
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-medium mb-1">Falha ao gerar</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Plano gerado */}
        {plan && !pending && (
          <div className="space-y-5">
            {/* Meta + atualizar */}
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
              <span className="text-[color:var(--muted-foreground)]">
                Modelo:{" "}
                <span className="text-[color:var(--foreground)] font-medium">
                  {plan.model}
                </span>
                {cached && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {" · do cache"}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors normal-case"
              >
                <RefreshCw className="size-3" />
                Regerar análise
              </button>
            </div>

            {/* Situação */}
            <Card icon={<Compass className="size-4" />} label="Situação atual">
              <p className="text-sm leading-relaxed">{plan.situacao}</p>
            </Card>

            {/* Diagnóstico */}
            {plan.diagnostico.length > 0 && (
              <Card
                icon={<AlertTriangle className="size-4" />}
                label={`Diagnóstico (${plan.diagnostico.length})`}
              >
                <div className="space-y-3">
                  {plan.diagnostico.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg border-l-2 border-rose-500 pl-3 py-1 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{d.causa}</p>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shrink-0">
                          {d.afetados} {d.afetados === 1 ? "evento" : "eventos"}
                        </span>
                      </div>
                      {d.evidencia.length > 0 && (
                        <ul className="space-y-0.5">
                          {d.evidencia.map((e, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[color:var(--muted-foreground)] leading-relaxed"
                            >
                              · {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Padrões nas reuniões */}
            {plan.padroesReunioes.length > 0 && (
              <Card icon={<Quote className="size-4" />} label="Padrões nas reuniões">
                <div className="space-y-2">
                  {plan.padroesReunioes.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-[color:var(--muted)]/40 p-3 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm italic">&ldquo;{p.padrao}&rdquo;</p>
                        <span className="text-[10px] tabular-nums text-[color:var(--muted-foreground)] shrink-0">
                          {p.ocorrencias}×
                        </span>
                      </div>
                      {p.exemplos.length > 0 && (
                        <p className="text-[10px] text-[color:var(--muted-foreground)]">
                          {p.exemplos.join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Sinais em ativos */}
            {plan.sinaisEmAtivos.length > 0 && (
              <Card
                icon={<Users className="size-4" />}
                label={`Sinais em clientes ativos (${plan.sinaisEmAtivos.length})`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plan.sinaisEmAtivos.map((s, i) => (
                    <article
                      key={i}
                      className={cn(
                        "rounded-lg border-l-4 bg-[color:var(--background)] p-3 space-y-1",
                        s.severidade === "alta"
                          ? "border-rose-500"
                          : s.severidade === "media"
                          ? "border-amber-500"
                          : "border-blue-500"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">
                          {s.cliente}
                        </p>
                        <span
                          className={cn(
                            "text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0",
                            s.severidade === "alta"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                              : s.severidade === "media"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          )}
                        >
                          {s.severidade}
                        </span>
                      </div>
                      <p className="text-xs text-[color:var(--muted-foreground)] leading-relaxed">
                        {s.alerta}
                      </p>
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {/* Plano 7/30/90 dias */}
            <Card
              icon={<CalendarClock className="size-4" />}
              label="Plano de ação"
            >
              <div className="space-y-4">
                <Horizonte
                  label="Próximos 7 dias"
                  badgeClass="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                  items={plan.plano.imediato}
                />
                <Horizonte
                  label="Próximos 30 dias"
                  badgeClass="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                  items={plan.plano.trintaDias}
                />
                <Horizonte
                  label="Próximos 90 dias"
                  badgeClass="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                  items={plan.plano.noventaDias}
                />
              </div>
            </Card>

            {/* Check-in com o CSM */}
            {(plan.checkIn.topicos.length > 0 ||
              plan.checkIn.perguntasChave.length > 0) && (
              <Card
                icon={<MessageSquare className="size-4" />}
                label="Roteiro de check-in com o CSM"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.checkIn.topicos.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold mb-2">
                        Tópicos
                      </p>
                      <ul className="space-y-1.5">
                        {plan.checkIn.topicos.map((t, i) => (
                          <li
                            key={i}
                            className="text-sm leading-relaxed flex items-start gap-1.5"
                          >
                            <Lightbulb className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.checkIn.perguntasChave.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold mb-2">
                        Perguntas-chave
                      </p>
                      <ul className="space-y-1.5">
                        {plan.checkIn.perguntasChave.map((q, i) => (
                          <li
                            key={i}
                            className="text-sm leading-relaxed flex items-start gap-1.5"
                          >
                            <span className="text-[color:var(--muted-foreground)] shrink-0 mt-0.5">?</span>
                            <span className="italic">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 h-9 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Card({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </h3>
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        {children}
      </div>
    </section>
  );
}

function Horizonte({
  label,
  badgeClass,
  items,
}: {
  label: string;
  badgeClass: string;
  items: string[];
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full inline-block mb-2",
          badgeClass
        )}
      >
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)] italic">
          Nenhuma ação prevista pra esse horizonte.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
              <span className="size-5 rounded-md bg-[color:var(--muted)] grid place-items-center text-[10px] font-bold tabular-nums shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
