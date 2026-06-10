import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setMeetingDate } from "@/lib/clickup";
import { invalidateClientsCache } from "@/lib/clients";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Atualiza as datas de reunião do cliente direto na task mestre do ClickUp.
 * Body: { lastMeetingAt?: "YYYY-MM-DD" | null, nextMeetingAt?: "YYYY-MM-DD" | null }
 * — chave ausente = não mexe; null = limpa o campo.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (id.startsWith("folder-")) {
    return NextResponse.json(
      { error: "Cliente sem cadastro mestre; cadastre antes de editar reuniões." },
      { status: 422 }
    );
  }

  let body: { lastMeetingAt?: string | null; nextMeetingAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Array<["last" | "next", string | null]> = [];
  if ("lastMeetingAt" in body) updates.push(["last", body.lastMeetingAt ?? null]);
  if ("nextMeetingAt" in body) updates.push(["next", body.nextMeetingAt ?? null]);

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "Informe lastMeetingAt e/ou nextMeetingAt" },
      { status: 400 }
    );
  }
  for (const [, value] of updates) {
    if (value !== null && !ISO_DATE.test(value)) {
      return NextResponse.json(
        { error: "Data invalida — use YYYY-MM-DD ou null" },
        { status: 400 }
      );
    }
  }

  try {
    await Promise.all(
      updates.map(([which, value]) => setMeetingDate(id, which, value))
    );
    invalidateClientsCache();
    revalidatePath("/");
    revalidatePath(`/cliente/${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Meetings] Erro ao salvar:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
