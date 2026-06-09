import Link from "next/link";
import { UserMinus } from "lucide-react";
import { getClients, isUsingMockData } from "@/lib/clients";
import { DashboardClient } from "@/components/dashboard-client";
import { KpiCards } from "@/components/kpi-cards";
import { SourceBanner } from "@/components/source-banner";

// Sempre renderizar no servidor a cada request — pra refletir Farol/dados
// atualizados em tempo real depois de mutações (POST /api/farol/[id]).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const allClients = await getClients();
  const churnedCount = allClients.filter((c) => c.isChurned).length;
  // Dashboard não exibe notas de reunião — strip pra encolher o payload RSC
  // (notas podem ser 5-10k chars por cliente; em 50+ clientes vira ~300KB
  // de HTML/JSON desnecessário trafegado pro browser)
  const activeClients = allClients
    .filter((c) => !c.isChurned)
    .map((c) => ({ ...c, meetingNotes: undefined }));
  const usingMock = isUsingMockData();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-sm text-[color:var(--muted-foreground)] mt-1">
            Estado de saúde de todos os clientes. Críticos no topo. Clique em um card para detalhes.
          </p>
          {churnedCount > 0 && (
            <Link
              href="/saidas"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-[color:var(--muted-foreground)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <UserMinus className="size-3" />
              {churnedCount}{" "}
              {churnedCount === 1 ? "cliente saiu" : "clientes saíram"} — ver
              histórico
            </Link>
          )}
        </div>
        <SourceBanner
          source={usingMock ? "mock" : "clickup"}
          count={activeClients.length}
        />
      </div>

      <KpiCards clients={activeClients} />

      <div className="border-t border-[color:var(--border)] pt-6">
        <DashboardClient clients={activeClients} />
      </div>
    </div>
  );
}
