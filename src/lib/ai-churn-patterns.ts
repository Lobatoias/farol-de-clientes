// Análise de padrões de churn via Claude.
// Cruza eventos de saída + notas de reunião dos clientes que saíram
// + clientes ativos críticos (sinais antecipatórios) e devolve insights
// acionáveis pro Head decidir o que fazer.

import "server-only";
import { getAnthropic, DEFAULT_MODEL, ANTHROPIC_CONFIGURED } from "./anthropic";
import type { ChurnEvent, Client } from "./types";

export interface ChurnPattern {
  /** Título curto e específico — ex: "3 saídas mencionavam criativo travado". */
  title: string;
  /** Por que isso importa, em 1-2 frases. */
  rationale: string;
  /** Trechos/IDs que comprovam o padrão. */
  evidence: string[];
  /** Sugestão prática de ação. */
  recommendation: string;
  /** Quantas saídas o padrão cobre. */
  affectedCount: number;
}

export interface VerbalCue {
  phrase: string;
  /** Em quantos clientes que SAÍRAM apareceu. */
  occurrences: number;
  /** Quais clientes (nomes). */
  clientNames: string[];
}

export interface EarlyWarning {
  clientName: string;
  /** Razões pra suspeitar. */
  signals: string[];
  /** Severidade subjetiva. */
  riskLevel: "alto" | "medio" | "baixo";
}

export interface ChurnAnalysis {
  /** Resumo executivo, 2-4 frases. */
  summary: string;
  /** Padrões sistêmicos identificados. */
  patterns: ChurnPattern[];
  /** Frases recorrentes em reuniões que precederam saídas. */
  verbalCues: VerbalCue[];
  /** Clientes ativos que parecem caminhar pra sair. */
  earlyWarnings: EarlyWarning[];
  /** Ações preventivas concretas pro time. */
  preventiveActions: string[];
  /** Quando foi gerada (ISO timestamp). */
  generatedAt: string;
  /** Modelo Claude usado. */
  model: string;
  /** Quantos eventos foram analisados. */
  eventsAnalyzed: number;
}

// === Snapshot do input enviado pro modelo =========================

interface ChurnedClientSnapshot {
  taskId: string;
  name: string;
  churnedAt: string;
  reasons: string[];
  reasonDetails?: string;
  csmAtTime?: string;
  monthlyRevenueAtTime?: number;
  nicheAtTime?: string;
  meetingNotes?: string;
}

interface ActiveClientSnapshot {
  taskId: string;
  name: string;
  status: string;
  owner: string;
  niche?: string;
  monthlyRevenue?: number;
  lastMeetingAt?: string;
  meetingNotes?: string;
  openTickets: number;
}

/**
 * Limita meeting notes a N chars pra não inflar prompt — pega últimas
 * (mais relevantes) preservando começo/fim em casos extremos.
 */
function truncateNotes(notes: string | undefined, max: number): string | undefined {
  if (!notes) return undefined;
  const trimmed = notes.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 100)}\n\n[…truncado…]\n\n${trimmed.slice(-100)}`;
}

function buildChurnedSnapshots(
  events: ChurnEvent[],
  allClients: Client[]
): ChurnedClientSnapshot[] {
  const byId = new Map(allClients.map((c) => [c.id, c]));
  return events.map((e) => {
    const client = byId.get(e.taskId);
    return {
      taskId: e.taskId,
      name: client?.name ?? "(cliente removido)",
      churnedAt: e.churnedAt,
      reasons: e.reasons,
      reasonDetails: e.reasonDetails,
      csmAtTime: e.csmAtTime,
      monthlyRevenueAtTime: e.monthlyRevenueAtTime,
      nicheAtTime: e.nicheAtTime,
      meetingNotes: truncateNotes(client?.meetingNotes, 2500),
    };
  });
}

function buildActiveSnapshots(activeClients: Client[]): ActiveClientSnapshot[] {
  // Limita a clientes em risco (amarelo/vermelho) pra economizar tokens
  const atRisk = activeClients.filter((c) => c.status !== "verde");
  return atRisk.map((c) => ({
    taskId: c.id,
    name: c.name,
    status: c.status,
    owner: c.owner,
    niche: c.niche,
    monthlyRevenue: c.monthlyRevenue,
    lastMeetingAt: c.lastMeetingAt,
    meetingNotes: truncateNotes(c.meetingNotes, 1500),
    openTickets: c.openTickets,
  }));
}

// === System prompt ================================================

const SYSTEM_PROMPT = `Você é um analista sênior de Customer Success especializado em retenção de clientes em agências de marketing digital. Seu trabalho é cruzar dados de clientes que SAÍRAM (churn) com notas de reunião e dados de clientes ATIVOS pra achar padrões sistêmicos acionáveis.

