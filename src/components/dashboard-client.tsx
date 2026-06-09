"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Filters } from "@/components/filters";
import { ClientCard } from "@/components/client-card";
import type { Client } from "@/lib/types";

const STATUS_ORDER: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2 };

interface DashboardClientProps {
  clients: Client[];
}

export function DashboardClient({ clients }: DashboardClientProps) {
  const [filtered, setFiltered] = useState<Client[]>(clients);
  // Incrementar a key remonta <Filters> com estado zerado (CTA do empty state)
  const [filtersKey, setFiltersKey] = useState(0);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return b.mrr - a.mrr;
    });
  }, [filtered]);

  function clearFilters() {
    setFiltersKey((k) => k + 1);
    setFiltered(clients);
  }

  return (
    <div className="space-y-4">
      <Filters key={filtersKey} clients={clients} onChange={setFiltered} />
      {sorted.length === 0 ? (
        <div className="text-center py-14 space-y-3 animate-fade-in">
          <div className="size-12 rounded-2xl bg-[color:var(--muted)] grid place-items-center mx-auto">
            <SearchX className="size-5 text-[color:var(--muted-foreground)]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Nenhum cliente bate com a busca e os filtros atuais.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((c, i) => (
            <div
              key={c.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 25, 600)}ms` }}
            >
              <ClientCard client={c} />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-[color:var(--muted-foreground)] pt-2">
        {sorted.length} de {clients.length} clientes mostrados.
      </p>
    </div>
  );
}
