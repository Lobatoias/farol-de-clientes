import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  invalidateClientsCache,
  saveFinancialEntry,
  type FinancialEntry,
} from "@/lib/clients";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Partial<FinancialEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Sanitização
  const entry: Partial<FinancialEntry> = {};
  if ("name" in body) entry.name = body.name ?? undefined;

  if ("monthlyRevenue" in body) {
    const v = body.monthlyRevenue;
    if (v === null || v === undefined || v === ("" as unknown)) {
      entry.monthlyRevenue = undefined;
    } else {
      const n = typeof v === "string" ? parseFloat(v) : v;
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: "monthlyRevenue invalido" }, { status: 400 });
      }
      entry.monthlyRevenue = n;
    }
  }

  if ("contractStartAt" in body) entry.contractStartAt = body.contractStartAt ?? undefined;
  if ("contractEndAt" in body) entry.contractEndAt = body.contractEndAt ?? undefined;
  if ("clientSince" in body) entry.clientSince = body.clientSince ?? undefined;

  // mrr/cost legados (mock) — não exposto via UI mas mantém compatibilidade
  if ("mrr" in body && typeof body.mrr === "number") entry.mrr = body.mrr;
  if ("cost" in body && typeof body.cost === "number") entry.cost = body.cost;

  try {
    await saveFinancialEntry(id, entry);
    invalidateClientsCache();
    revalidatePath("/");
    revalidatePath("/financeiro");
    revalidatePath(`/cliente/${id}`);
    revalidatePath("/estrategico");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Financeiro] Erro ao salvar:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
