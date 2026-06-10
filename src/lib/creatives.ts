import "server-only";
import { getSupabase, type CreativeRefRow } from "./supabase";
import type { CreativeRef, CreativeAnalysis, CreativeFormat } from "./types";

/** Dias no ar a partir de firstSeenAt (sinal de ouro). */
function daysRunning(firstSeenAt: string | null): number | undefined {
  if (!firstSeenAt) return undefined;
  const start = new Date(firstSeenAt).getTime();
  if (Number.isNaN(start)) return undefined;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function rowToRef(row: CreativeRefRow): CreativeRef {
  return {
    id: row.id,
    niche: row.niche,
    source: row.source === "meta" ? "meta" : "manual",
    advertiser: row.advertiser ?? undefined,
    format: (row.format as CreativeFormat) ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    originalUrl: row.original_url ?? undefined,
    caption: row.caption ?? undefined,
    firstSeenAt: row.first_seen_at ?? undefined,
    daysRunning: daysRunning(row.first_seen_at),
    variantCount: row.variant_count ?? 1,
    aiAnalysis: (row.ai_analysis as CreativeAnalysis) ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    starred: !!row.starred,
    collectedAt: row.collected_at,
  };
}

/**
 * Ordena pelos sinais de ouro: dias no ar (campeão) > variantes (escala) >
 * coleta recente. Favoritos sobem ao topo.
 */
function sortByGoldenSignals(a: CreativeRef, b: CreativeRef): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1;
  const da = a.daysRunning ?? -1;
  const db = b.daysRunning ?? -1;
  if (db !== da) return db - da;
  if (b.variantCount !== a.variantCount) return b.variantCount - a.variantCount;
  return b.collectedAt.localeCompare(a.collectedAt);
}

/** Biblioteca de criativos de um nicho, já ordenada pelos sinais de ouro. */
export async function listCreativesByNiche(
  niche: string
): Promise<CreativeRef[]> {
  const sb = getSupabase();
  if (!sb || !niche) return [];
  const { data, error } = await sb
    .from("creative_refs")
    .select("*")
    .eq("niche", niche);
  if (error) {
    console.error("[Creatives] load error:", error);
    return [];
  }
  return ((data ?? []) as CreativeRefRow[]).map(rowToRef).sort(sortByGoldenSignals);
}

export interface NewCreativeInput {
  niche: string;
  advertiser?: string;
  format?: CreativeFormat;
  thumbnailUrl?: string;
  originalUrl?: string;
  caption?: string;
  firstSeenAt?: string;
  variantCount?: number;
}

export async function addCreative(
  input: NewCreativeInput
): Promise<CreativeRef | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("creative_refs")
    .insert({
      niche: input.niche,
      source: "manual",
      advertiser: input.advertiser ?? null,
      format: input.format ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      original_url: input.originalUrl ?? null,
      caption: input.caption ?? null,
      first_seen_at: input.firstSeenAt ?? null,
      variant_count: input.variantCount ?? 1,
    })
    .select()
    .single();
  if (error) {
    console.error("[Creatives] add error:", error);
    throw new Error(error.message);
  }
  return rowToRef(data as CreativeRefRow);
}

export async function deleteCreative(id: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("creative_refs").delete().eq("id", id);
  if (error) {
    console.error("[Creatives] delete error:", error);
    throw new Error(error.message);
  }
}

export async function setCreativeStarred(
  id: number,
  starred: boolean
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("creative_refs")
    .update({ starred })
    .eq("id", id);
  if (error) {
    console.error("[Creatives] star error:", error);
    throw new Error(error.message);
  }
}
