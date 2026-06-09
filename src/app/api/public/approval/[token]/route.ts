import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  clientApprove,
  clientReject,
  getContentByToken,
} from "@/lib/contents";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/** Sanitiza o conteúdo retornado pro cliente final — não vaza task_id direto. */
function publicShape(content: Awaited<ReturnType<typeof getContentByToken>>) {
  if (!content) return null;
  return {
    id: content.id,
    title: content.title,
    kind: content.kind,
    status: content.status,
    scheduledAt: content.scheduledAt,
    imageUrl: content.imageUrl,
    caption: content.caption,
    clientDecision: content.clientDecision,
    clientComment: content.clientComment,
    clientDecidedAt: content.clientDecidedAt,
    expiresAt: content.shareExpiresAt,
  };
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token || !/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  try {
    const content = await getContentByToken(token);
    if (!content) {
      return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
    }
    if (isExpired(content.shareExpiresAt)) {
      return NextResponse.json(
        { error: "Link expirado. Peça à equipe pra gerar um novo." },
        { status: 410 }
      );
    }
    return NextResponse.json({ content: publicShape(content) });
  } catch (err) {
    console.error("[Public approval] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha" },
      { status: 500 }
    );
  }
}

interface Body {
  decision?: "approved" | "rejected";
  comment?: string;
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token || !/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json(
      { error: "decision deve ser 'approved' ou 'rejected'" },
      { status: 400 }
    );
  }

  try {
    const current = await getContentByToken(token);
    if (!current) {
      return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
    }
    if (isExpired(current.shareExpiresAt)) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    let updated;
    if (body.decision === "approved") {
      updated = await clientApprove(token);
    } else {
      const comment = typeof body.comment === "string" ? body.comment : "";
      updated = await clientReject(token, comment);
    }

    revalidatePath(`/cliente/${updated.taskId}`);
    return NextResponse.json({ ok: true, content: publicShape(updated) });
  } catch (err) {
    console.error("[Public approval] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao registrar" },
      { status: 500 }
    );
  }
}
