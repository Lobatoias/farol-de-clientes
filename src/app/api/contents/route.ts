import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createContent } from "@/lib/contents";
import { CONTENT_KINDS } from "@/lib/types";

interface Body {
  taskId?: string;
  title?: string;
  kind?: string;
  scheduledAt?: string;
  imageUrl?: string;
  caption?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId =
    typeof body.taskId === "string" ? body.taskId.trim() : "";
  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const kind = typeof body.kind === "string" ? body.kind : "";

  if (!taskId) return NextResponse.json({ error: "taskId obrigatório" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!(CONTENT_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { error: `Tipo inválido. Opções: ${CONTENT_KINDS.join(", ")}` },
      { status: 400 }
    );
  }

  const scheduledAt =
    typeof body.scheduledAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.scheduledAt)
      ? body.scheduledAt
      : undefined;

  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim()
      ? body.imageUrl.trim().slice(0, 1000)
      : undefined;

  const caption =
    typeof body.caption === "string" && body.caption.trim()
      ? body.caption.trim().slice(0, 5000)
      : undefined;

  try {
    const content = await createContent({
      taskId,
      title,
      kind: kind as never,
      scheduledAt,
      imageUrl,
      caption,
    });
    revalidatePath(`/cliente/${taskId}`);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error("[Contents] create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao criar" },
      { status: 500 }
    );
  }
}
