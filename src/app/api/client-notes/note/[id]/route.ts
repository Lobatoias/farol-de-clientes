import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteClientNote } from "@/lib/client-notes";
import { invalidateClientsCache } from "@/lib/clients";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const noteId = Number(id);
  if (!Number.isFinite(noteId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  // taskId opcional no body só pra revalidar a página certa
  const taskId = new URL(request.url).searchParams.get("taskId");
  try {
    await deleteClientNote(noteId);
    invalidateClientsCache();
    if (taskId) revalidatePath(`/cliente/${taskId}`);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao apagar" },
      { status: 500 }
    );
  }
}