Princípios:
- Seja ESPECÍFICO. Cite clientes pelo nome, datas, frases reais das reuniões.
- Achar 0-2 padrões com evidência forte vale muito mais que 10 padrões genéricos.
- "Padrão" exige evidência em pelo menos 2 clientes/eventos diferentes.
- Recomendações práticas: o que o Head pode fazer essa semana — NÃO "melhorar comunicação", e SIM "criar template de revisão semanal pra os 3 clientes do nicho X".
- Política da casa: NUNCA recomende dar desconto, pacote de retenção com desconto, ou save offer financeira. Recomendações devem ser operacionais (entrega, comunicação, alinhamento de expectativa).
- Português brasileiro coloquial mas profissional.

Você SEMPRE responde com JSON válido no formato exato pedido pelo usuário, sem texto adicional fora do JSON.`;

const USER_PROMPT_TEMPLATE = (
  churned: ChurnedClientSnapshot[],
  active: ActiveClientSnapshot[]
) => `Analise os dados abaixo e devolva insights estruturados.

# Clientes que saíram (${churned.length} eventos)

${JSON.stringify(churned, null, 2)}

# Clientes ativos em risco (amarelo ou vermelho) — para detecção precoce (${active.length})

${JSON.stringify(active, null, 2)}

# Formato de resposta esperado

Devolva APENAS um objeto JSON, sem markdown nem texto extra, com este schema:

{
  "summary": "string — 2 a 4 frases resumindo a foto geral",
  "patterns": [
    {
      "title": "string curto",
      "rationale": "string — 1-2 frases explicando por que importa",
      "evidence": ["string — citação ou referência", "..."],
      "recommendation": "string — ação prática (sem desconto)",
      "affectedCount": number
    }
  ],
  "verbalCues": [
    {
      "phrase": "string — frase ou palavra-chave recorrente nas reuniões antes das saídas",
      "occurrences": number,
      "clientNames": ["string", "..."]
    }
  ],
  "earlyWarnings": [
    {
      "clientName": "string — cliente ATIVO que tem sinais parecidos com os que saíram",
      "signals": ["string — sinal observado", "..."],
      "riskLevel": "alto" | "medio" | "baixo"
    }
  ],
  "preventiveActions": [
    "string — ação operacional pro time fazer esta semana"
  ]
}

Regras:
- Se faltar evidência pra um campo, devolva array vazio (preferível a inventar).
- Liste no máximo 5 patterns, 8 verbalCues, 5 earlyWarnings, 6 preventiveActions.
- Patterns SÓ se houver ao menos 2 eventos comprovando.
- earlyWarnings SÓ pra clientes ativos da lista, NUNCA invente clientes.
- NUNCA mencione desconto, redução de preço ou pacote de retenção financeiro.`;

// === Função principal ===========================================

export async function generateChurnAnalysis(
  events: ChurnEvent[],
  allClients: Client[]
): Promise<ChurnAnalysis> {
  if (!ANTHROPIC_CONFIGURED) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Configure na Vercel pra ativar a análise de IA."
    );
  }
  if (events.length === 0) {
    throw new Error("Nenhuma saída registrada ainda — análise indisponível.");
  }

  const client = getAnthropic();
  if (!client) {
    throw new Error("Anthropic client não inicializado.");
  }

  const churnedSnapshots = buildChurnedSnapshots(events, allClients);
  const activeSnapshots = buildActiveSnapshots(allClients);

  const userPrompt = USER_PROMPT_TEMPLATE(churnedSnapshots, activeSnapshots);

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  // Extrai texto da resposta
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA sem conteúdo textual.");
  }
  const raw = textBlock.text.trim();

  // Remove markdown fences se vier por acidente
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(
      `Resposta da IA não é JSON válido: ${err instanceof Error ? err.message : "parse error"}`
    );
  }

  // Validação leve do shape
  const p = parsed as Partial<ChurnAnalysis>;
  if (typeof p.summary !== "string") {
    throw new Error("Resposta da IA sem campo 'summary'.");
  }

  const analysis: ChurnAnalysis = {
    summary: p.summary,
    patterns: Array.isArray(p.patterns) ? (p.patterns as ChurnPattern[]) : [],
    verbalCues: Array.isArray(p.verbalCues) ? (p.verbalCues as VerbalCue[]) : [],
    earlyWarnings: Array.isArray(p.earlyWarnings)
      ? (p.earlyWarnings as EarlyWarning[])
      : [],
    preventiveActions: Array.isArray(p.preventiveActions)
      ? (p.preventiveActions as string[])
      : [],
    generatedAt: new Date().toISOString(),
    model: DEFAULT_MODEL,
    eventsAnalyzed: events.length,
  };

  return analysis;
}
