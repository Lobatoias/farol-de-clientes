// Orquestrador de dados de clientes.
// Modelo: união entre cadastro mestre (lista Clientes) e folders operacionais.

import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Client, ClientEvent, Status } from "./types";
import { mockClients } from "./mock-data";
import {
  CLICKUP_CONFIGURED,
  CLICKUP_WORKSPACE_ID,
  extractCustomField,
  extractCustomFieldAll,
  listMasterClientTasks,
  listOperationalFolders,
  listTasksInFolder,
  isTaskDone,
  type CKFolder,
  type CKTask,
} from "./clickup";

export interface FinancialEntry {
  name?: string;
  monthlyRevenue?: number;
  contractStartAt?: string;
  contractEndAt?: string;
  clientSince?: string;
  // Legado mock (mrr/cost)
  mrr?: number;
  cost?: number;
}

interface FinancialsFile {
  [taskOrFolderId: string]: FinancialEntry;
}

const FINANCIALS_PATH = path.join(process.cwd(), "data", "financials.local.json");

// === Supabase loader (production-ready) =============================

import { getSupabase, type FinancialRow } from "./supabase";
import {
  loadClientsSnapshot,
  saveClientsSnapshot,
  deleteClientsSnapshot,
} from "./clients-snapshot";
import { buildChurnIndex, loadAllChurnEventsSafe } from "./churn";

function rowToEntry(row: FinancialRow): FinancialEntry {
  return {
    name: row.name ?? undefined,
    monthlyRevenue: row.monthly_revenue ?? undefined,
    contractStartAt: row.contract_start_at ?? undefined,
    contractEndAt: row.contract_end_at ?? undefined,
    clientSince: row.client_since ?? undefined,
    mrr: row.mrr ?? undefined,
    cost: row.cost ?? undefined,
  };
}

async function loadFinancialsFromSupabase(): Promise<FinancialsFile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("financials").select("*");
  if (error) {
    console.error("[Farol] Supabase load error:", error);
    return null;
  }
  const map: FinancialsFile = {};
  for (const row of (data ?? []) as FinancialRow[]) {
    map[row.task_id] = rowToEntry(row);
  }
  return map;
}

async function loadFinancialsFromFile(): Promise<FinancialsFile> {
  try {
    const file = await fs.readFile(FINANCIALS_PATH, "utf-8");
    const parsed = JSON.parse(file) as FinancialsFile;
    delete (parsed as Record<string, unknown>)._README;
    return parsed;
  } catch {
    return {};
  }
}

async function loadFinancials(): Promise<FinancialsFile> {
  // Sem cache em memória — em produção (Vercel) cada instância serverless
  // teria seu próprio cache, causando inconsistência entre usuários.
  const fromSupabase = await loadFinancialsFromSupabase();
  return fromSupabase ?? (await loadFinancialsFromFile());
}

export function invalidateFinancialsCache(): void {
  // Mantido por compatibilidade, mas não-op porque não temos mais cache local.
  // A invalidação real acontece via revalidatePath() no API route.
}

export async function getFinancialEntry(id: string): Promise<FinancialEntry | null> {
  const all = await loadFinancials();
  return all[id] ?? null;
}

