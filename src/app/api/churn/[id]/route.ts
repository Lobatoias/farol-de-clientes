import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recordChurn, undoLatestChurn } from "@/lib/churn";
import { getClientById } from "@/lib/clients";
import { CHURN_REASONS } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Body {
  churnedAt?: string;
  reason?: string;
  reasonDetails?: string;
}

function revalidateAll(id: string) {
  revalidatePath("/");
  revalidatePath("/financeiro");
  revalidatePath("/estrategico");
  revalidatePath("/saidas");
  revalidatePath(`/cliente/${id}`);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validação
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json(
      { error: "Motivo é obrigatório" },
      { status: 400 }
    );
  }
  if (!(CHURN_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json(
      { error: `Motivo inválido. Opções: ${CHURN_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Data: usa a fornecida ou hoje
  let churnedAt: string;
  if (typeof body.churnedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.churnedAt)) {
    churnedAt = body.churnedAt;
  } else {
    churnedAt = new Date().toISOString().slice(0, 10);
  }

  const reasonDetails =
    typeof body.reasonDetails === "string" && body.reasonDetails.trim()
      ? body.reasonDetails.trim().slice(0, 1000)
      : undefined;

  // Snapshot: pega CSM/MRR/nicho atuais do cliente
  let csmAtTime: string | undefined;
  let monthlyRevenueAtTime: number | undefined;
  let nicheAtTime: string | undefined;
  try {
    const client = await getClientById(id);
    if (client) {
      csmAtTime = client.owner || undefined;
      monthlyRevenueAtTime = client.monthlyRevenue;
      nicheAtTime = client.niche;
    }
  } catch (err) {
    console.error("[Churn] snapshot fetch failed:", err);
    // Continua mesmo sem snapshot — não é crítico
  }

  try {
    const event = await recordChurn({
      taskId: id,
      churnedAt,
      reason,
      reasonDetails,
      csmAtTime,
      monthlyRevenueAtTime,
      nicheAtTime,
    });
    revalidateAll(id);
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error("[Churn] record error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const removed = await undoLatestChurn(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Nenhum evento de saída encontrado" },
        { status: 404 }
      );
    }
    revalidateAll(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Churn] undo error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao desfazer" },
      { status: 500 }
    );
  }
}
