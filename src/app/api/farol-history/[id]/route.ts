import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setFarolChangeReason } from "@/lib/farol-history";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Define/edita o motivo de uma mudança de farol. Body: { reason, taskId? } */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const changeId = Number(id);
  if (!Number.isFinite(changeId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  let body: { reason?: string; taskId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const reason = (body.reason ?? "").trim();
  try {
    await setFarolChangeReason(changeId, reason || null);
    if (body.taskId) revalidatePath(`/cliente/${body.taskId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