async function saveFinancialEntryToSupabase(
  id: string,
  entry: Partial<FinancialEntry>
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  // 1) Lê o existente pra usar como base
  const { data: existing } = await sb
    .from("financials")
    .select("*")
    .eq("task_id", id)
    .maybeSingle();

  // 2) Começa com TODOS os campos do existing (preserva tudo que já tem)
  const merged: Partial<FinancialRow> = existing ? { ...existing } : {};

  // 3) Aplica APENAS os campos que vieram no entry — chave por chave
  //    (entry usa camelCase, tabela snake_case — mapeamento explícito)
  if ("name" in entry) merged.name = entry.name ?? null;
  if ("monthlyRevenue" in entry) merged.monthly_revenue = entry.monthlyRevenue ?? null;
  if ("contractStartAt" in entry) merged.contract_start_at = entry.contractStartAt ?? null;
  if ("contractEndAt" in entry) merged.contract_end_at = entry.contractEndAt ?? null;
  if ("clientSince" in entry) merged.client_since = entry.clientSince ?? null;
  if ("mrr" in entry) merged.mrr = entry.mrr ?? null;
  if ("cost" in entry) merged.cost = entry.cost ?? null;

  // 4) task_id sempre presente
  merged.task_id = id;

  // 5) Limpa metadados que o Supabase gerencia
  delete (merged as Record<string, unknown>).created_at;
  delete (merged as Record<string, unknown>).updated_at;

  const { error } = await sb.from("financials").upsert(merged, { onConflict: "task_id" });
  if (error) {
    console.error("[Farol] Supabase save error:", error);
    throw new Error(error.message);
  }
  return true;
}

async function saveFinancialEntryToFile(
  id: string,
  entry: Partial<FinancialEntry>
): Promise<void> {
  let current: FinancialsFile = {};
  try {
    const file = await fs.readFile(FINANCIALS_PATH, "utf-8");
    current = JSON.parse(file) as FinancialsFile;
  } catch {
    // arquivo nao existe
  }
  const _readme = (current as Record<string, unknown>)._README;
  const existing = current[id] ?? {};
  const merged: FinancialEntry = { ...existing, ...entry };
  (Object.keys(merged) as Array<keyof FinancialEntry>).forEach((k) => {
    if (merged[k] === null || merged[k] === undefined || merged[k] === "") {
      delete merged[k];
    }
  });
  if (Object.keys(merged).filter((k) => k !== "name").length === 0) {
    delete current[id];
  } else {
    current[id] = merged;
  }
  const ordered: FinancialsFile = {};
  if (_readme) (ordered as Record<string, unknown>)._README = _readme;
  for (const k of Object.keys(current).filter((k) => k !== "_README").sort()) {
    ordered[k] = current[k];
  }
  await fs.writeFile(FINANCIALS_PATH, JSON.stringify(ordered, null, 2), "utf-8");
}

export async function saveFinancialEntry(
  id: string,
  entry: Partial<FinancialEntry>
): Promise<void> {
  const savedToSupabase = await saveFinancialEntryToSupabase(id, entry).catch((err) => {
    console.error("[Farol] Falha no Supabase, caindo pro arquivo:", err);
    return false;
  });
  if (!savedToSupabase) {
    // Sem Supabase (dev) ou falhou: escreve no arquivo
    await saveFinancialEntryToFile(id, entry);
  }
  invalidateFinancialsCache();
}

const FAROL_MAP: Record<string, Status> = {
  verde: "verde",
  amarelo: "amarelo",
  vermelho: "vermelho",
  // tolerância para variações
  ok: "verde",
  atencao: "amarelo",
  "atenção": "amarelo",
  critico: "vermelho",
  "crítico": "vermelho",
};

function parseFarol(value: unknown): Status {
  if (!value) return "verde";
  const s = String(value).toLowerCase().trim().replace(/[^\w]/g, "");
  return FAROL_MAP[s] ?? FAROL_MAP[String(value).toLowerCase().trim()] ?? "verde";
}

// Normaliza nome de cliente para casamento entre master e folder
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^\w\sÀ-ÖØ-öø-ÿ]/g, "") // remove pontuação mas mantém acentos
    .replace(/\s+/g, " ");
}

