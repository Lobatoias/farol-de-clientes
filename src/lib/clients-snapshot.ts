import "server-only";
import { getSupabase } from "./supabase";
import type { Client } from "./types";

/**
 * Snapshot compartilhado da lista de clientes no Supabase.
 *
 * Problema que resolve: o cache em memória (30s) vive POR INSTÂNCIA da
 * Vercel. Quando a request cai numa instância fria/expirada, o fetch
 * completo do ClickUp custa 3-8s — a "lentidão entre abas".
 *
 * Estratégia stale-while-revalidate:
 * - Toda busca real no ClickUp salva o resultado aqui (1 linha jsonb).
 * - Em cache miss, qualquer instância lê o snapshot (~300ms) e serve,
 *   enquanto o refresh do ClickUp continua em background.
 * - Mutations (farol, financeiro, churn) apagam o snapshot pra não
 *   servir dado velho logo após uma edição.
 *
 * Se a tabela não existir ainda, tudo falha silenciosamente e o app
 * se comporta exatamente como antes (fetch direto no ClickUp).
 */

const ROW_ID = 1;
/** Snapshot mais velho que isso é ignorado (warmup renova a cada 5 min). */
const SNAPSHOT_MAX_AGE_MS = 15 * 60_000;
/** Não vale a pena esperar o Supabase mais que isso — ClickUp que ganhe. */
const SNAPSHOT_READ_TIMEOUT_MS = 2_500;

export async function loadClientsSnapshot(): Promise<Client[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const read = sb
      .from("clients_snapshot")
      .select("payload, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SNAPSHOT_READ_TIMEOUT_MS)
    );
    const res = await Promise.race([read, timeout]);
    if (!res || res.error || !res.data) return null;
    const age = Date.now() - new Date(res.data.updated_at).getTime();
    if (age > SNAPSHOT_MAX_AGE_MS) return null;
    const clients = res.data.payload as Client[];
    return Array.isArray(clients) && clients.length > 0 ? clients : null;
  } catch {
    return null;
  }
}

export async function saveClientsSnapshot(clients: Client[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || clients.length === 0) return;
  // Stripa meetingNotes (pode ser 10-15KB/cliente de dump de WhatsApp).
  // O dashboard/snapshot não usa as notas — só a página de detalhe, que
  // lê do ClickUp direto. Encolhe o JSONB e a leitura/escrita do snapshot.
  const lite = clients.map((c) =>
    c.meetingNotes ? { ...c, meetingNotes: undefined } : c
  );
  try {
    const { error } = await sb.from("clients_snapshot").upsert({
      id: ROW_ID,
      payload: lite,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("[Snapshot] save falhou:", error.message);
  } catch (err) {
    console.error("[Snapshot] save falhou:", err);
  }
}

export async function deleteClientsSnapshot(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("clients_snapshot").delete().eq("id", ROW_ID);
  } catch {
    // best-effort — o bypass em memória cobre a janela
  }
}
