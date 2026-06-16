import { NextResponse } from "next/server";
import { checkMasterPassword, setSession, sessionMaxAgeMs } from "@/lib/auth";
import { verifyUser, getSettings, sectionsForRole } from "@/lib/users";
import { ALL_SECTIONS } from "@/lib/session";

/**
 * Login. Duas formas:
 * - e-mail em branco → senha-mestra do env = admin (bootstrap / emergência).
 * - e-mail preenchido → valida usuário no Supabase (bcrypt) e aplica o papel.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!password) {
    return NextResponse.json({ error: "Senha requerida" }, { status: 400 });
  }

  const exp = Date.now() + sessionMaxAgeMs();

  // 1) Senha-mestra SEMPRE entra como admin — mesmo se o navegador tiver
  // preenchido o e-mail por autofill. Garante que ninguém fica trancado fora.
  if (checkMasterPassword(password)) {
    await setSession({
      uid: 0,
      name: "Admin",
      role: "admin",
      sections: [...ALL_SECTIONS],
      exp,
    });
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // 2) Senão, login por usuário (precisa de e-mail).
  const user = email ? await verifyUser(email, password) : null;
  if (!user) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos" },
      { status: 401 }
    );
  }
  const settings = await getSettings();
  await setSession({
    uid: user.id,
    name: user.name || user.email,
    role: user.role,
    sections: sectionsForRole(user.role, settings),
    exp,
  });
  return NextResponse.json({ ok: true, role: user.role });
}