function buildEventsFromFolderTasks(tasks: CKTask[]): ClientEvent[] {
  return tasks
    .map((t): ClientEvent => {
      const dateMs = t.date_updated ? Number(t.date_updated) : null;
      const date = dateMs ? new Date(dateMs).toISOString() : new Date().toISOString();
      const author = t.assignees?.[0]?.username;
      const description = t.description?.trim() || undefined;
      const name = t.name.toLowerCase();
      const type: ClientEvent["type"] = /reuni/.test(name)
        ? "reuniao"
        : /relat[oó]rio|^nf$|entrega|fechamento/.test(name)
        ? "entrega"
        : /otimiza|planeja|mensura|publica|criativ|campanha|análise|analisar/.test(name)
        ? "tarefa"
        : "tarefa";
      return {
        id: t.id,
        type,
        date,
        title: t.name,
        description,
        author,
        status: t.status?.status,
        statusType: t.status?.type,
        url: t.url,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    // 60 (era 20): com as abas Abertas/Concluídas a lista não abarrota,
    // e o histórico de concluídas precisa de profundidade pra ser útil.
    .slice(0, 60);
}

function buildClientFromMasterTask(
  task: CKTask,
  operationalFolder: CKFolder | null,
  operationalTasks: CKTask[] | null, // null = lazy (não carregado)
  financials: FinancialsFile
): Client {
  const farolVal = extractCustomField(task, /farol/i);
  const status = parseFarol(farolVal);
  const nps = extractCustomField(task, /^nps$/i);
  const lastMeeting = extractCustomField(task, /^[uú]ltima\s+reuni/i) as string | null;
  const nextMeeting = extractCustomField(task, /^pr[oó]xima\s+reuni/i) as string | null;
  const resumo = extractCustomField(task, /resumo.*executivo/i) as string | null;
  const sinais = extractCustomField(task, /sinais.*risco/i) as string[] | null;
  const meetingNotes = extractCustomField(task, /notas.*(reuni|última)/i) as string | null;

  // Campos existentes da agência
  const niche = extractCustomField(task, /^nicho$/i) as string | null;
  const investmentMeta = extractCustomField(task, /investimento.*meta/i) as number | null;
  const investmentGoogle = extractCustomField(task, /investimento.*google/i) as number | null;
  const services = extractCustomFieldAll(task, /^servi[çc]o/i) as string[];
  const reviewers = extractCustomField(task, /respons[áa]vel.*revis/i) as string[] | null;

  const owner = reviewers?.[0] ?? task.assignees?.[0]?.username ?? "Sem responsável";

  const fin = financials[task.id] ?? {};
  const mrr = fin.mrr ?? 0;
  const cost = fin.cost ?? 0;

  const events = operationalTasks ? buildEventsFromFolderTasks(operationalTasks) : [];
  const openTickets = operationalTasks
    ? operationalTasks.filter(
        (t) => t.status?.status && !isTaskDone(t)
      ).length
    : 0;

  const summary =
    resumo ||
    (status === "verde"
      ? `${task.name} — ${niche ?? "sem nicho"} · ${services.length} serviço(s) · ${owner}`
      : status === "amarelo"
      ? `${task.name} requer atenção. ${sinais?.length ?? 0} sinal(is) de risco identificado(s).`
      : `${task.name} em situação crítica. Escalada recomendada.`);

  return {
    id: task.id,
    name: task.name,
    segment: "Mid-Market",
    owner,
    status,
    statusChangedAt: task.date_updated
      ? new Date(Number(task.date_updated)).toISOString()
      : new Date().toISOString(),
    niche: niche ?? undefined,
    services: services.length > 0 ? services : undefined,
    investmentMeta: investmentMeta ?? undefined,
    investmentGoogle: investmentGoogle ?? undefined,
    monthlyRevenue: fin.monthlyRevenue,
    contractStartAt: fin.contractStartAt,
    contractEndAt: fin.contractEndAt,
    clientSince: fin.clientSince,
    mrr,
    cost,
    margin: mrr > 0 ? (mrr - cost) / mrr : 0,
    nps: typeof nps === "number" ? nps : nps ? Number(nps) : undefined,
    lastMeetingAt: lastMeeting ?? undefined,
    nextMeetingAt: nextMeeting ?? undefined,
    meetingNotes: meetingNotes ?? undefined,
    openTickets,
    riskTags: Array.isArray(sinais) ? sinais : [],
    summary,
    events,
    clickupMasterTaskId: task.id,
    clickupMasterUrl: task.url,
    clickupFolderId: operationalFolder?.id,
    clickupUrl: operationalFolder
      ? `https://app.clickup.com/${CLICKUP_WORKSPACE_ID}/v/f/${operationalFolder.id}`
      : task.url,
    hasMasterRecord: true,
    hasOperationalFolder: !!operationalFolder,
  };
}

function buildClientFromFolderOnly(folder: CKFolder, operationalTasks: CKTask[] | null): Client {
  const owner = operationalTasks?.[0]?.assignees?.[0]?.username ?? "Sem responsável";
  return {
    id: `folder-${folder.id}`,
    name: folder.name,
    segment: "Mid-Market",
    owner,
    status: "verde",
    statusChangedAt: new Date().toISOString(),
    mrr: 0,
    cost: 0,
    margin: 0,
    openTickets: operationalTasks
      ? operationalTasks.filter(
          (t) => t.status?.status && !isTaskDone(t)
        ).length
      : 0,
    riskTags: [],
    summary: `${folder.name} tem folder operacional mas não está cadastrado em Gestão de Clientes. Adicione ao cadastro mestre para liberar Farol/NPS/etc.`,
    events: operationalTasks ? buildEventsFromFolderTasks(operationalTasks) : [],
    clickupFolderId: folder.id,
    clickupUrl: `https://app.clickup.com/${CLICKUP_WORKSPACE_ID}/v/f/${folder.id}`,
    hasMasterRecord: false,
    hasOperationalFolder: true,
  };
}

let inflightGetClients: Promise<Client[]> | null = null;
let clientsCache: { data: Client[]; expiresAt: number } | null = null;
/**
 * Janela pós-mutação em que o snapshot compartilhado é ignorado
 * (acabou de ficar velho; o delete dele é assíncrono).
 */
let snapshotBypassUntil = 0;
/**
 * O último doGetClients() carregou o churn com sucesso? Se NÃO (Supabase
 * piscou), não cacheamos/snapshotamos: clientes que saíram apareceriam como
 * ativos e isso ficaria preso por 30s, inflando MRR/LTV e subavaliando churn.
 */
let lastChurnLoadOk = true;

/**
 * TTL curto pra balancear velocidade vs consistência multi-instância.
 * Cada Vercel instance tem seu cache; pior caso = 30s de "delay" de
 * propagação entre instâncias quando alguém edita algo. Mutations chamam
 * invalidateClientsCache() pra zerar imediatamente.
 */
const CLIENTS_CACHE_TTL_MS = 30_000;

export async function getClients(): Promise<Client[]> {
  if (!CLICKUP_CONFIGURED) {
    return mockClients;
  }

  // 1) Cache válido — retorna na hora
  const now = Date.now();
  if (clientsCache && clientsCache.expiresAt > now) {
    return clientsCache.data;
  }

  // 2) Dedup de promises em-vôo — evita stampede no MESMO render
  if (inflightGetClients) {
    return inflightGetClients;
  }

  inflightGetClients = doGetClients()
    .then((data) => {
      // NUNCA cachear o fallback de mocks (quando ClickUp falha/timeout).
      // Senão um único timeout envenena o cache por 30s e TODOS os
      // /cliente/[id] retornam 404 (IDs reais não existem nos mocks).
      // Não persistir mocks (timeout do ClickUp) nem um estado com churn
      // incompleto (Supabase piscou) — serve nesta request, mas a próxima
      // refaz, evitando dado errado preso por 30s.
      if (data !== mockClients && lastChurnLoadOk) {
        clientsCache = { data, expiresAt: Date.now() + CLIENTS_CACHE_TTL_MS };
        // Mantém o snapshot compartilhado fresco pras outras instâncias
        void saveClientsSnapshot(data);
      }
      return data;
    })
    .finally(() => {
      inflightGetClients = null;
    });

  // 3) Stale-while-revalidate entre instâncias: sem cache local, corre o
  // snapshot do Supabase (~300ms) contra o refresh do ClickUp (2-8s).
  // Quem chegar primeiro responde; o refresh segue e atualiza o cache.
  const refresh = inflightGetClients;
  if (now >= snapshotBypassUntil) {
    const winner = await Promise.race([
      loadClientsSnapshot().then((data) =>
        data ? { src: "snapshot" as const, data } : null
      ),
      refresh.then((data) => ({ src: "fresh" as const, data })),
    ]).catch(() => null);
    if (winner) {
      if (winner.src === "snapshot" && !clientsCache) {
        // Cacheia o snapshot; o refresh sobrescreve com dados frescos ao chegar
        clientsCache = {
          data: winner.data,
          expiresAt: Date.now() + CLIENTS_CACHE_TTL_MS,
        };
      }
      return winner.data;
    }
    // winner null = snapshot indisponível e ClickUp ainda buscando
  }
  return refresh;
}

async function doGetClients(): Promise<Client[]> {

  try {
    const [masterTasks, operationalFolders, financials, churnResult] =
      await Promise.all([
        listMasterClientTasks(),
        listOperationalFolders(),
        loadFinancials(),
        loadAllChurnEventsSafe(),
      ]);
    // Se o churn falhou, marca pro getClients() NÃO cachear/snapshotar
    // este resultado (senão clientes que saíram ficariam presos como ativos).
    lastChurnLoadOk = churnResult.ok;
    const churnIndex = buildChurnIndex(churnResult.events);

    // Indexar folders por nome normalizado pra casamento
    const foldersByName = new Map<string, CKFolder>();
    for (const folder of operationalFolders) {
      foldersByName.set(normalizeName(folder.name), folder);
    }

    const matchedFolderIds = new Set<string>();
    const clients: Client[] = [];

    // 1) Para cada cliente do master, casa com folder operacional pelo nome.
    // NÃO fetcha tasks da timeline aqui — fica lazy pra getClientById (detail).
    for (const task of masterTasks) {
      const normalized = normalizeName(task.name);
      let folder = foldersByName.get(normalized) ?? null;

      // Fallback: match parcial
      if (!folder) {
        for (const [folderName, folderObj] of foldersByName) {
          const parts = normalized.split(" ");
          if (parts.length >= 2 && folderName.includes(parts.slice(0, 2).join(" "))) {
            folder = folderObj;
            break;
          }
        }
      }

      if (folder) matchedFolderIds.add(folder.id);

      // operationalTasks = null → buildClient usa placeholders (events: [], openTickets: 0)
      clients.push(buildClientFromMasterTask(task, folder, null, financials));
    }

    // 2) Folders sem master record → entradas virtuais (lazy tb)
    for (const folder of operationalFolders) {
      if (matchedFolderIds.has(folder.id)) continue;
      if (/processos|padr[oõ]es|cbs imports|^vela latina$/i.test(folder.name)) continue;
      clients.push(buildClientFromFolderOnly(folder, null));
    }

    // Decora cada cliente com info de churn (se houver)
    for (const c of clients) {
      const ev = churnIndex.get(c.id);
      if (ev) {
        c.isChurned = true;
        c.lastChurnEvent = ev;
      }
    }

    // Ordenar: críticos primeiro, depois por nome
    const STATUS_ORDER: Record<Status, number> = { vermelho: 0, amarelo: 1, verde: 2 };
    clients.sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return a.name.localeCompare(b.name);
    });

    return clients;
  } catch (err) {
    console.error("[Farol] Erro ao buscar do ClickUp:", err);
    return mockClients;
  }
}

/**
 * Versão "rica" — busca tasks do folder operacional para popular timeline e openTickets.
 * Custosa, usar só na página de detalhe de UM cliente.
 */
async function enrichClientWithTimeline(client: Client): Promise<Client> {
  if (!client.clickupFolderId) return client;
  try {
    const operationalTasks = await listTasksInFolder(client.clickupFolderId);
    return {
      ...client,
      events: buildEventsFromFolderTasks(operationalTasks),
      openTickets: operationalTasks.filter(
        (t) => t.status?.status && !isTaskDone(t)
      ).length,
    };
  } catch (err) {
    console.error("[Farol] enrichClientWithTimeline falhou pra", client.name, err);
    return client;
  }
}

/**
 * Versão "leve" — não busca timeline. Usa só dados do master list (já cacheados).
 * Retorna em ~50ms quando o cache de getClients() está quente.
 *
 * Para a página de detalhe: use isso pro render rápido E carregue
 * a timeline em paralelo via getClientTimeline() dentro de um Suspense.
 */
export async function getClientById(id: string): Promise<Client | undefined> {
  const all = await getClients();
  return all.find((c) => c.id === id);
}

/**
 * Versão "rica" — inclui timeline (custosa). Use só onde realmente precisar.
 * Geralmente é melhor chamar getClientById() + getClientTimeline() em paralelo
 * via Suspense pra a página renderizar enquanto a timeline carrega.
 */
export async function getClientByIdWithTimeline(
  id: string
): Promise<Client | undefined> {
  const c = await getClientById(id);
  if (!c) return undefined;
  return enrichClientWithTimeline(c);
}

/**
 * Carrega só a timeline + tickets abertos pra um cliente.
 * Use dentro de um Suspense pra streaming.
 */
export async function getClientTimeline(
  id: string
): Promise<{ events: ClientEvent[]; openTickets: number } | null> {
  const c = await getClientById(id);
  if (!c || !c.clickupFolderId) return { events: [], openTickets: 0 };
  try {
    const operationalTasks = await listTasksInFolder(c.clickupFolderId);
    return {
      events: buildEventsFromFolderTasks(operationalTasks),
      openTickets: operationalTasks.filter(
        (t) => t.status?.status && !isTaskDone(t)
      ).length,
    };
  } catch (err) {
    console.error("[Farol] getClientTimeline falhou pra", c.name, err);
    return { events: [], openTickets: 0 };
  }
}

export function isUsingMockData(): boolean {
  return !CLICKUP_CONFIGURED;
}

/** Só clientes ATIVOS (que não saíram). Use no dashboard, métricas, etc. */
export async function getActiveClients(): Promise<Client[]> {
  const all = await getClients();
  return all.filter((c) => !c.isChurned);
}

/** Só clientes que SAÍRAM. Use no /saidas e nas análises de churn. */
export async function getChurnedClients(): Promise<Client[]> {
  const all = await getClients();
  return all.filter((c) => c.isChurned);
}

/** Invalida a cache em memória — chamar após mutações (ex: mudar Farol). */
export function invalidateClientsCache(): void {
  clientsCache = null;
  inflightGetClients = null;
  // Snapshot compartilhado também está velho: ignora por 60s nesta
  // instância e apaga no Supabase (o próximo fetch real regrava).
  snapshotBypassUntil = Date.now() + 60_000;
  void deleteClientsSnapshot();
}

export interface CoverageStats {
  total: number;
  masterAndFolder: number;
  masterOnly: number;
  folderOnly: number;
}

export async function getCoverageStats(): Promise<CoverageStats> {
  const clients = await getClients();
  return {
    total: clients.length,
    masterAndFolder: clients.filter((c) => c.hasMasterRecord && c.hasOperationalFolder).length,
    masterOnly: clients.filter((c) => c.hasMasterRecord && !c.hasOperationalFolder).length,
    folderOnly: clients.filter((c) => !c.hasMasterRecord && c.hasOperationalFolder).length,
  };
}
