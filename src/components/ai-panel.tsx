"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";
import type { AIClientAnalysis, Client } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AIPanelProps {
  client: Client;
  analysis: AIClientAnalysis;
}

type Tab = "briefing" | "why" | "actions";

export function AIPanel({ client, analysis }: AIPanelProps) {
  const [tab, setTab] = useState<Tab>("briefing");
  const [regenerating, setRegenerating] = useState(false);

  function regenerate() {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 900);
  }

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-violet-50/40 via-[color:var(--card)] to-[color:var(--card)] dark:from-violet-950/20 dark:via-[color:var(--card)] dark:to-[color:var(--card)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[color:var(--border)] flex items-center justify-between bg-[color:var(--card)]/60">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-violet-500/10 grid place-items-center">
            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Análise da IA</h3>
            <p className="text-[11px] text-[color:var(--muted-foreground)]">
              Gerado a partir de tasks, reuniões e KPIs do ClickUp · mockado nesta versão
            </p>
          </div>
        </div>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] flex items-center gap-1 disabled:opacity-50"
        >
          {regenerating ? <Loader2 className="size-3 animate-spin" /> : null}
          Regerar
        </button>
      </div>

      <div className="px-5 pt-3 flex gap-1 border-b border-[color:var(--border)]">
        <TabButton active={tab === "briefing"} onClick={() => setTab("briefing")}>
          Resumir contexto
        </TabButton>
        <TabButton active={tab === "why"} onClick={() => setTab("why")}>
          Por que {client.status}?
        </TabButton>
        <TabButton active={tab === "actions"} onClick={() => setTab("actions")}>
          Sugerir ações
          <span className="ml-1 text-[10px] bg-[color:var(--muted)] px-1 rounded">
            {analysis.suggestedActions.length}
          </span>
        </TabButton>
      </div>

      <div className="p-5 text-sm leading-relaxed">
        {tab === "briefing" && (
          <p className="text-[color:var(--foreground)]">{analysis.briefing}</p>
        )}
        {tab === "why" && (
          <div
            className="prose prose-sm text-[color:var(--foreground)]"
            dangerouslySetInnerHTML={{
              __html: analysis.whyStatus.replace(/`([^`]+)`/g, '<code class="text-xs bg-[color:var(--muted)] px-1 py-0.5 rounded">$1</code>'),
            }}
          />
        )}
        {tab === "actions" && (
          <ul className="space-y-3">
            {analysis.suggestedActions.map((action, i) => (
              <li
                key={i}
                className="rounded-lg border border-[color:var(--border)] p-3 bg-[color:var(--card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="text-[color:var(--muted-foreground)] text-xs">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {action.title}
                    </div>
                    <p className="text-xs text-[color:var(--muted-foreground)] mt-1.5">
                      {action.rationale}
                    </p>
                  </div>
                  <ImpactBadge impact={action.impact} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 h-9 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center",
        active
          ? "border-violet-500 text-[color:var(--foreground)]"
          : "border-transparent text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

function ImpactBadge({ impact }: { impact: "alto" | "medio" | "baixo" }) {
  const map = {
    alto: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    medio: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    baixo: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span className={cn("text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded", map[impact])}>
      {impact}
    </span>
  );
}

export function AIPanelEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--border)] p-6 text-center">
      <Sparkles className="size-5 mx-auto text-violet-500 mb-2" />
      <p className="text-sm text-[color:var(--muted-foreground)]">{message}</p>
    </div>
  );
}

// Re-export helper for arrow icons used elsewhere
export { ChevronRight };
