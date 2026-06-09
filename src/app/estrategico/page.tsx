import { getClients, isUsingMockData } from "@/lib/clients";
import { buildStrategicView } from "@/lib/strategy";
import { loadAndSyncProgress } from "@/lib/strategy-progress";
import { loadAllChurnEvents } from "@/lib/churn";
import { buildChurnBuckets, buildCsmStats } from "@/lib/churn-analytics";
import { SourceBanner } from "@/components/source-banner";
import { StrategicViewBlock } from "@/components/strategic-view";
import { CsmPerformance } from "@/components/csm-performance";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EstrategicoPage() {
  const [allClients, churnEvents] = await Promise.all([
    getClients(),
    loadAllChurnEvents(),
  ]);

  // Análise estratégica e progresso só consideram clientes ativos
  const activeClients = allClients.filter((c) => !c.isChurned);
  const view = buildStrategicView(activeClients);
  const progressMap = await loadAndSyncProgress(view);

  const progress: Record<string, number[]> = {};
  for (const [k, v] of progressMap) progress[k] = v;

  // CSM stats: ativos vs saídas dos últimos 12 meses
  const buckets = buildChurnBuckets(churnEvents);
  const last12 = buckets.find((b) => b.label === "Últimos 12 meses");
  const eventsLast12mo = last12
    ? churnEvents.filter(
        (e) => e.churnedAt >= last12.from && e.churnedAt <= last12.to
      )
    : [];
  const csmStats = buildCsmStats(activeClients, eventsLast12mo);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-end gap-6">
        <SourceBanner
          source={isUsingMockData() ? "mock" : "clickup"}
          count={activeClients.length}
        />
      </div>

      <StrategicViewBlock
        view={view}
        progress={progress}
        generatedAt={formatDate(new Date().toISOString())}
      />

      <CsmPerformance stats={csmStats} periodLabel="Últimos 12 meses" />
    </div>
  );
}
