import "server-only";
import { getSupabase, type FarolHistoryRow } from "./supabase";
import type { FarolChange, Status } from "./types";

const VALID: Status[] = ["verde", "amarelo", "vermelho"];

function toStatus(s: string | null): Status | undefined {
  return s && (VALID as string[]).includes(s) ? (s as Status) : undefined;
}

function rowToChange(row: FarolHistoryRow): FarolChange {
  return {
    id: row.id,
    taskId: row.task_id,
    fromStatus: toStatus(row.from_status),
    toStatus: (toStatus(row.to_status) ?? "verde") as Status,
    reason: row.reason ?? undefined,
    changedAt: row.changed_at,
  };
}

/** Histórico de mudanças do farol (mais recente primeiro). */
export async function loadFarolHistory(taskId: string): Promise<FarolChange[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("farol_history")
    .select("*")
    .eq("task_id", taskId)
    .order("changed_at", { ascending: false });
  if (error) {
    console.error("[FarolHistory] load error:", error);
    return [];
  }
  return ((data ?? []) as FarolHistoryRow[]).map(rowToChange);
}

/**
 * Registra uma mudança de farol. Best-effort (não bloqueia a troca de cor):
 * se a tabela não existir ou o Supabase falhar, só loga.
 */
export async function recordFarolChange(
  taskId: string,
  from: Status | undefined,
  to: Status
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.from("farol_history").insert({
      task_id: taskId,
      from_status: from ?? null,
      to_status: to,
    });
    if (error) console.error("[FarolHistory] record error:", error.message);
  } catch (err) {
    console.error("[FarolHistory] record error:", err);
  }
}

/** Define/edita o motivo de uma mudança de farol já registrada. */
export async function setFarolChangeReason(
  id: number,
  reason: string | null
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("farol_history")
    .update({ reason })
    .eq("id", id);
  if (error) {
    console.error("[FarolHistory] reason error:", error);
    throw new Error(error.message);
  }
}
