import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getContentById, markAsPublished } from "@/lib/contents";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const existing = await getContentById(id);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const content = await markAsPublished(id);
    revalidatePath(`/cliente/${existing.taskId}`);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error("[Contents] publish error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao publicar" },
      { status: 500 }
    );
  }
}
