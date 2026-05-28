// Server-only ClickUp REST adapter.
// Usa o Personal API Token do ClickUp definido em CLICKUP_API_TOKEN.
//
// NUNCA importe este módulo em código client-side — o token vazaria.

import "server-only";

const BASE = "https://api.clickup.com/api/v2";
const TOKEN = process.env.CLICKUP_API_TOKEN;
const WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID || "9011315823";
const MASTER_LIST_ID = process.env.CLICKUP_MASTER_LIST_ID || "901112849675";
const OPERATIONAL_SPACE_ID = process.env.CLICKUP_OPERATIONAL_SPACE_ID || "90114158210";

export const CLICKUP_CONFIGURED = !!TOKEN;
export const CLICKUP_WORKSPACE_ID = WORKSPACE_ID;
export const CLICKUP_MASTER_LIST_ID = MASTER_LIST_ID;
export const CLICKUP_OPERATIONAL_SPACE_ID = OPERATIONAL_SPACE_ID;

class ClickUpError extends Error {
  constructor(public path: string, public status: number, body: string) {
    super(`ClickUp ${path} -> ${status}: ${body.slice(0, 200)}`);
  }
}

// Timeout duro pra qualquer chamada à ClickUp — se passar disso, aborta.
// Evita que um único request travado pendure todo o app.
const CLICKUP_FETCH_TIMEOUT_MS = 8000;

