// Gestão de saídas (churn) de clientes.
// - loadAllChurnEvents: traz todos os eventos do Supabase
// - buildChurnIndex: mapa task_id → último evento (pra decorar Client.isChurned)
// - recordChurn: salva novo evento
// - undoLatestChurn: deleta o evento mais recente do cliente

import "server-only";
import { getSupabase, type ChurnRow } from "./supabase";
import type { ChurnEvent, ChurnReason } from "./types";
import { CHURN_REASONS } from "./types";

function rowToEvent(row: ChurnRow): ChurnEvent {
  const reason = (CHURN_REASONS as readonly string[]).includes(row.reason)
    ? (row.reason as ChurnReason)
    : ("Outro" as ChurnReason);
  return {
    id: row.id,
    taskId: row.task_id,
    churnedAt: row.churned_at,
    reason,
    reasonDetails: row.reason_details ?? undefined,
    csmAtTime: row.csm_at_time ?? undefined,
    monthlyRevenueAtTime: row.monthly_revenue_at_time ?? undefined,
    nicheAtTime: row.niche_at_time ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Carrega TODOS os eventos de saída do Supabase, ordenados do mais recente
 * pro mais antigo. Volume baixo (~dezenas de linhas) então não vale paginar.
 */
export async function loadAllChurnEvents(): Promise<ChurnEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("churn_events")
    .select("*")
    .order("churned_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Churn] load error:", error);
    return [];
  }
  return ((data ?? []) as ChurnRow[]).map(rowToEvent);
}

/**
 * Mapa { task_id → último evento de churn }.
 * "Último" = mais recente por created_at (pra desempate quando data é igual).
 */
export type ChurnIndex = Map<string, ChurnEvent>;

export function buildChurnIndex(events: ChurnEvent[]): ChurnIndex {
  const map: ChurnIndex = new Map();
  // events já vem ordenado desc por churned_at; primeiro encontrado = mais recente
  for (const ev of events) {
    if (!map.has(ev.taskId)) map.set(ev.taskId, ev);
  }
  return map;
}

export interface RecordChurnInput {
  taskId: string;
  churnedAt: string; // ISO YYYY-MM-DD
  reason: string;
  reasonDetails?: string;
  csmAtTime?: string;
  monthlyRevenueAtTime?: number;
  nicheAtTime?: string;
}

export async function recordChurn(input: RecordChurnInput): Promise<ChurnEvent> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error(
      "Supabase não configurado — saídas não persistem sem ele"
    );
  }

  // Sanitiza: motivo precisa estar na lista, senão vira "Outro"
  const reason = (CHURN_REASONS as readonly string[]).includes(input.reason)
    ? input.reason
    : "Outro";

  const row = {
    task_id: input.taskId,
    churned_at: input.churnedAt,
    reason,
    reason_details: input.reasonDetails ?? null,
    csm_at_time: input.csmAtTime ?? null,
    monthly_revenue_at_time: input.monthlyRevenueAtTime ?? null,
    niche_at_time: input.nicheAtTime ?? null,
  };

  const { data, error } = await sb
    .from("churn_events")
    .insert(row)
    .select("*")
    .single();

  if (error) throw new Error(`Supabase insert: ${error.message}`);
  return rowToEvent(data as ChurnRow);
}

/**
 * Apaga o evento mais recente do cliente. Se ele tinha 1 só, o cliente
 * volta a aparecer como ativo. Se tinha múltiplos (caso raro), o anterior
 * volta a valer.
 */
export async function undoLatestChurn(taskId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }

  // Pega o id do mais recente
  const { data: latest, error: findErr } = await sb
    .from("churn_events")
    .select("id")
    .eq("task_id", taskId)
    .order("churned_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) throw new Error(`Supabase select: ${findErr.message}`);
  if (!latest) return false;

  const { error: delErr } = await sb
    .from("churn_events")
    .delete()
    .eq("id", (latest as { id: number }).id);

  if (delErr) throw new Error(`Supabase delete: ${delErr.message}`);
  return true;
}
