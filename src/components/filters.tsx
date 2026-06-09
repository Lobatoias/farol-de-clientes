"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Client, Status } from "@/lib/types";
import { cn, statusConfig } from "@/lib/utils";
import { StatusDot } from "./status-badge";

interface FiltersProps {
  clients: Client[];
  onChange: (filtered: Client[]) => void;
}

const STATUS_ORDER: Status[] = ["vermelho", "amarelo", "verde"];

/** Busca acento-insensível: "joao" acha "João" */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function Filters({ clients, onChange }: FiltersProps) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set());
  const [owner, setOwner] = useState<string>("todos");

  const owners = Array.from(new Set(clients.map((c) => c.owner))).sort();

  function apply(nextQuery = query, nextStatuses = statuses, nextOwner = owner) {
    const q = normalize(nextQuery);
    const filtered = clients.filter((c) => {
      if (
        q &&
        !normalize(c.name).includes(q) &&
        !(c.niche && normalize(c.niche).includes(q)) &&
        !(c.owner && normalize(c.owner).includes(q))
      )
        return false;
      if (nextStatuses.size > 0 && !nextStatuses.has(c.status)) return false;
      if (nextOwner !== "todos" && c.owner !== nextOwner) return false;
      return true;
    });
    onChange(filtered);
  }

  function toggleStatus(s: Status) {
    const next = new Set(statuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStatuses(next);
    apply(query, next, owner);
  }

  function clearAll() {
    setQuery("");
    setStatuses(new Set());
    setOwner("todos");
    apply("", new Set(), "todos");
  }

  const hasFilters = query || statuses.size > 0 || owner !== "todos";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--muted-foreground)]" />
        <input
          type="text"
          aria-label="Buscar por cliente, nicho ou responsável"
          placeholder="Buscar cliente, nicho ou CSM…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            apply(e.target.value, statuses, owner);
          }}
          className="w-full pl-9 pr-3 h-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s) => {
          const cfg = statusConfig[s];
          const count = clients.filter((c) => c.status === s).length;
          const active = statuses.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-medium border transition-all duration-150 hover:-translate-y-0.5",
                active
                  ? `${cfg.bg} ${cfg.text} border-current shadow-sm`
                  : "border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
              )}
            >
              <StatusDot status={s} />
              {cfg.label}
              <span className="text-[10px] opacity-70 ml-0.5 tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      <select
        value={owner}
        onChange={(e) => {
          setOwner(e.target.value);
          apply(query, statuses, e.target.value);
        }}
        className="h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer hover:bg-[color:var(--muted)]"
      >
        <option value="todos">Todos os responsáveis</option>
        {owners.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 h-10 px-2.5 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors group"
        >
          <X className="size-3 transition-transform group-hover:rotate-90" />
          Limpar
        </button>
      )}
    </div>
  );
}
