import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listClientNotes, addClientNote } from "@/lib/client-notes";
import { invalidateClientsCache } from "@/lib/clients";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const notes = await listClientNotes(taskId);
  return NextResponse.json({ notes });
}

export async function POST(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  let body: { body?: string; author?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Nota vazia" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Nota muito longa" }, { status: 400 });
  }
  try {
    const note = await addClientNote(taskId, text, body.author?.trim() || undefined);
    invalidateClientsCache(); // atualiza o badge de contagem nos cards
    revalidatePath(`/cliente/${taskId}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true, note });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
