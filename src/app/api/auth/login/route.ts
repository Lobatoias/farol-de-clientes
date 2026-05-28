import { NextResponse } from "next/server";
import { checkPassword, login } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const password = body.password ?? "";
  if (!password) {
    return NextResponse.json({ error: "Senha requerida" }, { status: 400 });
  }
  const ok = await checkPassword(password);
  if (!ok) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  await login();
  return NextResponse.json({ ok: true });
}
