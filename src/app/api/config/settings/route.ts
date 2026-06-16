import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { updateSettings } from "@/lib/users";
import { ALL_SECTIONS, type Section } from "@/lib/session";

function cleanSections(v: unknown): Section[] {
  if (!Array.isArray(v)) return [];
  const set = new Set(v.filter((s): s is Section => ALL_SECTIONS.includes(s as Section)));
  // garante ao menos dashboard pra não trancar o usuário fora de tudo
  set.add("dashboard");
  return [...set];
}

/** PATCH /api/config/settings — idioma, fuso e acessos por papel (admin). */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  let body: { language?: string; timezone?: string; roleAccess?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Parameters<typeof updateSettings>[0] = {};
  if (typeof body.language === "string") patch.language = body.language;
  if (typeof body.timezone === "string") patch.timezone = body.timezone;
  if (body.roleAccess && typeof body.roleAccess === "object") {
    patch.roleAccess = {
      gestor: cleanSections(body.roleAccess.gestor),
      leitor: cleanSections(body.roleAccess.leitor),
    };
  }

  try {
    await updateSettings(patch);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
