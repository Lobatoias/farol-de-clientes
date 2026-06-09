import { NextResponse } from "next/server";
import { getActiveClients } from "@/lib/clients";

export const dynamic = "force-dynamic";

/**
 * Lista lite de clientes pra busca global (Ctrl+K).
 * Só os campos necessários pro palette — o payload fica ~2KB
 * mesmo com 50+ clientes (vs ~200KB do objeto completo).
 * Protegida pelo middleware de auth como as demais rotas.
 */
export async function GET() {
  const clients = await getActiveClients();
  const lite = clients
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      niche: c.niche ?? null,
      owner: c.owner || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return NextResponse.json({ clients: lite });
}
