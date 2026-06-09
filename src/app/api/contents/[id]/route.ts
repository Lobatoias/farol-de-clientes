import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteContent,
  getContentById,
  updateContent,
} from "@/lib/contents";
import { CONTENT_KINDS } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(idStr: string): number | null {
  const n = Number(idStr);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(request: Request, context: RouteContext) {
  const { id: idStr } = await context.params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof updateContent>[1] = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }
    patch.title = body.title.trim().slice(0, 200);
  }

  if ("kind" in body) {
    if (
      typeof body.kind !== "string" ||
      !(CONTENT_KINDS as readonly string[]).includes(body.kind)
    ) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    patch.kind = body.kind as never;
  }

  if ("scheduledAt" in body) {
    const v = body.scheduledAt;
    if (v === null || v === "" || v === undefined) {
      patch.scheduledAt = null;
    } else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      patch.scheduledAt = v;
    } else {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
  }

  if ("imageUrl" in body) {
    const v = body.imageUrl;
    patch.imageUrl =
      typeof v === "string" && v.trim() ? v.trim().slice(0, 1000) : null;
  }

  if ("caption" in body) {
    const v = body.caption;
    patch.caption =
      typeof v === "string" && v.trim() ? v.trim().slice(0, 5000) : null;
  }

  try {
    const existing = await getContentById(id);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const content = await updateContent(id, patch);
    revalidatePath(`/cliente/${existing.taskId}`);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error("[Contents] update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao atualizar" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id: idStr } = await context.params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  try {
    const existing = await getContentById(id);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    await deleteContent(id);
    revalidatePath(`/cliente/${existing.taskId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Contents] delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao apagar" },
      { status: 500 }
    );
  }
}
