"use client";

import { useMemo, useState } from "react";
import { Filters } from "@/components/filters";
import { ClientCard } from "@/components/client-card";
import type { Client } from "@/lib/types";

const STATUS_ORDER: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2 };

interface DashboardClientProps {
  clients: Client[];
}

export function DashboardClient({ clients }: DashboardClientProps) {
  const [filtered, setFiltered] = useState<Client[]>(clients);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return b.mrr - a.mrr;
    });
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Filters clients={clients} onChange={setFiltered} />
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-[color:var(--muted-foreground)]">
          Nenhum cliente bate com os filtros.
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
