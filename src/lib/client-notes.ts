import "server-only";
import { getSupabase, type ClientNoteRow } from "./supabase";
import type { ClientNote } from "./types";

function rowToNote(row: ClientNoteRow): ClientNote {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    author: row.author ?? undefined,
    createdAt: row.created_at,
  };
}

/** Notas internas de um cliente (mais recentes primeiro). */
export async function listClientNotes(taskId: string): Promise<ClientNote[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("client_notes")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Notes] load error:", error);
    return [];
  }
  return ((data ?? []) as ClientNoteRow[]).map(rowToNote);
}

export async function addClientNote(
  taskId: string,
  body: string,
  author?: string
): Promise<ClientNote | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("client_notes")
    .insert({ task_id: taskId, body, author: author ?? null })
    .select()
    .single();
  if (error) {
    console.error("[Notes] add error:", error);
    throw new Error(error.message);
  }
  return rowToNote(data as ClientNoteRow);
}

export async function deleteClientNote(id: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("client_notes").delete().eq("id", id);
  if (error) {
    console.error("[Notes] delete error:", error);
    throw new Error(error.message);
  }
}

/**
 * Contagem de notas por cliente (task_id → nº). Uma query só, usada pra
 * pintar o badge "N notas" nos cards do dashboard sem N+1.
 */
export async function loadNoteCounts(): Promise<Map<string, number>> {
  const sb = getSupabase();
  const counts = new Map<string, number>();
  if (!sb) return counts;
  const { data, error } = await sb.from("client_notes").select("task_id");
  if (error) {
    console.error("[Notes] count error:", error);
    return counts;
  }
  for (const row of (data ?? []) as Array<{ task_id: string }>) {
    counts.set(row.task_id, (counts.get(row.task_id) ?? 0) + 1);
  }
  return counts;
}
