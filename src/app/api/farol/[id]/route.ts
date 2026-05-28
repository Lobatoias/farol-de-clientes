import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setFarol } from "@/lib/clickup";
import { getClientById, invalidateClientsCache } from "@/lib/clients";
import { notifyCriticalClient } from "@/lib/chatwoot";
import type { Status } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID: Status[] = ["verde", "amarelo", "vermelho"];

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Clientes "órfãos" (folder-only) começam com prefixo "folder-" e não têm task ID real
  if (id.startsWith("folder-")) {
    return NextResponse.json(
      { error: "Cliente sem cadastro mestre; cadastre antes de definir Farol." },
      { status: 422 }
    );
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status as Status;
  if (!VALID.includes(status)) {
    return NextResponse.json(
      { error: `Status invalido. Use: ${VALID.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Captura status anterior pra detectar transição → vermelho
    const previousClient = await getClientById(id).catch(() => null);
    const previousStatus = previousClient?.status;

    await setFarol(id, status);
    invalidateClientsCache();
    revalidatePath("/");
    revalidatePath(`/cliente/${id}`);
    revalidatePath("/estrategico");

    // Notifica Chatwoot APENAS na transição pra vermelho (não em vermelho→vermelho)
    if (status === "vermelho" && previousStatus !== "vermelho") {
      // Busca cliente atualizado pra mensagem ter contexto correto
      const updated = await getClientById(id).catch(() => previousClient);
      if (updated) {
        // Fire-and-forget — não bloqueia a resposta
        notifyCriticalClient(updated).catch((err) =>
          console.error("[Farol] notifyCriticalClient falhou:", err)
        );
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[Farol] Erro ao salvar:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
