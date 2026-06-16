import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/users";
import type { Role } from "@/lib/session";

const ROLES: Role[] = ["admin", "gestor", "leitor"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function ensureAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

/** PATCH /api/config/users/[id] — papel, ativo, ou reset de senha (admin). */
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await context.params;
  const uid = Number(id);
  if (!Number.isFinite(uid)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  let body: { role?: string; active?: boolean; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patch: Parameters<typeof updateUser>[1] = {};
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role as Role)) {
      return NextResponse.json({ error: "Papel inválido" }, { status: 400 });
    }
    patch.role = body.role as Role;
  }
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.password !== undefined) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Senha precisa de ao menos 6 caracteres" },
        { status: 400 }
      );
    }
    patch.password = body.password;
  }
  try {
    await updateUser(uid, patch);
    revalidatePath("/config");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha" },
      { status: 500 }
    );
  }
}

/** DELETE /api/config/users/[id] (admin). */
export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await context.params;
  const uid = Number(id);
  if (!Number.isFinite(uid)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    await deleteUser(uid);
    revalidatePath("/config");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha" },
      { status: 500 }
    );
  }
}
