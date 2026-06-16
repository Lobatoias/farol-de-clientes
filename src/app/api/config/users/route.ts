import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createUser } from "@/lib/users";
import type { Role } from "@/lib/session";

const ROLES: Role[] = ["admin", "gestor", "leitor"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** POST /api/config/users — criar usuário (admin). */
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  let body: { email?: string; name?: string; role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const role = body.role as Role;
  const password = body.password ?? "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Papel inválido" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Senha precisa de ao menos 6 caracteres" },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({ email, name: body.name, role, password });
    revalidatePath("/config");
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao criar" },
      { status: 500 }
    );
  }
}