async function ck<T>(path: string, init?: RequestInit): Promise<T> {
  if (!TOKEN) throw new Error("CLICKUP_API_TOKEN not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLICKUP_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
      // Sem cache do Next.js — usamos in-memory cache em lib/clients.ts
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ClickUpError(path, res.status, body);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ClickUpError(path, 0, `timeout after ${CLICKUP_FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// === Tipos ClickUp (subset) =========================================

export interface CKList {
  id: string;
  name: string;
  task_count?: number;
}

export interface CKFolder {
  id: string;
  name: string;
  lists?: CKList[];
}

export interface CKAssignee {
  id: number;
  username: string;
  email?: string;
  initials?: string;
  color?: string;
  profilePicture?: string | null;
}

export interface CKCustomFieldOption {
  id: string;
  name?: string;
  label?: string;
  color?: string;
  orderindex?: number;
}

export interface CKCustomFieldValue {
  id: string;
  name: string;
  type: string;
  type_config?: {
    options?: CKCustomFieldOption[];
    currency?: string;
  };
  value?: unknown;
}

export interface CKTask {
  id: string;
  name: string;
  description?: string;
  status?: { status: string; color?: string };
  assignees?: CKAssignee[];
  tags?: Array<{ name: string }>;
  due_date?: string | null;
  date_created?: string;
  date_updated?: string;
  url: string;
  list?: { id: string; name: string };
  custom_fields?: CKCustomFieldValue[];
}

// === Endpoints ======================================================

/** Tasks no cadastro mestre — cada task = 1 cliente. */
export async function listMasterClientTasks(): Promise<CKTask[]> {
  const data = await ck<{ tasks: CKTask[] }>(
    `/list/${MASTER_LIST_ID}/task?include_closed=true&subtasks=true`
  );
  return data.tasks;
}

/** Folders operacionais — cada folder = 1 cliente operacional. */
export async function listOperationalFolders(): Promise<CKFolder[]> {
  const data = await ck<{ folders: CKFolder[] }>(
    `/space/${OPERATIONAL_SPACE_ID}/folder?archived=false`
  );
  return data.folders;
}

export async function getFolder(folderId: string): Promise<CKFolder> {
  return ck<CKFolder>(`/folder/${folderId}`);
}

export async function listTasksInList(listId: string): Promise<CKTask[]> {
  const data = await ck<{ tasks: CKTask[] }>(
    `/list/${listId}/task?include_closed=true&subtasks=true`
  );
  return data.tasks;
}

export async function listTasksInFolder(folderId: string): Promise<CKTask[]> {
  const folder = await getFolder(folderId);
  const lists = folder.lists ?? [];
  const all = await Promise.all(
    lists.map((l) => listTasksInList(l.id).catch(() => []))
  );
  return all.flat();
}

// === Custom field extraction =======================================

/**
 * Busca um custom field pelo nome (regex case-insensitive)
 * e retorna o valor já decodificado (dropdown vira label, date vira ISO etc.)
 */
export function extractCustomField(
  task: CKTask | null,
  matcher: RegExp | string
): unknown {
  if (!task?.custom_fields) return null;
  const regex = typeof matcher === "string" ? new RegExp(matcher, "i") : matcher;
  const f = task.custom_fields.find((cf) => regex.test(cf.name));
  if (!f) return null;
  return decodeFieldValue(f);
}

/** Como acima, mas retorna todos os matches (útil quando há campos duplicados — ex: Serviço aparece 3x). */
export function extractCustomFieldAll(
  task: CKTask | null,
  matcher: RegExp | string
): unknown[] {
  if (!task?.custom_fields) return [];
  const regex = typeof matcher === "string" ? new RegExp(matcher, "i") : matcher;
  return task.custom_fields
    .filter((cf) => regex.test(cf.name))
    .map(decodeFieldValue)
    .filter((v) => v !== null && v !== undefined && v !== "");
}

function decodeFieldValue(f: CKCustomFieldValue): unknown {
  const val = f.value;
  if (val === undefined || val === null || val === "") return null;

  if (f.type === "drop_down" && f.type_config?.options) {
    const idx = Number(val);
    const option = f.type_config.options.find(
      (o) => o.id === val || o.orderindex === idx
    );
    return option?.name ?? option?.label ?? null;
  }

  if (f.type === "labels" && f.type_config?.options && Array.isArray(val)) {
    return (val as string[])
      .map((id) =>
        f.type_config!.options!.find((o) => o.id === id)?.label ??
        f.type_config!.options!.find((o) => o.id === id)?.name
      )
      .filter(Boolean);
  }

  if (f.type === "date") {
    const n = Number(val);
    if (!Number.isNaN(n)) return new Date(n).toISOString();
    return val;
  }

  if (f.type === "currency" || f.type === "number") {
    return typeof val === "string" ? parseFloat(val) : val;
  }

  if (f.type === "users" && Array.isArray(val)) {
    return (val as Array<{ username?: string; email?: string }>)
      .map((u) => u.username ?? u.email)
      .filter(Boolean);
  }

  return val;
}

// === Criação (já usado, mantido) ====================================

export async function createTaskInList(
  listId: string,
  payload: {
    name: string;
    description?: string;
    markdown_description?: string;
    assignees?: number[];
    tags?: string[];
  }
): Promise<CKTask> {
  return ck<CKTask>(`/list/${listId}/task`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// === Custom field write (Farol e outros dropdowns) ==================

/**
 * Define o valor de um custom field em uma task.
 * Para dropdowns, o `value` deve ser o ID da opção (não o nome).
 */
export async function setTaskCustomField(
  taskId: string,
  fieldId: string,
  value: unknown
): Promise<void> {
  await ck(`/task/${taskId}/field/${fieldId}`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

// IDs dos campos/opções do Farol (criados via REST na fase de setup).
// Hardcoded para evitar 1 round-trip extra; se forem recriados, atualizar aqui.
export const FAROL_FIELD_ID = "0b698494-0289-45d5-85cb-caff21fbcc01";
export const FAROL_OPTIONS: Record<"verde" | "amarelo" | "vermelho", string> = {
  verde: "08d313d9-4527-4ab3-8705-f7a3e6f17ee7",
  amarelo: "f79be0dc-209d-491d-ba38-e0806e3f966c",
  vermelho: "01f2766b-78d5-43f2-b56f-d5090347a526",
};

export async function setFarol(
  taskId: string,
  status: "verde" | "amarelo" | "vermelho"
): Promise<void> {
  const optionId = FAROL_OPTIONS[status];
  if (!optionId) throw new Error(`Farol invalido: ${status}`);
  await setTaskCustomField(taskId, FAROL_FIELD_ID, optionId);
}
