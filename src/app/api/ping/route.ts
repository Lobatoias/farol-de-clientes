import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";
import { upsertTodaySnapshot } from "@/lib/metric-snapshots";

export const dynamic = "force-dynamic";

/**
 * Endpoint de health/warmup, chamado pelo GitHub Actions a cada 3 min:
 * 1. Mantém a função Vercel quente (sem cold start na próxima request real)
 * 2. Aquece o cache do getClients()
 * 3. Grava o snapshot diário de métricas (comparação histórica)
 *
 * Também serve como health check externo (UptimeRobot, Healthchecks.io, etc).
 */
export async function GET() {
  const t0 = Date.now();
  let count = 0;
  try {
    const clients = await getClients();
    count = clients.length;

    // Snapshot diário (upsert por data — 1 linha/dia, acumula a tendência)
    const active = clients.filter((c) => !c.isChurned);
    upsertTodaySnapshot({
      activeClients: active.length,
      activeMrr: active.reduce((s, c) => s + (c.monthlyRevenue ?? 0), 0),
      redCount: active.filter((c) => c.status === "vermelho").length,
      yellowCount: active.filter((c) => c.status === "amarelo").length,
      greenCount: active.filter((c) => c.status === "verde").length,
      churnedTotal: clients.filter((c) => c.isChurned).length,
    }).catch((err) => console.error("[Ping] snapshot falhou:", err));
  } catch (err) {
    console.error("[Ping] getClients falhou:", err);
  }
  return NextResponse.json({
    ok: true,
    clients: count,
    ms: Date.now() - t0,
    at: new Date().toISOString(),
  });
}
