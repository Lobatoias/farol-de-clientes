import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteCreative, setCreativeStarred } from "@/lib/creatives";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** PATCH /api/creatives/[id] — favoritar/desfavoritar. Body: { starred } */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const cid = parseId(id);
  if (cid === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  let body: { starred?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    await setCreativeStarred(cid, !!body.starred);
    revalidatePath("/cliente", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha" },
      { status: 500 }
    );
  }
}

/** DELETE /api/creatives/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const cid = parseId(id);
  if (cid === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    await deleteCreative(cid);
    revalidatePath("/cliente", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha" },
      { status: 500 }
    );
  }
}
