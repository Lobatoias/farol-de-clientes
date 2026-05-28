import type { Client, ClientEvent, Status } from "./types";

// Distribuição alvo de 50 clientes: ~60% verde / 25% amarelo / 15% vermelho
// Variados em segmento, CSM, faixa de MRR, e patrones de risco.

const OWNERS = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Alves", "Você"];

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function isoFuture(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

function eventsFor(
  status: Status,
  base: { lastMeetingDays: number; mrr: number; degraded: boolean }
): ClientEvent[] {
  const events: ClientEvent[] = [];
  if (base.degraded) {
    events.push({
      id: crypto.randomUUID(),
      type: "mudanca-status",
      date: iso(7),
      title: status === "vermelho" ? "Mudou de amarelo para vermelho" : "Mudou de verde para amarelo",
      author: "Sistema",
    });
  }
  events.push({
    id: crypto.randomUUID(),
    type: "reuniao",
    date: iso(base.lastMeetingDays),
    title: "Reunião de acompanhamento",
    description:
      status === "verde"
        ? "Cliente engajado, sem pontos de atenção. Renovação encaminhada."
        : status === "amarelo"
        ? "Cliente sinalizou preocupação com adoção do produto pela equipe interna."
        : "Cliente reclamou de instabilidade e atraso em entregas. Reunião tensa.",
    author: OWNERS[Math.floor(Math.random() * OWNERS.length)],
  });
  events.push({
    id: crypto.randomUUID(),
    type: "ia-resumo",
    date: iso(base.lastMeetingDays - 1),
    title: "Resumo gerado por IA da última reunião",
    description:
      status === "verde"
        ? "Sentimento positivo. Próximos passos claros. Nenhuma ação urgente."
        : status === "amarelo"
        ? "Sentimento neutro/preocupado. Necessário plano de adoção em 14 dias."
        : "Sentimento negativo. Risco real de churn. Escalada para Head sugerida.",
    author: "IA",
  });
  if (status !== "verde") {
    events.push({
      id: crypto.randomUUID(),
      type: "incidente",
      date: iso(base.lastMeetingDays + 5),
      title: status === "vermelho" ? "Incidente crítico em produção" : "Reclamação de usabilidade",
      author: "Suporte",
    });
  }
  events.push({
    id: crypto.randomUUID(),
    type: "entrega",
    date: iso(base.lastMeetingDays + 15),
    title: "Entrega da última feature solicitada",
    author: "Time de produto",
  });
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const NAMES = [
  "Acme Indústria", "Beta Logística", "Cosmos Saúde", "Delta Varejo", "Equinox Fitness",
  "Fênix Energia", "Globo Construções", "Helena Cosméticos", "Íris Educação", "Jade Imóveis",
  "Kappa Telecom", "Luminar Mídia", "Magna Auto", "Nimbus Cloud", "Órion Bancos",
  "Pólen Agro", "Quasar Tech", "Rubi Mineração", "Stella Foods", "Tesla Engenharia",
  "Uirá Turismo", "Vector Seguros", "Wave Marinha", "Xênon Quim", "Ypê Cosméticos",
  "Zen Wellness", "Atlas Petróleo", "Bússola Frete", "Cedro Madeireira", "Drupa Editora",
  "Eclipse Audio", "Fronteira Café", "Granito Construtora", "Horizonte ERP", "Iguassu Energia",
  "Júpiter Pharma", "Kombi Mobilidade", "Litoral Hotéis", "Mantra Wellness", "Nórdico Decor",
  "Oásis Bebidas", "Pampa Carnes", "Quark Software", "Rede Sul", "Savana Adventure",
  "Tropos Plástico", "Único Beauty", "Viola Music", "Wisteria Moda", "Xerife Segurança",
];

const SEGMENTS: Client["segment"][] = ["Enterprise", "Mid-Market", "SMB", "Startup"];

const RISK_LIBRARY = {
  verde: ["adocao-alta", "renovacao-encaminhada", "expansao-em-vista"],
  amarelo: [
    "adocao-baixa",
    "reuniao-atrasada",
    "custo-em-alta",
    "ticket-aberto-7d",
    "nps-em-queda",
  ],
  vermelho: [
    "churn-risk-alto",
    "incidente-grave",
    "fatura-atrasada",
    "reuniao-tensa",
    "margem-negativa",
    "sem-contato-30d",
  ],
};

function pickRisks(status: Status, n: number): string[] {
  const lib = RISK_LIBRARY[status];
  const shuffled = [...lib].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const STATUS_PLAN: Array<{ status: Status; previousStatus?: Status }> = [
  ...Array.from({ length: 30 }, () => ({ status: "verde" as Status })),
  ...Array.from({ length: 12 }, () => ({ status: "amarelo" as Status, previousStatus: "verde" as Status })),
  ...Array.from({ length: 8 }, () => ({ status: "vermelho" as Status, previousStatus: "amarelo" as Status })),
];

// Seed para resultado reproducível
let seed = 42;
function seedRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

export const mockClients: Client[] = NAMES.map((name, i) => {
  const plan = STATUS_PLAN[i % STATUS_PLAN.length];
  const status = plan.status;
  const segment = SEGMENTS[Math.floor(seedRandom() * SEGMENTS.length)];
  const mrr =
    segment === "Enterprise"
      ? 30000 + Math.floor(seedRandom() * 70000)
      : segment === "Mid-Market"
      ? 8000 + Math.floor(seedRandom() * 22000)
      : segment === "SMB"
      ? 1500 + Math.floor(seedRandom() * 6500)
      : 400 + Math.floor(seedRandom() * 2600);

  const costPct =
    status === "verde"
      ? 0.3 + seedRandom() * 0.15
      : status === "amarelo"
      ? 0.5 + seedRandom() * 0.2
      : 0.7 + seedRandom() * 0.4;
  const cost = Math.floor(mrr * costPct);
  const margin = (mrr - cost) / mrr;

  const lastMeetingDays =
    status === "verde"
      ? Math.floor(seedRandom() * 7) + 1
      : status === "amarelo"
      ? Math.floor(seedRandom() * 14) + 7
      : Math.floor(seedRandom() * 25) + 14;

  const nextMeetingDays =
    status === "verde"
      ? Math.floor(seedRandom() * 14) + 3
      : status === "amarelo"
      ? Math.floor(seedRandom() * 10) + 1
      : Math.floor(seedRandom() * 5) + 1;

  const nps =
    status === "verde"
      ? 8 + Math.floor(seedRandom() * 3)
      : status === "amarelo"
      ? 5 + Math.floor(seedRandom() * 3)
      : Math.floor(seedRandom() * 5);

  const openTickets =
    status === "verde" ? 0 : status === "amarelo" ? 1 + Math.floor(seedRandom() * 3) : 3 + Math.floor(seedRandom() * 5);

  const riskTags = pickRisks(status, status === "verde" ? 1 : status === "amarelo" ? 2 : 3);

  const owner = OWNERS[Math.floor(seedRandom() * OWNERS.length)];

  const summary =
    status === "verde"
      ? `${name} segue saudável. ${owner} mantém ritmo de acompanhamento semanal.`
      : status === "amarelo"
      ? `${name} requer atenção: ${riskTags.join(", ")}. Última reunião há ${lastMeetingDays} dias.`
      : `${name} em situação crítica: ${riskTags.join(", ")}. Escalada necessária.`;

  const statusChangedAt = plan.previousStatus ? iso(Math.floor(seedRandom() * 14) + 1) : iso(90 + Math.floor(seedRandom() * 180));

  return {
    id: `c-${(i + 1).toString().padStart(3, "0")}`,
    name,
    segment,
    owner,
    status,
    previousStatus: plan.previousStatus,
    statusChangedAt,
    mrr,
    cost,
    margin,
    nps,
    lastMeetingAt: iso(lastMeetingDays),
    nextMeetingAt: isoFuture(nextMeetingDays),
    openTickets,
    riskTags,
    summary,
    events: eventsFor(status, { lastMeetingDays, mrr, degraded: !!plan.previousStatus }),
    clickupFolderId: `90100${(i + 1).toString().padStart(4, "0")}`,
    clickupUrl: `https://app.clickup.com/9010/v/f/90100${(i + 1).toString().padStart(4, "0")}`,
  };
});

export function getClientById(id: string): Client | undefined {
  return mockClients.find((c) => c.id === id);
}

export function getClientsByStatus(status: Status): Client[] {
  return mockClients.filter((c) => c.status === status);
}

export function getAllOwners(): string[] {
  return Array.from(new Set(mockClients.map((c) => c.owner))).sort();
}
