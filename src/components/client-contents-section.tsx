"use client";

import { useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, Filter } from "lucide-react";
import {
  CONTENT_STATUS_LABEL,
  type Content,
  type ContentStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContentCard } from "./content-card";
import { ContentDialog } from "./content-dialog";

interface ClientContentsSectionProps {
  clientId: string;
  clientName: string;
  contents: Content[];
}

type Filter = "todos" | ContentStatus;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "em_producao", label: "Em produção" },
  { key: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { key: "agendado", label: "Agendados" },
  { key: "publicado", label: "Publicados" },
];

export function ClientContentsSection({
  clientId,
  clientName,
  contents,
}: ClientContentsSectionProps) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);

  // Contagens por status pra mostrar no tab
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      todos: contents.length,
      em_producao: 0,
      aguardando_aprovacao: 0,
      agendado: 0,
      publicado: 0,
    };
    for (const ct of contents) c[ct.status]++;
    return c;
  }, [contents]);

  const filtered = useMemo(() => {
    if (filter === "todos") return contents;
    return contents.filter((c) => c.status === filter);
  }, [contents, filter]);

  return (
    <section className="space-y-4 animate-fade-up">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
            <CalendarIcon className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Calendário de conteúdos</h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Posts, reels, stories e anúncios pra <strong>{clientName}</strong>
              {" "} · cliente aprova por link público sem precisar de login
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Novo conteúdo
        </button>
      </header>

      {/* Tabs de filtro */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-[color:var(--card-elevated)] text-[color:var(--foreground)] shadow-sm ring-1 ring-[color:var(--border)]"
                  : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/40"
              )}
            >
              {f.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
                    active
                      ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                      : "bg-[color:var(--muted)]"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          isFiltered={filter !== "todos"}
          onCreate={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ContentCard
              key={c.id}
              content={c}
              onEdit={() => setEditing(c)}
            />
          ))}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <ContentDialog
        open={creating}
        onClose={() => setCreating(false)}
        taskId={clientId}
      />
      <ContentDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        taskId={clientId}
        editing={editing ?? undefined}
      />
    </section>
  );
}

function EmptyState({
  isFiltered,
  onCreate,
}: {
  isFiltered: boolean;
  onCreate: () => void;
}) {
  if (isFiltered) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
        <Filter className="size-6 mx-auto text-[color:var(--muted-foreground)]/50 mb-2" />
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Nenhum conteúdo nesse filtro.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-12 text-center space-y-3">
      <CalendarIcon className="size-8 mx-auto text-[color:var(--muted-foreground)]/50" />
      <div>
        <p className="text-sm font-medium">Nenhum conteúdo cadastrado</p>
        <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
          Comece criando o primeiro post, reel ou story.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <Plus className="size-4" />
        Criar primeiro conteúdo
      </button>
    </div>
  );
}
