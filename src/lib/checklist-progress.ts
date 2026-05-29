// Progresso dos checklists de "Plano de otimização".
// Guarda no Supabase quais itens de cada checklist foram concluídos.
// Compartilhado entre os usuários (a equipe inteira vê o mesmo progresso).

import "server-only";
import { getSupabase } from "./supabase";

/**
 * Cria um scopeId canônico pra cada tipo de checklist.
 * Centralizado pra UI + backend usarem o mesmo formato.
 */
export function scopeIdFor(
  kind:
    | "critical-account"
    | "contract-expiring"
    | "niche-concentration"
    | "csm-load"
    | "missing-niche"
    | "missing-revenue"
    | "missing-owner"
    | "missing-meeting"
    | "orphan-folder",
  ref?: string
): string {
  switch (kind) {
    case "critical-account":
    case "contract-expiring":
      return ref ?? "unknown"; // task_id do cliente
    case "niche-concentration":
      return `niche:${ref ?? "unknown"}`;
    case "csm-load":
      return `csm:${ref ?? "unknown"}`;
    default:
      return "global"; // higiene de dados é global
  }
}

interface ProgressRow {
  scope_id: string;
  checklist_key: string;
  checked_indices: number[];
}

/**
 * Mapa { "scope_id::checklist_key": number[] } pra lookup rápido.
 */
export type ProgressMap = Map<string, number[]>;

function progressKey(scopeId: string, checklistKey: string): string {
  return `${scopeId}::${checklistKey}`;
}

export function getProgress(
  map: ProgressMap,
  scopeId: string,
  checklistKey: string
): number[] {
  return map.get(progressKey(scopeId, checklistKey)) ?? [];
}

/**
 * Carrega TODO o progresso em memória.
 * O volume é pequeno (no máximo umas dezenas de linhas) então não vale paginar.
 */
export async function loadAllProgress(): Promise<ProgressMap> {
  const sb = getSupabase();
  const map: ProgressMap = new Map();
  if (!sb) return map;
  const { data, error } = await sb
    .from("checklist_progress")
    .select("scope_id, checklist_key, checked_indices");
  if (error) {
    console.error("[Checklist] load error:", error);
    return map;
  }
  for (const row of (data ?? []) as ProgressRow[]) {
    map.set(
      progressKey(row.scope_id, row.checklist_key),
      Array.isArray(row.checked_indices) ? row.checked_indices : []
    );
  }
  return map;
}

/**
 * Upsert do progresso de UM checklist.
 * Se `checkedIndices` for vazio, deleta a linha (mantém a tabela limpa).
 */
export async function saveProgress(
  scopeId: string,
  checklistKey: string,
  checkedIndices: number[]
): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado — checklist não persiste sem ele");
  }
  // Sanitiza: índices únicos, não negativos, ordenados
  const sane = Array.from(
    new Set(
      checkedIndices
        .filter((n) => Number.isInteger(n) && n >= 0 && n < 100)
    )
  ).sort((a, b) => a - b);

  if (sane.length === 0) {
    const { error } = await sb
      .from("checklist_progress")
      .delete()
      .eq("scope_id", scopeId)
      .eq("checklist_key", checklistKey);
    if (error) throw new Error(`Supabase delete: ${error.message}`);
    return;
  }

  const { error } = await sb
    .from("checklist_progress")
    .upsert(
      {
        scope_id: scopeId,
        checklist_key: checklistKey,
        checked_indices: sane,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "scope_id,checklist_key" }
    );
  if (error) throw new Error(`Supabase upsert: ${error.message}`);
}

/**
 * "Auto-reset quando cliente sai da priorização":
 * Apaga rows de critical-account cujo scope_id NÃO está na lista atual.
 * Idem pra niche-concentration e csm-load (signals dinâmicos).
 *
 * activeScopes: { "critical-account": [clientIds], "niche-concentration": ["niche:Food"], ... }
 */
export async function syncActiveScopes(
  activeScopes: Record<string, string[]>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  for (const [checklistKey, scopeIds] of Object.entries(activeScopes)) {
    // Para listas vazias, apagamos TUDO desse checklist_key (nada está ativo)
    if (scopeIds.length === 0) {
      const { error } = await sb
        .from("checklist_progress")
        .delete()
        .eq("checklist_key", checklistKey);
      if (error) {
        console.error(`[Checklist] sync delete-all ${checklistKey}:`, error);
      }
      continue;
    }

    // Postgres não tem NOT IN com array via PostgREST direto;
    // usamos a notação `not.in.(a,b,c)` via .filter()
    const list = scopeIds.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",");
    const { error } = await sb
      .from("checklist_progress")
      .delete()
      .eq("checklist_key", checklistKey)
      .filter("scope_id", "not.in", `(${list})`);
    if (error) {
      console.error(`[Checklist] sync ${checklistKey}:`, error);
    }
  }
}
