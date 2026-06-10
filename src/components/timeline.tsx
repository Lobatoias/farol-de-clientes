"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ArrowRightLeft,
  Package,
  AlertTriangle,
  ListChecks,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  CircleCheck,
  RotateCcw,
  Loader2,
  PartyPopper,
} from "lucide-react";
import type { ClientEvent, EventType } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

interface TimelineProps {
  events: ClientEvent[];
  /** Quando presente, habilita concluir/reabrir tasks (sync no ClickUp). */
  clientId?: string;
}

const ICON_MAP: Record<EventType, React.ComponentType<{ className?: string }>> = {
  reuniao: Calendar,
  "mudanca-status": ArrowRightLeft,
  entrega: Package,
  incidente: AlertTriangle,
  tarefa: ListChecks,
  "ia-resumo": Sparkles,
};

const COLOR_MAP: Record<EventType, string> = {
  reuniao: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
  "mudanca-status": "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
  entrega: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  incidente: "text-rose-500 bg-rose-50 dark:bg-rose-950/40",
  tarefa: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800",
  "ia-resumo": "text-violet-500 bg-violet-50 dark:bg-violet-950/40",
};

const LABEL_MAP: Record<EventType, string> = {
  reuniao: "Reunião",
  "mudanca-status": "Status",
  entrega: "Entrega",
  incidente: "Incidente",
  tarefa: "Tarefa",
  "ia-resumo": "IA",
};

const STATUS_COLOR: Record<string, string> = {
  backlog: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  "a fazer": "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  todo: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  "in progress": "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  "em progresso": "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  closed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  "concluído": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  concluido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
};

/**
 * Concluída? Decide pelo TYPE do status do ClickUp (funciona com nomes
 * em qualquer idioma, ex. "concluído"). Fallback por nome.
 */
const DONE_STATUSES = new Set([
  "complete",
  "closed",
  "done",
  "concluído",
  "concluido",
]);

function isDone(ev: { status?: string; statusType?: string }): boolean {
  if (ev.statusType) return ev.statusType === "done" || ev.statusType === "closed";
  return !!ev.status && DONE_STATUSES.has(ev.status.toLowerCase());
}

type Tab = "abertas" | "concluidas" | "todas";

