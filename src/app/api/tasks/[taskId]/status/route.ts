import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getTaskLite,
  getListStatuses,
  updateTaskStatus,
  invalidateTimelineCache,
} from "@/lib/clickup";
import { invalidateClientsCache } from "@/lib/clients";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

/**
 * Conclui ou reabre uma task operacional direto no ClickUp.
 * Body: { action: "complete" | "reopen", clientId?: string }
 *
 * Os statuses variam por lista no ClickUp, então resolvemos dinamicamente:
 * - complete → status de type "done" (ou "closed" se a lista não tiver done)
 * - reopen   → primeiro status de type "open" (ex.: "backlog")
 */
export async function POST(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  let body: { action?: string; clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "complete" && action !== "reopen") {
    return NextResponse.json(
      { error: 'action deve ser "complete" ou "reopen"' },
      { status: 400 }
    );
  }

  try {
    const task = await getTaskLite(taskId);
    if (!task.listId) {
      return NextResponse.json(
        { error: "Task sem lista no ClickUp" },
        { status: 422 }
      );
    }
    const statuses = await getListStatuses(task.listId);

    const target =
      action === "complete"
        ? statuses.find((s) => s.type === "done") ??
          statuses.find((s) => s.type === "closed")
        : statuses.find((s) => s.type === "open") ??
          statuses.find((s) => s.type === "custom");

    if (!target) {
      return NextResponse.json(
        { error: "Lista sem status compatível no ClickUp" },
        { status: 422 }
      );
    }

    await updateTaskStatus(taskId, target.status);
    invalidateTimelineCache();
    invalidateClientsCache();
    if (body.clientId) revalidatePath(`/cliente/${body.clientId}`);

    return NextResponse.json({ ok: true, status: target.status });
  } catch (err) {
    console.error("[TaskStatus] Erro ao salvar:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
