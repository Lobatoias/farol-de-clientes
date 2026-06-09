import { getClients, isUsingMockData } from "@/lib/clients";
import { buildStrategicView } from "@/lib/strategy";
import { loadAndSyncProgress } from "@/lib/strategy-progress";
import { loadAllChurnEvents } from "@/lib/churn";
import { buildCsmStats } from "@/lib/churn-analytics";
import { SourceBanner } from "@/components/source-banner";
import { StrategicViewBlock } from "@/components/strategic-view";
import { CsmPerformance } from "@/components/csm-performance";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultRange(): { from: string; to: string } {
  // Default = últimos 30 dias
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from, to: todayISO() };
}

interface EstrategicoPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function EstrategicoPage({
  searchParams,
}: EstrategicoPageProps) {
  const sp = await searchParams;

  // Lê e valida o período da URL — fallback pro default se inválido
  const fallback = defaultRange();
  const rawFrom = typeof sp.from === "string" && ISO_DATE.test(sp.from) ? sp.from : fallback.from;
  const rawTo = typeof sp.to === "string" && ISO_DATE.test(sp.to) ? sp.to : fallback.to;
  // Garante from <= to
  const period = {
    from: rawFrom <= rawTo ? rawFrom : rawTo,
    to: rawFrom <= rawTo ? rawTo : rawFrom,
  };

  const [allClients, churnEvents] = await Promise.all([
    getClients(),
    loadAllChurnEvents(),
  ]);

  // Análise estratégica só considera clientes ativos
  const activeClients = allClients.filter((c) => !c.isChurned);
  const view = buildStrategicView(activeClients);
  const progressMap = await loadAndSyncProgress(view);

  const progress: Record<string, number[]> = {};
  for (const [k, v] of progressMap) progress[k] = v;

  // Filtra eventos pelo período selecionado e gera CSM stats
  const eventsInPeriod = churnEvents.filter(
    (e) => e.churnedAt >= period.from && e.churnedAt <= period.to
  );
  const csmStats = buildCsmStats(activeClients, eventsInPeriod);

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

      <CsmPerformance stats={csmStats} period={period} />
    </div>
  );
}
