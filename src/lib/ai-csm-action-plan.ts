// Plano de ação focado em UM CSM específico com churn rate alto.
// Diferente da análise geral em /saidas — aqui o escopo é só os clientes
// daquele responsável (perdidos e ativos), pra gerar plano operacional
// que ele possa executar nos próximos 7/30/90 dias.

import "server-only";
import { ANTHROPIC_CONFIGURED, DEFAULT_MODEL, getAnthropic } from "./anthropic";
import type { ChurnEvent, Client } from "./types";

export interface CsmDiagnostico {
  causa: string;
  evidencia: string[];
  afetados: number;
}

export interface CsmPadraoReuniao {
  padrao: string;
  exemplos: string[];
  ocorrencias: number;
}

export interface CsmSinalAtivo {
  cliente: string;
  alerta: string;
  severidade: "alta" | "media" | "baixa";
}

export interface CsmPlano {
  imediato: string[]; // próximos 7 dias
  trintaDias: string[];
  noventaDias: string[];
}

export interface CsmCheckIn {
  topicos: string[];
  perguntasChave: string[];
}

export interface CsmActionPlan {
  csm: string;
  situacao: string;
  diagnostico: CsmDiagnostico[];
  padroesReunioes: CsmPadraoReuniao[];
  sinaisEmAtivos: CsmSinalAtivo[];
  plano: CsmPlano;
  checkIn: CsmCheckIn;
  generatedAt: string;
  model: string;
  metrics: {
    activeCount: number;
    churnCount: number;
    churnRatePct: number;
    activeMrr: number;
    churnMrrLost: number;
  };
}

// === Helpers =====================================================

function truncate(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 50)}\n[…truncado…]`;
}

interface ChurnedSnap {
  taskId: string;
  name: string;
  churnedAt: string;
  reasons: string[];
  reasonDetails?: string;
  monthlyRevenueAtTime?: number;
  nicheAtTime?: string;
  meetingNotes?: string;
}

interface AtivoSnap {
  taskId: string;
  name: string;
  status: string;
  niche?: string;
  monthlyRevenue?: number;
  openTickets: number;
  lastMeetingAt?: string;
  meetingNotes?: string;
}

function buildChurnedSnaps(
  events: ChurnEvent[],
  allClients: Client[]
): ChurnedSnap[] {
  const byId = new Map(allClients.map((c) => [c.id, c]));
  return events.map((e) => {
    const client = byId.get(e.taskId);
    return {
      taskId: e.taskId,
      name: client?.name ?? "(removido)",
      churnedAt: e.churnedAt,
      reasons: e.reasons,
      reasonDetails: e.reasonDetails,
      monthlyRevenueAtTime: e.monthlyRevenueAtTime,
      nicheAtTime: e.nicheAtTime,
      meetingNotes: truncate(client?.meetingNotes, 2500),
    };
  });
}

function buildActiveSnaps(
  activeClients: Client[],
  csm: string
): AtivoSnap[] {
  // Só os ativos sob esse CSM
  const filtered = activeClients.filter(
    (c) => (c.owner || "Sem responsável") === csm
  );
  return filtered.map((c) => ({
    taskId: c.id,
    name: c.name,
    status: c.status,
    niche: c.niche,
    monthlyRevenue: c.monthlyRevenue,
    openTickets: c.openTickets,
    lastMeetingAt: c.lastMeetingAt,
    meetingNotes: truncate(c.meetingNotes, 1500),
  }));
}

// === System prompt ===============================================

const SYSTEM_PROMPT = `Você é especialista sênior em retenção de clientes em agências de marketing digital. Recebeu o pedido de gerar um PLANO DE AÇÃO OPERACIONAL focado em UM responsável (CSM) específico que está perdendo clientes acima do limite saudável.

Seu output será lido pelo Head pra decidir conversas, treinamentos e mudanças com esse CSM.

Princípios:
- Específico, não genérico. Cite clientes pelo nome real (dos dados que você recebeu).
- Padrão = aparece em 2+ clientes/eventos. Senão é caso isolado, não padrão.
- Política inegociável: NUNCA recomende desconto, save offer, pacote de retenção com desconto. Recomendações são OPERACIONAIS — comunicação, qualidade de entrega, cadência, alinhamento de expectativa.
- Plano em 3 horizontes: imediato (7d), curto (30d), médio (90d). Cada item deve ser uma AÇÃO concreta, não "melhorar X".
- Tom: profissional, direto, português brasileiro.

SEMPRE retorna JSON válido sem markdown nem texto fora do JSON.`;

const USER_PROMPT = (
  csm: string,
  metrics: CsmActionPlan["metrics"],
  churned: ChurnedSnap[],
  ativos: AtivoSnap[]
) => `Analise a situação do CSM "${csm}" e gere o plano de ação.

# Métricas

- Carteira atual: ${metrics.activeCount} clientes ativos
- Saídas no período: ${metrics.churnCount}
- Taxa de churn: ${metrics.churnRatePct.toFixed(1)}%
- MRR sob gestão (ativos): R$ ${metrics.activeMrr.toLocaleString("pt-BR")}/mês
- MRR perdido (saídas): R$ ${metrics.churnMrrLost.toLocaleString("pt-BR")}/mês

# Clientes que saíram sob "${csm}" (${churned.length})

${JSON.stringify(churned, null, 2)}

# Clientes ATIVOS sob "${csm}" (${ativos.length})

${JSON.stringify(ativos, null, 2)}

# Formato de resposta — JSON puro

