import "server-only";
import { getSupabase, type MetricSnapshotRow } from "./supabase";
import type { MetricSnapshot } from "./types";

function rowToSnapshot(row: MetricSnapshotRow): MetricSnapshot {
  return {
    date: row.snapshot_date,
    activeClients: row.active_clients,
    activeMrr: Number(row.active_mrr) || 0,
    redCount: row.red_count,
    yellowCount: row.yellow_count,
    greenCount: row.green_count,
    churnedTotal: row.churned_total,
  };
}

/** Todos os snapshots diários, do mais antigo pro mais novo. */
export async function loadMetricSnapshots(): Promise<MetricSnapshot[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("metric_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true });
  if (error) {
    console.error("[Snapshots] load error:", error);
    return [];
  }
  return ((data ?? []) as MetricSnapshotRow[]).map(rowToSnapshot);
}

/**
 * Grava (upsert) o snapshot de HOJE. Chamado pelo /api/ping a cada 3 min —
 * a primary key é a data, então só sobrescreve a linha do dia (1 row/dia).
 * Best-effort: falha não quebra o ping.
 */
export async function upsertTodaySnapshot(metrics: {
  activeClients: number;
  activeMrr: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  churnedTotal: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { error } = await sb.from("metric_snapshots").upsert(
      {
        snapshot_date: today,
        active_clients: metrics.activeClients,
        active_mrr: metrics.activeMrr,
        red_count: metrics.redCount,
        yellow_count: metrics.yellowCount,
        green_count: metrics.greenCount,
        churned_total: metrics.churnedTotal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "snapshot_date" }
    );
    if (error) console.error("[Snapshots] upsert error:", error.message);
  } catch (err) {
    console.error("[Snapshots] upsert error:", err);
  }
}

/** Último snapshot de cada mês (pra ver MRR/base mês a mês). */
export function snapshotsByMonth(
  snapshots: MetricSnapshot[]
): Array<{ ym: string; snapshot: MetricSnapshot }> {
  const byMonth = new Map<string, MetricSnapshot>();
  for (const s of snapshots) {
    const ym = s.date.slice(0, 7); // YYYY-MM
    byMonth.set(ym, s); // snapshots vêm asc → o último de cada mês vence
  }
  return [...byMonth.entries()].map(([ym, snapshot]) => ({ ym, snapshot }));
}
