import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listCreativesByNiche,
  addCreative,
  type NewCreativeInput,
} from "@/lib/creatives";
import type { CreativeFormat } from "@/lib/types";

export const dynamic = "force-dynamic";

const FORMATS: CreativeFormat[] = ["video", "image", "carousel"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/creatives?niche=Joalheria — biblioteca do nicho (sinais de ouro). */
export async function GET(request: Request) {
  const niche = new URL(request.url).searchParams.get("niche") ?? "";
  if (!niche) return NextResponse.json({ creatives: [] });
  const creatives = await listCreativesByNiche(niche);
  return NextResponse.json({ creatives });
}

/** POST /api/creatives — cadastro manual de referência na biblioteca do nicho. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const niche = String(body.niche ?? "").trim();
  if (!niche) {
    return NextResponse.json({ error: "Nicho é obrigatório" }, { status: 400 });
  }

  const format = body.format as CreativeFormat | undefined;
  if (format && !FORMATS.includes(format)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const firstSeenAt = body.firstSeenAt ? String(body.firstSeenAt) : undefined;
  if (firstSeenAt && !ISO_DATE.test(firstSeenAt)) {
    return NextResponse.json(
      { error: "Data inválida (use YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const variantRaw = Number(body.variantCount);
  const input: NewCreativeInput = {
    niche,
    advertiser: body.advertiser ? String(body.advertiser).trim() : undefined,
    format,
    thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl).trim() : undefined,
    originalUrl: body.originalUrl ? String(body.originalUrl).trim() : undefined,
    caption: body.caption ? String(body.caption).trim() : undefined,
    firstSeenAt,
    variantCount: Number.isFinite(variantRaw) && variantRaw > 0 ? Math.floor(variantRaw) : 1,
  };

  if (!input.thumbnailUrl && !input.originalUrl) {
    return NextResponse.json(
      { error: "Informe ao menos a imagem ou o link do anúncio" },
      { status: 400 }
    );
  }

  try {
    const creative = await addCreative(input);
    revalidatePath("/cliente", "layout");
    return NextResponse.json({ ok: true, creative });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
