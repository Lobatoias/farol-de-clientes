import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";

export const dynamic = "force-dynamic";

/**
 * Endpoint de health/warmup.
 *
 * Vercel chama via cron a cada 4 minutos pra:
 * 1. Manter a função quente (sem cold start na próxima request real)
 * 2. Aquecer o cache do getClients() (próximo carregamento de página é instantâneo)
 *
 * Também serve como health check externo (UptimeRobot, Healthchecks.io, etc).
 */
export async function GET() {
  const t0 = Date.now();
  let count = 0;
  try {
    const clients = await getClients();
    count = clients.length;
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
