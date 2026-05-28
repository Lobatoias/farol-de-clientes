"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { ClientEvent, EventType } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";

interface TimelineProps {
  events: ClientEvent[];
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
};

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted-foreground)]">
        Nenhum evento registrado ainda.
      </p>
    );
  }
  return (
    <ol className="relative space-y-2">
      {events.map((ev, i) => (
        <TimelineItem key={ev.id} event={ev} isLast={i === events.length - 1} />
      ))}
    </ol>
  );
}

function TimelineItem({ event, isLast }: { event: ClientEvent; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = ICON_MAP[event.type];
  const colors = COLOR_MAP[event.type];
  const hasContent =
    !!event.description?.trim() || (event.commentCount && event.commentCount > 0);
  const statusKey = event.status?.toLowerCase() ?? "";
  const statusClass = STATUS_COLOR[statusKey] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

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

      <button
        type="button"
        onClick={() => hasContent && setOpen(!open)}
        disabled={!hasContent}
        className={cn(
          "w-full text-left rounded-lg px-3 py-2 border border-transparent transition-colors",
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
        <p className="text-sm font-medium mt-1">{event.title}</p>
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
