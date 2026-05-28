import { getClients, isUsingMockData } from "@/lib/clients";
import { buildStrategicView } from "@/lib/strategy";
import { SourceBanner } from "@/components/source-banner";
import { StrategicViewBlock } from "@/components/strategic-view";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EstrategicoPage() {
  const clients = await getClients();
  const view = buildStrategicView(clients);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-end gap-6">
        <SourceBanner source={isUsingMockData() ? "mock" : "clickup"} count={clients.length} />
      </div>

      <StrategicViewBlock view={view} generatedAt={formatDate(new Date().toISOString())} />
    </div>
  );
}