{
  "situacao": "2-3 frases descrevendo a foto atual do CSM",
  "diagnostico": [
    {
      "causa": "string — motivo recorrente das saídas",
      "evidencia": ["string — qual cliente/qual frase comprova"],
      "afetados": number
    }
  ],
  "padroesReunioes": [
    {
      "padrao": "string — frase/tópico recorrente nas notas das reuniões antes da saída",
      "exemplos": ["string"],
      "ocorrencias": number
    }
  ],
  "sinaisEmAtivos": [
    {
      "cliente": "string — NOME REAL de um cliente ATIVO sob esse CSM",
      "alerta": "string — por que pode caminhar pra sair",
      "severidade": "alta" | "media" | "baixa"
    }
  ],
  "plano": {
    "imediato": ["string — ação concreta pra próximos 7 dias"],
    "trintaDias": ["string — ação pra próximos 30 dias"],
    "noventaDias": ["string — mudança estrutural pra 90 dias"]
  },
  "checkIn": {
    "topicos": ["string — tópico pra conversar com o CSM 1-1"],
    "perguntasChave": ["string — pergunta direta pra entender a perspectiva dele"]
  }
}

Regras:
- Máximo: 4 diagnóstico, 5 padrões, 6 sinais, 4 itens por horizonte do plano, 5 tópicos check-in, 5 perguntas.
- "sinaisEmAtivos" SÓ pra clientes da lista de ATIVOS acima. Nunca inventar nomes.
- "padroesReunioes" exige que apareçam em meetingNotes reais. Se nenhum cliente teve notas, devolve [].
- Sem desconto. Sempre. Em hipótese alguma.`;

// === Função principal ============================================

export async function generateCsmActionPlan(
  csm: string,
  allChurnEvents: ChurnEvent[],
  allClients: Client[]
): Promise<CsmActionPlan> {
  if (!ANTHROPIC_CONFIGURED) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Configure na Vercel pra ativar planos com IA."
    );
  }
  const client = getAnthropic();
  if (!client) throw new Error("Anthropic client não inicializado.");

  // Filtra eventos desse CSM
  const csmEvents = allChurnEvents.filter(
    (e) => (e.csmAtTime || "Sem responsável") === csm
  );
  if (csmEvents.length === 0) {
    throw new Error(`Nenhuma saída registrada sob "${csm}".`);
  }

  // Métricas
  const activeUnderCsm = allClients.filter(
    (c) => !c.isChurned && (c.owner || "Sem responsável") === csm
  );
  const activeCount = activeUnderCsm.length;
  const churnCount = csmEvents.length;
  const activeMrr = activeUnderCsm.reduce(
    (s, c) => s + (c.monthlyRevenue ?? 0),
    0
  );
  const churnMrrLost = csmEvents.reduce(
    (s, e) => s + (e.monthlyRevenueAtTime ?? 0),
    0
  );
  const denom = activeCount + churnCount;
  const churnRatePct = denom > 0 ? (churnCount / denom) * 100 : 0;

  const metrics: CsmActionPlan["metrics"] = {
    activeCount,
    churnCount,
    churnRatePct,
    activeMrr,
    churnMrrLost,
  };

  const churnedSnaps = buildChurnedSnaps(csmEvents, allClients);
  const ativosSnaps = buildActiveSnaps(allClients, csm);

  const userPrompt = USER_PROMPT(csm, metrics, churnedSnaps, ativosSnaps);

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
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA sem conteúdo textual.");
  }
  const raw = textBlock.text.trim();
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
      `Resposta não é JSON válido: ${err instanceof Error ? err.message : "parse error"}`
    );
  }

  const p = parsed as Partial<CsmActionPlan>;
  if (typeof p.situacao !== "string") {
    throw new Error("Resposta sem campo 'situacao'.");
  }

  return {
    csm,
    situacao: p.situacao,
    diagnostico: Array.isArray(p.diagnostico)
      ? (p.diagnostico as CsmDiagnostico[])
      : [],
    padroesReunioes: Array.isArray(p.padroesReunioes)
      ? (p.padroesReunioes as CsmPadraoReuniao[])
      : [],
    sinaisEmAtivos: Array.isArray(p.sinaisEmAtivos)
      ? (p.sinaisEmAtivos as CsmSinalAtivo[])
      : [],
    plano:
      typeof p.plano === "object" && p.plano !== null
        ? {
            imediato: Array.isArray((p.plano as CsmPlano).imediato)
              ? (p.plano as CsmPlano).imediato
              : [],
            trintaDias: Array.isArray((p.plano as CsmPlano).trintaDias)
              ? (p.plano as CsmPlano).trintaDias
              : [],
            noventaDias: Array.isArray((p.plano as CsmPlano).noventaDias)
              ? (p.plano as CsmPlano).noventaDias
              : [],
          }
        : { imediato: [], trintaDias: [], noventaDias: [] },
    checkIn:
      typeof p.checkIn === "object" && p.checkIn !== null
        ? {
            topicos: Array.isArray((p.checkIn as CsmCheckIn).topicos)
              ? (p.checkIn as CsmCheckIn).topicos
              : [],
            perguntasChave: Array.isArray(
              (p.checkIn as CsmCheckIn).perguntasChave
            )
              ? (p.checkIn as CsmCheckIn).perguntasChave
              : [],
          }
        : { topicos: [], perguntasChave: [] },
    generatedAt: new Date().toISOString(),
    model: DEFAULT_MODEL,
    metrics,
  };
}
