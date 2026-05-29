import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { saveProgress } from "@/lib/checklist-progress";

interface Body {
  scopeId?: string;
  checklistKey?: string;
  checkedIndices?: unknown;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scopeId = typeof body.scopeId === "string" ? body.scopeId.trim() : "";
  const checklistKey =
    typeof body.checklistKey === "string" ? body.checklistKey.trim() : "";

  if (!scopeId || !checklistKey) {
    return NextResponse.json(
      { error: "scopeId e checklistKey são obrigatórios" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.checkedIndices)) {
    return NextResponse.json(
      { error: "checkedIndices deve ser array" },
      { status: 400 }
    );
  }

  const indices = body.checkedIndices.filter(
    (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0
  );

  try {
    await saveProgress(scopeId, checklistKey, indices);
    // Revalida só o estratégico — é onde os checklists vivem
    revalidatePath("/estrategico");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Checklist] save error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar" },
      { status: 500 }
    );
  }
}
