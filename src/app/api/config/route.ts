import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

/** GET /api/config — settings + lista de usuários (admin). */
export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const [settings, users] = await Promise.all([getSettings(), listUsers()]);
  return NextResponse.json({ settings, users });
}