export function Timeline({ events, clientId }: TimelineProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("abertas");
  // Overrides otimistas: id da task → status novo (até o refresh chegar)
  const [overrides, setOverrides] = useState<
    Record<string, { status: string; statusType: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effective = useMemo(
    () =>
      events.map((ev) =>
        overrides[ev.id] ? { ...ev, ...overrides[ev.id] } : ev
      ),
    [events, overrides]
  );

  const open = effective.filter((ev) => !isDone(ev));
  const done = effective.filter((ev) => isDone(ev));
  const shown =
    tab === "abertas" ? open : tab === "concluidas" ? done : effective;

  async function changeStatus(ev: ClientEvent, action: "complete" | "reopen") {
    if (savingId) return;
    setSavingId(ev.id);
    setError(null);
    // Otimista: muda de aba na hora; nome real do status vem na resposta
    const optimistic =
      action === "complete"
        ? { status: "concluído", statusType: "done" }
        : { status: "a fazer", statusType: "open" };
    setOverrides((o) => ({ ...o, [ev.id]: optimistic }));
    try {
      const res = await fetch(`/api/tasks/${ev.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, clientId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      if (body.status) {
        setOverrides((o) => ({
          ...o,
          [ev.id]: { status: body.status, statusType: optimistic.statusType },
        }));
      }
      router.refresh();
    } catch (err) {
      // Reverte o otimismo
      setOverrides((o) => {
        const next = { ...o };
        delete next[ev.id];
        return next;
      });
      setError(err instanceof Error ? err.message : "Falha ao atualizar task");
    } finally {
      setSavingId(null);
    }
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted-foreground)]">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "abertas", label: "Abertas", count: open.length },
    { key: "concluidas", label: "Concluídas", count: done.length },
    { key: "todas", label: "Todas", count: effective.length },
  ];

  return (
    <div className="space-y-4">
      {/* Abas por status — evita a lista abarrotar no longo prazo */}
      <div className="flex items-center gap-1 flex-wrap" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5",
              tab === t.key
                ? "bg-[color:var(--muted)] text-[color:var(--foreground)] shadow-sm"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/50"
            )}
          >
            {t.label}
            <span className="text-[10px] tabular-nums opacity-70">
              ({t.count})
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          ⚠️ {error}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          {tab === "abertas" ? (
            <>
              <PartyPopper className="size-6 mx-auto text-emerald-500" />
              <p className="text-sm font-medium">Nenhuma tarefa aberta</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Tudo concluído por aqui — veja o histórico na aba Concluídas.
              </p>
            </>
          ) : (
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Nada por aqui ainda.
            </p>
          )}
        </div>
      ) : (
        <ol className="relative space-y-2">
          {shown.map((ev, i) => (
            <TimelineItem
              key={ev.id}
              event={ev}
              isLast={i === shown.length - 1}
              canMutate={!!clientId}
              saving={savingId === ev.id}
              onChangeStatus={(action) => changeStatus(ev, action)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function TimelineItem({
  event,
  isLast,
  canMutate,
  saving,
  onChangeStatus,
}: {
  event: ClientEvent;
  isLast: boolean;
  canMutate: boolean;
  saving: boolean;
  onChangeStatus: (action: "complete" | "reopen") => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICON_MAP[event.type];
  const colors = COLOR_MAP[event.type];
  const hasContent =
    !!event.description?.trim() || (event.commentCount && event.commentCount > 0);
  const statusKey = event.status?.toLowerCase() ?? "";
  const statusClass = STATUS_COLOR[statusKey] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  const done = isDone(event);

  return (
    <li className="relative pl-10">
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-3.5 top-9 bottom-[-0.5rem] w-px bg-[color:var(--border)]"
        />
      )}
      <span
        className={cn(
          "absolute left-0 top-2 size-7 rounded-full grid place-items-center",
          colors
        )}
      >
        <Icon className="size-3.5" />
      </span>

      {/* Ação concluir/reabrir — fora do botão de expandir (sem nesting) */}
      {canMutate && event.status && (
        <button
          type="button"
          onClick={() => onChangeStatus(done ? "reopen" : "complete")}
          disabled={saving}
          title={done ? "Reabrir no ClickUp" : "Concluir no ClickUp"}
          aria-label={
            done
              ? `Reabrir tarefa: ${event.title}`
              : `Concluir tarefa: ${event.title}`
          }
          className={cn(
            "absolute right-2 top-2 z-10 size-7 rounded-md grid place-items-center transition-colors",
            done
              ? "text-[color:var(--muted-foreground)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              : "text-[color:var(--muted-foreground)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          )}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : done ? (
            <RotateCcw className="size-4" />
          ) : (
            <CircleCheck className="size-4" />
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => hasContent && setOpen(!open)}
        disabled={!hasContent}
        className={cn(
          "w-full text-left rounded-lg px-3 py-2 border border-transparent transition-colors",
          canMutate && "pr-11",
          hasContent
            ? "hover:bg-[color:var(--muted)] hover:border-[color:var(--border)] cursor-pointer"
            : "cursor-default"
        )}
      >
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted-foreground)] flex-wrap">
          <span className="font-medium text-[color:var(--foreground)] uppercase tracking-wide text-[10px]">
            {LABEL_MAP[event.type]}
          </span>
          <span>·</span>
          <span title={formatDate(event.date)}>{formatRelative(event.date)}</span>
          {event.author && (
            <>
              <span>·</span>
              <span>{event.author}</span>
            </>
          )}
          {event.status && (
            <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium", statusClass)}>
              {event.status}
            </span>
          )}
          {hasContent ? (
            open ? (
              <ChevronDown className="size-3 ml-auto" />
            ) : (
              <ChevronRight className="size-3 ml-auto" />
            )
          ) : (
            <span className="ml-auto text-[10px] opacity-50">sem conteúdo</span>
          )}
        </div>
        <p
          className={cn(
            "text-sm font-medium mt-1",
            done && "line-through text-[color:var(--muted-foreground)]"
          )}
        >
          {event.title}
        </p>
        {!open && event.description && (
          <p className="text-xs text-[color:var(--muted-foreground)] mt-1 line-clamp-1">
            {event.description}
          </p>
        )}
      </button>

      {open && (
        <div className="ml-3 mt-1 pl-3 border-l border-[color:var(--border)] space-y-2 pb-2">
          {event.description ? (
            <div className="text-sm whitespace-pre-wrap text-[color:var(--foreground)] leading-relaxed bg-[color:var(--muted)] rounded-md p-3">
              {event.description}
            </div>
          ) : null}
          {event.commentCount && event.commentCount > 0 ? (
            <div className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1.5">
              <MessageSquare className="size-3" />
              {event.commentCount} comentário(s) — abra no ClickUp pra ver
            </div>
          ) : null}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              Abrir no ClickUp
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </li>
  );
}
