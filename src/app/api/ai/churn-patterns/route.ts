import { NextResponse } from "next/server";
import { getClients } from "@/lib/clients";
import { loadAllChurnEvents } from "@/lib/churn";
import {
  generateChurnAnalysis,
  type ChurnAnalysis,
} from "@/lib/ai-churn-patterns";
import { ANTHROPIC_CONFIGURED } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

// Cache em memória de 1h. Cada serverless instance pode ter o seu — ok pra
// rate-limit suave (cada usuário/instância pode disparar 1x por hora).
// Chave inclui hash do conjunto de eventos pra invalidar se algo mudar.
interface CacheEntry {
  analysis: ChurnAnalysis;
  expiresAt: number;
  eventsHash: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
let cache: CacheEntry | null = null;

function hashEvents(events: { id: number; reasons: string[]; reasonDetails?: string }[]): string {
  // Hash simples: count + max id + checksum dos motivos
  const sorted = [...events].sort((a, b) => a.id - b.id);
  const sig = sorted
    .map((e) => `${e.id}:${e.reasons.join("|")}:${e.reasonDetails ?? ""}`)
    .join(";");
  // Pequeno hash não-crypto, suficiente pra detectar mudanças
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h) ^ sig.charCodeAt(i);
  }
  return `${sorted.length}-${h >>> 0}`;
}

export async function POST(request: Request) {
  if (!ANTHROPIC_CONFIGURED) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY não configurada na Vercel. Sem ela, a análise de IA não roda.",
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const [allClients, events] = await Promise.all([
      getClients(),
      loadAllChurnEvents(),
    ]);

    if (events.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhuma saída registrada ainda — análise indisponível.",
        },
        { status: 400 }
      );
    }

    const eventsHash = hashEvents(events);
    const now = Date.now();

    // Cache hit (se válido + eventos não mudaram + sem force)
    if (
      !force &&
      cache &&
      cache.expiresAt > now &&
      cache.eventsHash === eventsHash
    ) {
      return NextResponse.json({
        analysis: cache.analysis,
        cached: true,
      });
    }

    const analysis = await generateChurnAnalysis(events, allClients);

    cache = {
      analysis,
      expiresAt: now + CACHE_TTL_MS,
      eventsHash,
    };

    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    console.error("[AI churn] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha na análise" },
      { status: 500 }
    );
  }
}
