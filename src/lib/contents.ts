// Calendário de conteúdos por cliente.
// CRUD + workflow de aprovação com token público.

import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabase, type ContentRow } from "./supabase";
import {
  CONTENT_KINDS,
  CONTENT_STATUSES,
  type Content,
  type ContentKind,
  type ContentStatus,
} from "./types";

// === Mapeamento row ↔ Content =====================================

function rowToContent(row: ContentRow): Content {
  const kind = (CONTENT_KINDS as readonly string[]).includes(row.kind)
    ? (row.kind as ContentKind)
    : "post";
  const status = (CONTENT_STATUSES as readonly string[]).includes(row.status)
    ? (row.status as ContentStatus)
    : "em_producao";
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    kind,
    status,
    scheduledAt: row.scheduled_at ?? undefined,
    imageUrl: row.image_url ?? undefined,
    caption: row.caption ?? undefined,
    shareToken: row.share_token ?? undefined,
    shareExpiresAt: row.share_expires_at ?? undefined,
    clientDecision:
      row.client_decision === "approved" || row.client_decision === "rejected"
        ? row.client_decision
        : undefined,
    clientComment: row.client_comment ?? undefined,
    clientDecidedAt: row.client_decided_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// === Leituras =====================================================

export async function listContentsByClient(taskId: string): Promise<Content[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("contents")
    .select("*")
    .eq("task_id", taskId)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Contents] list error:", error);
    return [];
  }
  return ((data ?? []) as ContentRow[]).map(rowToContent);
}

export async function getContentById(id: number): Promise<Content | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[Contents] getById error:", error);
    return null;
  }
  return data ? rowToContent(data as ContentRow) : null;
}

/** Busca por token público — usado na página /aprovacao/[token] */
export async function getContentByToken(
  token: string
): Promise<Content | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("contents")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  if (error) {
    console.error("[Contents] getByToken error:", error);
    return null;
  }
  return data ? rowToContent(data as ContentRow) : null;
}

// === Escritas =====================================================

export interface CreateContentInput {
  taskId: string;
  title: string;
  kind: ContentKind;
  scheduledAt?: string;
  imageUrl?: string;
  caption?: string;
}

export async function createContent(
  input: CreateContentInput
): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");

  const row = {
    task_id: input.taskId,
    title: input.title,
    kind: input.kind,
    status: "em_producao",
    scheduled_at: input.scheduledAt ?? null,
    image_url: input.imageUrl ?? null,
    caption: input.caption ?? null,
  };

  const { data, error } = await sb
    .from("contents")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase insert: ${error.message}`);
  return rowToContent(data as ContentRow);
}

export interface UpdateContentInput {
  title?: string;
  kind?: ContentKind;
  scheduledAt?: string | null;
  imageUrl?: string | null;
  caption?: string | null;
}

export async function updateContent(
  id: number,
  input: UpdateContentInput
): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");

  const patch: Partial<ContentRow> = {};
  if ("title" in input) patch.title = input.title!;
  if ("kind" in input) patch.kind = input.kind!;
  if ("scheduledAt" in input) patch.scheduled_at = input.scheduledAt ?? null;
  if ("imageUrl" in input) patch.image_url = input.imageUrl ?? null;
  if ("caption" in input) patch.caption = input.caption ?? null;

  const { data, error } = await sb
    .from("contents")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}

export async function deleteContent(id: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");
  const { error } = await sb.from("contents").delete().eq("id", id);
  if (error) throw new Error(`Supabase delete: ${error.message}`);
}

// === Workflow actions =============================================

/**
 * Pede aprovação: gera token único, expira em 30 dias, muda status.
 * Idempotente: se já tem token válido, reusa.
 */
export async function requestApproval(id: number): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");

  const existing = await getContentById(id);
  if (!existing) throw new Error("Conteúdo não encontrado");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Reusa token se existir E não estiver expirado
  let token = existing.shareToken;
  const tokenValid =
    token && existing.shareExpiresAt && new Date(existing.shareExpiresAt) > now;

  if (!tokenValid) {
    token = randomBytes(16).toString("hex"); // 32 chars hex
  }

  // Limpa decisão anterior (cliente vai decidir de novo)
  const { data, error } = await sb
    .from("contents")
    .update({
      status: "aguardando_aprovacao",
      share_token: token,
      share_expires_at: expiresAt.toISOString(),
      client_decision: null,
      client_comment: null,
      client_decided_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}

/**
 * Cliente aprovou via link público → status: agendado
 */
export async function clientApprove(token: string): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");

  const existing = await getContentByToken(token);
  if (!existing) throw new Error("Link inválido ou expirado");
  if (existing.status !== "aguardando_aprovacao") {
    throw new Error("Conteúdo não está aguardando aprovação");
  }

  const { data, error } = await sb
    .from("contents")
    .update({
      status: "agendado",
      client_decision: "approved",
      client_comment: null,
      client_decided_at: new Date().toISOString(),
    })
    .eq("share_token", token)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}

/**
 * Cliente rejeitou (solicitou alteração) → volta pra em_producao com comentário
 */
export async function clientReject(
  token: string,
  comment: string
): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");

  const existing = await getContentByToken(token);
  if (!existing) throw new Error("Link inválido ou expirado");
  if (existing.status !== "aguardando_aprovacao") {
    throw new Error("Conteúdo não está aguardando aprovação");
  }

  const trimmed = comment.trim().slice(0, 2000);
  if (!trimmed) throw new Error("Comentário é obrigatório");

  const { data, error } = await sb
    .from("contents")
    .update({
      status: "em_producao",
      client_decision: "rejected",
      client_comment: trimmed,
      client_decided_at: new Date().toISOString(),
    })
    .eq("share_token", token)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}

/** Marca como publicado (gestor manual). */
export async function markAsPublished(id: number): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");
  const { data, error } = await sb
    .from("contents")
    .update({ status: "publicado" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}

/** Volta um conteúdo pra em_producao (ex: depois de receber comentário). */
export async function returnToProduction(id: number): Promise<Content> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase não configurado");
  const { data, error } = await sb
    .from("contents")
    .update({
      status: "em_producao",
      client_decision: null,
      client_comment: null,
      client_decided_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Supabase update: ${error.message}`);
  return rowToContent(data as ContentRow);
}
