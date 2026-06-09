"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Quote,
  Compass,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChurnAnalysis } from "@/lib/ai-churn-patterns";

interface ChurnAIInsightsProps {
  hasEvents: boolean;
}

export function ChurnAIInsights({ hasEvents }: ChurnAIInsightsProps) {
  const [analysis, setAnalysis] = useState<ChurnAnalysis | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate(force = false) {
    if (pending) return;
    startTransition(async () => {
      try {
        const url = force
          ? "/api/ai/churn-patterns?force=1"
          : "/api/ai/churn-patterns";
        const res = await fetch(url, { method: "POST" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        setAnalysis(body.analysis);
        setCached(Boolean(body.cached));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao gerar análise");
      }
    });
  }

  // Cabeçalho da seção (sempre visível)
  return (
    <section className="space-y-4 animate-fade-up">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 grid place-items-center">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Análise de padrões com IA</h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Claude cruza saídas + notas de reunião + clientes em risco pra
              achar sinais sistêmicos
            </p>
          </div>
        </div>

        {hasEvents && (
          <button
            type="button"
            onClick={() => generate(analysis !== null)}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium transition-all",
              "bg-violet-600 text-white hover:bg-violet-700",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {pending ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Analisando…
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="size-3.5" />
                Atualizar análise
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Gerar análise
              </>
            )}
          </button>
        )}
      </header>

      {/* Estados */}
      {!hasEvents && <EmptyState />}

      {hasEvents && !analysis && !error && !pending && <PromptState />}

      {error && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            <p className="font-medium mb-1">Falha na análise</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {analysis && <AnalysisRender analysis={analysis} cached={cached} />}
    </section>
  );
}

// === Sub-states ===================================================

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
      <Sparkles className="size-6 mx-auto text-[color:var(--muted-foreground)] mb-2" />
      <p className="text-sm font-medium">Nada pra analisar ainda</p>
      <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
        Quando tiver saídas registradas, a IA pode rodar análise de padrões
        cruzando dados.
      </p>
    </div>
  );
}

function PromptState() {
  return (
    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 p-5 flex items-start gap-3">
      <Sparkles className="size-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
      <div className="space-y-2 flex-1">
        <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
          Pronto pra rodar
        </p>
        <p className="text-xs text-violet-800/80 dark:text-violet-300/80 leading-relaxed">
          A IA vai ler todas as saídas registradas + as notas das últimas
          reuniões + os clientes ativos em risco. Demora ~15s. Custa centavos
          em tokens. Cache de 1h.
        </p>
      </div>
    </div>
  );
}

// === Render da análise ============================================

function AnalysisRender({
  analysis,
  cached,
}: {
  analysis: ChurnAnalysis;
  cached: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Meta info */}
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
        <span>
          Modelo:{" "}
          <span className="text-[color:var(--foreground)] font-medium">
            {analysis.model}
          </span>
        </span>
        <span>·</span>
        <span>
          {analysis.eventsAnalyzed}{" "}
          {analysis.eventsAnalyzed === 1 ? "saída" : "saídas"} analisadas
        </span>
        {cached && (
          <>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              do cache
            </span>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5">
        <p className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold mb-2">
          Resumo executivo
        </p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Padrões */}
      {analysis.patterns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <Compass className="size-3" />
            Padrões sistêmicos ({analysis.patterns.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {analysis.patterns.map((p, i) => (
              <article
                key={i}
                className="rounded-2xl border border-[color:var(--border)] border-l-4 border-l-violet-500 bg-[color:var(--card-elevated)] p-5 space-y-3"
              >
                <header className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm">{p.title}</h4>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 shrink-0">
                    {p.affectedCount} {p.affectedCount === 1 ? "evento" : "eventos"}
                  </span>
                </header>
                <p className="text-xs text-[color:var(--muted-foreground)] leading-relaxed">
                  {p.rationale}
                </p>
                {p.evidence.length > 0 && (
                  <ul className="space-y-1 pt-2 border-t border-[color:var(--border)]">
                    {p.evidence.map((ev, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-[color:var(--muted-foreground)] flex items-start gap-1.5"
                      >
                        <ChevronRight className="size-3 shrink-0 mt-0.5 text-violet-500" />
                        <span className="leading-relaxed">{ev}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-2 border-t border-[color:var(--border)] flex items-start gap-2">
                  <Lightbulb className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium">Recomendação: </span>
                    {p.recommendation}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Verbal cues */}
      {analysis.verbalCues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <Quote className="size-3" />
            Frases recorrentes antes da saída
          </h3>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-4 space-y-2">
            {analysis.verbalCues.map((c, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 py-2 border-b border-[color:var(--border)] last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm italic">&ldquo;{c.phrase}&rdquo;</p>
                  {c.clientNames.length > 0 && (
                    <p className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5">
                      em: {c.clientNames.join(" · ")}
                    </p>
                  )}
                </div>
                <span className="text-xs tabular-nums text-[color:var(--muted-foreground)] shrink-0">
                  {c.occurrences}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Early warnings */}
      {analysis.earlyWarnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <TrendingDown className="size-3" />
            Sinais antecipados em clientes ativos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.earlyWarnings.map((w, i) => (
              <article
                key={i}
                className={cn(
                  "rounded-2xl border border-l-4 bg-[color:var(--card-elevated)] p-4 space-y-2",
                  w.riskLevel === "alto"
                    ? "border-rose-500 border-l-rose-500"
                    : w.riskLevel === "medio"
                    ? "border-amber-500 border-l-amber-500"
                    : "border-blue-500 border-l-blue-500"
                )}
              >
                <header className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">
                    {w.clientName}
                  </p>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0",
                      w.riskLevel === "alto"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                        : w.riskLevel === "medio"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    )}
                  >
                    {w.riskLevel}
                  </span>
                </header>
                <ul className="space-y-1">
                  {w.signals.map((s, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[color:var(--muted-foreground)] flex items-start gap-1.5"
                    >
                      <span className="text-[color:var(--muted-foreground)] mt-0.5">•</span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Preventive actions */}
      {analysis.preventiveActions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <Lightbulb className="size-3" />
            Ações preventivas pra essa semana
          </h3>
          <ol className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-4 space-y-2">
            {analysis.preventiveActions.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm leading-relaxed"
              >
                <span className="size-5 rounded-md bg-[color:var(--muted)] grid place-items-center text-[10px] font-bold tabular-nums shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
