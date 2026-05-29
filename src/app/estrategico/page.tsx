import { getClients, isUsingMockData } from "@/lib/clients";
import { buildStrategicView } from "@/lib/strategy";
import { loadAndSyncProgress } from "@/lib/strategy-progress";
import { SourceBanner } from "@/components/source-banner";
import { StrategicViewBlock } from "@/components/strategic-view";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EstrategicoPage() {
  const clients = await getClients();
  const view = buildStrategicView(clients);
  const progressMap = await loadAndSyncProgress(view);

  // Converte Map → objeto serializável pra passar como prop do server pro client
  const progress: Record<string, number[]> = {};
  for (const [k, v] of progressMap) progress[k] = v;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-end gap-6">
        <SourceBanner source={isUsingMockData() ? "mock" : "clickup"} count={clients.length} />
      </div>

      <StrategicViewBlock
        view={view}
        progress={progress}
        generatedAt={formatDate(new Date().toISOString())}
      />
    </div>
  );
}
