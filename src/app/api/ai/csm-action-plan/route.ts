import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";
import { loadAllChurnEvents } from "@/lib/churn";
import {
  generateCsmActionPlan,
  type CsmActionPlan,
} from "@/lib/ai-csm-action-plan";
import { ANTHROPIC_CONFIGURED } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

// Cache 1h por CSM. Chave: nome do CSM + hash dos eventos sob ele.
interface CacheEntry {
  plan: CsmActionPlan;
  expiresAt: number;
  hash: string;
}
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function hashFor(csm: string, eventIds: number[]): string {
  const sorted = [...eventIds].sort((a, b) => a - b).join(",");
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) {
    h = ((h << 5) + h) ^ sorted.charCodeAt(i);
  }
  return `${csm}::${sorted.length}::${h >>> 0}`;
}

export async function POST(request: Request) {
  if (!ANTHROPIC_CONFIGURED) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY não configurada na Vercel. Sem ela, planos de ação com IA ficam desligados.",
      },
      { status: 503 }
    );
  }

  let body: { csm?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csm = typeof body.csm === "string" ? body.csm.trim() : "";
  if (!csm) {
    return NextResponse.json(
      { error: "csm é obrigatório" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const [allClients, events] = await Promise.all([
      getClients(),
      loadAllChurnEvents(),
    ]);

    const csmEvents = events.filter(
      (e) => (e.csmAtTime || "Sem responsável") === csm
    );
    if (csmEvents.length === 0) {
      return NextResponse.json(
        { error: `Nenhuma saída registrada sob "${csm}".` },
        { status: 400 }
      );
    }

    const hash = hashFor(
      csm,
      csmEvents.map((e) => e.id)
    );
    const now = Date.now();
    const existing = cache.get(csm);
    if (!force && existing && existing.expiresAt > now && existing.hash === hash) {
      return NextResponse.json({ plan: existing.plan, cached: true });
    }

    const plan = await generateCsmActionPlan(csm, events, allClients);
    cache.set(csm, { plan, expiresAt: now + CACHE_TTL_MS, hash });

    return NextResponse.json({ plan, cached: false });
  } catch (err) {
    console.error("[AI csm-action-plan] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao gerar" },
      { status: 500 }
    );
  }
}
