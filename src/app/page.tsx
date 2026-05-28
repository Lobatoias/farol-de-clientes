import { getClients, isUsingMockData } from "@/lib/clients";
import { DashboardClient } from "@/components/dashboard-client";
import { KpiCards } from "@/components/kpi-cards";
import { SourceBanner } from "@/components/source-banner";

// Sempre renderizar no servidor a cada request — pra refletir Farol/dados
// atualizados em tempo real depois de mutações (POST /api/farol/[id]).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const clients = await getClients();
  const usingMock = isUsingMockData();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-sm text-[color:var(--muted-foreground)] mt-1">
            Estado de saúde de todos os clientes. Críticos no topo. Clique em um card para detalhes.
          </p>
        </div>
        <SourceBanner source={usingMock ? "mock" : "clickup"} count={clients.length} />
      </div>

      <KpiCards clients={clients} />

      <div className="border-t border-[color:var(--border)] pt-6">
        <DashboardClient clients={clients} />
      </div>
    </div>
  );
}
