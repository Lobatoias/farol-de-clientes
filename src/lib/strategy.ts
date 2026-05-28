import type { Client, Status } from "./types";
import { daysUntil } from "./utils";
import { calculateLTV, monthsSince } from "./metrics";

// === Tipos ============================================================

export interface StrategicSummary {
  totalClients: number;
  critical: number;
  warning: number;
  healthy: number;
  totalInvestmentAtRisk: number;
  totalRevenueAtRisk: number;
  totalLTVAtRisk: number;
  /** % do investimento sob gestão que está em risco (amarelo + vermelho). */
  investmentRiskPct: number;
  coverage: {
    withoutNiche: number;
    withoutRevenue: number;
    withoutLastMeeting: number;
    withoutOwner: number;
  };
}

export interface PrioritizedClient {
  client: Client;
  score: number;
  reasons: string[];
}

export type SystemicSignal =
  | {
      kind: "niche-concentration";
      niche: string;
      criticalCount: number;
      total: number;
      pctCritical: number;
      pctBase: number;
      investmentAtRisk: number;
    }
  | {
      kind: "csm-load";
      csm: string;
      criticalCount: number;
      atRiskCount: number;
      total: number;
      pctCritical: number;
    }
  | {
      kind: "contract-expiring";
      client: Client;
      daysUntil: number;
    };

export interface HygieneIssue {
  kind:
    | "missing-niche"
    | "missing-revenue"
    | "missing-owner"
    | "missing-meeting"
    | "orphan-folder";
  title: string;
  description: string;
  clients: Client[];
  actionLabel: string;
}

export interface StrategicView {
  summary: StrategicSummary;
  priorities: PrioritizedClient[];
  signals: SystemicSignal[];
  hygiene: HygieneIssue[];
}

// === Lógica ===========================================================

function isAtRisk(status: Status): boolean {
  return status !== "verde";
}

function scoreClient(c: Client): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Base por status
  if (c.status === "vermelho") {
    score += 100;
    reasons.push("Status crítico");
  } else if (c.status === "amarelo") {
    score += 40;
    reasons.push("Em alerta");
  }

  // Investimento sob gestão (peso log pra não explodir com 1 cliente gigante)
  const investment = (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0);
  if (investment > 0) {
    const investmentScore = Math.min(50, Math.log10(investment + 1) * 8);
    score += investmentScore;
    if (investment >= 5000) {
      reasons.push(`Investimento alto: R$ ${investment.toLocaleString("pt-BR")}/mês`);
    } else if (investment >= 1500) {
      reasons.push(`Investimento médio: R$ ${investment.toLocaleString("pt-BR")}/mês`);
    }
  }

  // Mensalidade (LTV em risco)
  const revenue = c.monthlyRevenue ?? 0;
  if (revenue > 0) {
    const revenueScore = Math.min(40, Math.log10(revenue + 1) * 10);
    score += revenueScore;
    if (revenue >= 3000) {
      reasons.push(`Mensalidade alta: R$ ${revenue.toLocaleString("pt-BR")}/mês`);
    }
  }

  // Sem reunião recente
  if (c.lastMeetingAt) {
    const monthsAgo = monthsSince(c.lastMeetingAt);
    if (monthsAgo > 1) {
      score += 20;
      reasons.push(`${Math.round(monthsAgo)} meses sem reunião`);
    }
  } else if (c.status !== "verde") {
    score += 15;
    reasons.push("Sem reunião registrada");
  }

  // Contrato perto de vencer
  if (c.contractEndAt) {
    const days = daysUntil(c.contractEndAt);
    if (days >= 0 && days <= 30) {
      score += 30;
      reasons.push(`Contrato vence em ${days} dia${days === 1 ? "" : "s"}`);
    } else if (days < 0) {
      score += 20;
      reasons.push(`Contrato expirou há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`);
    }
  }

  // Sem responsável
  if (!c.owner || c.owner === "Sem responsável") {
    if (c.status !== "verde") {
      score += 15;
      reasons.push("Sem responsável definido");
    }
  }

  return { score, reasons };
}

function buildSummary(clients: Client[]): StrategicSummary {
  const critical = clients.filter((c) => c.status === "vermelho");
  const warning = clients.filter((c) => c.status === "amarelo");
  const healthy = clients.filter((c) => c.status === "verde");

  const atRisk = [...critical, ...warning];
  const totalInvestmentAtRisk = atRisk.reduce(
    (s, c) => s + (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0),
    0
  );
  const totalRevenueAtRisk = atRisk.reduce((s, c) => s + (c.monthlyRevenue ?? 0), 0);

  const totalInvestment = clients.reduce(
    (s, c) => s + (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0),
    0
  );

  const ltv = calculateLTV(clients);
  // LTV em risco já é calculado em calculateLTV
  const totalLTVAtRisk = ltv.ltvAtRisk;

  return {
    totalClients: clients.length,
    critical: critical.length,
    warning: warning.length,
    healthy: healthy.length,
    totalInvestmentAtRisk,
    totalRevenueAtRisk,
    totalLTVAtRisk,
    investmentRiskPct: totalInvestment > 0 ? totalInvestmentAtRisk / totalInvestment : 0,
    coverage: {
      withoutNiche: clients.filter((c) => !c.niche || c.niche.trim() === "").length,
      withoutRevenue: clients.filter((c) => !c.monthlyRevenue).length,
      withoutLastMeeting: clients.filter((c) => !c.lastMeetingAt).length,
      withoutOwner: clients.filter(
        (c) => !c.owner || c.owner === "Sem responsável"
      ).length,
    },
  };
}

function buildPriorities(clients: Client[]): PrioritizedClient[] {
  return clients
    .filter((c) => isAtRisk(c.status))
    .map((c) => ({
      client: c,
      ...scoreClient(c),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildSignals(clients: Client[]): SystemicSignal[] {
  const signals: SystemicSignal[] = [];
  const total = clients.length;
  const totalCritical = clients.filter((c) => c.status === "vermelho").length;
  const baseRate = total > 0 ? totalCritical / total : 0;

  // Concentração por nicho
  const byNiche = new Map<string, Client[]>();
  for (const c of clients) {
    const k = c.niche?.trim() || "Sem nicho";
    if (!byNiche.has(k)) byNiche.set(k, []);
    byNiche.get(k)!.push(c);
  }
  for (const [niche, group] of byNiche) {
    if (group.length < 3) continue; // ignora nichos pequenos demais
    const crit = group.filter((c) => c.status === "vermelho").length;
    if (crit === 0) continue;
    const pct = crit / group.length;
    // Sinaliza se a taxa do nicho é pelo menos 1.5× a base e tem pelo menos 2 críticos
    if (crit >= 2 && pct > baseRate * 1.5) {
      const investmentAtRisk = group
        .filter((c) => c.status !== "verde")
        .reduce(
          (s, c) => s + (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0),
          0
        );
      signals.push({
        kind: "niche-concentration",
        niche,
        criticalCount: crit,
        total: group.length,
        pctCritical: pct,
        pctBase: baseRate,
        investmentAtRisk,
      });
    }
  }

  // Carga por CSM
  const byCSM = new Map<string, Client[]>();
  for (const c of clients) {
    const k = c.owner || "Sem responsável";
    if (!byCSM.has(k)) byCSM.set(k, []);
    byCSM.get(k)!.push(c);
  }
  for (const [csm, group] of byCSM) {
    if (group.length < 3) continue;
    const crit = group.filter((c) => c.status === "vermelho").length;
    const atRisk = group.filter((c) => isAtRisk(c.status)).length;
    if (crit === 0 && atRisk < 3) continue;
    const pct = crit / group.length;
    // Sinaliza se CSM tem 2+ críticos OU ≥40% da carteira em risco
    if (crit >= 2 || atRisk / group.length > 0.4) {
      signals.push({
        kind: "csm-load",
        csm,
        criticalCount: crit,
        atRiskCount: atRisk,
        total: group.length,
        pctCritical: pct,
      });
    }
  }

  // Contratos vencendo
  const expiring = clients
    .filter((c) => {
      if (!c.contractEndAt) return false;
      const d = daysUntil(c.contractEndAt);
      return d >= 0 && d <= 60 && isAtRisk(c.status);
    })
    .sort((a, b) => daysUntil(a.contractEndAt!) - daysUntil(b.contractEndAt!));

  for (const c of expiring) {
    signals.push({
      kind: "contract-expiring",
      client: c,
      daysUntil: daysUntil(c.contractEndAt!),
    });
  }

  return signals;
}

function buildHygiene(clients: Client[]): HygieneIssue[] {
  const issues: HygieneIssue[] = [];

  const noNiche = clients.filter(
    (c) => !c.niche || c.niche.trim() === "" || c.niche === "Sem nicho"
  );
  if (noNiche.length > 0) {
    issues.push({
      kind: "missing-niche",
      title: `${noNiche.length} ${noNiche.length === 1 ? "cliente sem nicho" : "clientes sem nicho"}`,
      description:
        "Sem nicho a Distribuição por Nicho e os padrões sistêmicos ficam incompletos.",
      clients: noNiche,
      actionLabel: "Preencher no ClickUp (campo Nicho)",
    });
  }

  const noRevenue = clients.filter(
    (c) => !c.monthlyRevenue || c.monthlyRevenue === 0
  );
  if (noRevenue.length > 0) {
    issues.push({
      kind: "missing-revenue",
      title: `${noRevenue.length} ${noRevenue.length === 1 ? "cliente sem mensalidade" : "clientes sem mensalidade"}`,
      description:
        "LTV total e em risco ficam subestimados. Preencha em /financeiro pra ter projeção real.",
      clients: noRevenue,
      actionLabel: "Preencher em /financeiro",
    });
  }

  const noOwner = clients.filter(
    (c) =>
      isAtRisk(c.status) && (!c.owner || c.owner === "Sem responsável")
  );
  if (noOwner.length > 0) {
    issues.push({
      kind: "missing-owner",
      title: `${noOwner.length} ${noOwner.length === 1 ? "cliente em risco sem responsável" : "clientes em risco sem responsável"}`,
      description:
        "Clientes amarelos ou vermelhos sem CSM definido — risco de cair em ninguém.",
      clients: noOwner,
      actionLabel: "Atribuir na task mestre do ClickUp",
    });
  }

  const noMeeting = clients.filter(
    (c) => isAtRisk(c.status) && !c.lastMeetingAt
  );
  if (noMeeting.length > 0) {
    issues.push({
      kind: "missing-meeting",
      title: `${noMeeting.length} ${noMeeting.length === 1 ? "cliente em risco sem reunião registrada" : "clientes em risco sem reunião registrada"}`,
      description:
        "Não dá pra detectar 'sumiu sem aviso' sem o campo Última reunião preenchido.",
      clients: noMeeting,
      actionLabel: "Preencher no ClickUp (campo Ultima reuniao)",
    });
  }

  const orphans = clients.filter(
    (c) => c.hasOperationalFolder && c.hasMasterRecord === false
  );
  if (orphans.length > 0) {
    issues.push({
      kind: "orphan-folder",
      title: `${orphans.length} ${orphans.length === 1 ? "folder operacional órfão" : "folders operacionais órfãos"}`,
      description:
        "Folders no ClickUp sem cadastro mestre — não entram no Farol nem nas métricas.",
      clients: orphans,
      actionLabel: "Cadastrar em Gestão de Clientes ou arquivar folder",
    });
  }

  return issues;
}

export function buildStrategicView(clients: Client[]): StrategicView {
  return {
    summary: buildSummary(clients),
    priorities: buildPriorities(clients),
    signals: buildSignals(clients),
    hygiene: buildHygiene(clients),
  };
}

// === Checklists de ação =============================================

export const ACTION_CHECKLISTS: Record<string, string[]> = {
  "critical-account": [
    "Marcar reunião extraordinária em até 48h",
    "Listar os 3 últimos entregáveis com problema (resultado vs prometido)",
    "Levantar histórico de reclamações abertas (tickets, e-mails, mensagens)",
    "Preparar pacote de retenção (desconto, escopo extra, gestor sênior na sala)",
    "Documentar plano de recuperação compartilhado com o cliente",
    "Escalar pra você (Head) e definir owner único do caso",
  ],
  "niche-concentration": [
    "Reunir CSMs com clientes do nicho pra fazer pós-mortem rápido",
    "Identificar problemas comuns: briefing, prazo, criativo, expectativa",
    "Criar playbook específico do nicho com etapas e SLAs",
    "Definir métricas de saúde do nicho (ex: CTR, CPL, ROAS)",
    "Considerar pausar entrada de novos clientes desse nicho até estabilizar",
  ],
  "csm-load": [
    "Conversar 1-1 com o CSM pra entender se é carga ou perfil",
    "Avaliar redistribuição da carteira (passar 1-2 clientes pra outro CSM)",
    "Verificar se há gap de skill no CSM (ferramenta, vertical, comunicação)",
    "Definir buddy/mentor pra apoiar nos próximos 30 dias",
    "Considerar treinamento específico do nicho que está concentrando vermelhos",
  ],
  "contract-expiring": [
    "Olhar histórico do cliente: entregou o que prometeu?",
    "Preparar relatório de resultado pra abrir a conversa de renovação",
    "Mapear concorrentes que podem estar abordando o cliente",
    "Decidir oferta: manter, dar desconto ou reescopar",
    "Agendar reunião de renovação ANTES de chegar no fim",
  ],
  "missing-niche": [
    "Abrir Gestão de Clientes no ClickUp",
    "Para cada cliente sem nicho: identificar nicho conforme contexto do negócio",
    "Se faltar opção, criar nova opção no dropdown 'Nicho'",
    "Padrão sugerido: Negócio Local, Food, E-commerce, Distribuidor, Imobiliária, etc.",
  ],
  "missing-revenue": [
    "Abrir /financeiro no Farol",
    "Para cada cliente sem mensalidade: pegar contrato e preencher valor",
    "Aproveitar pra preencher também 'Cliente desde' e datas de contrato",
    "Em casos de variação (por performance), usar média dos últimos 3 meses",
  ],
  "missing-owner": [
    "Definir responsável (CSM) pra cada cliente sem assignee",
    "Preencher 'Responsável pela Revisão' na task mestre do ClickUp",
    "Garantir que o CSM saiba que ficou com o cliente",
    "Validar que a carga total do CSM não passou do limite (3-5 contas ativas como referência)",
  ],
  "missing-meeting": [
    "Buscar última reunião nos arquivos (Google Meet, WhatsApp, e-mail)",
    "Preencher campo 'Ultima reuniao' na task mestre do cliente",
    "Definir cadência mínima por status: vermelho 7d, amarelo 14d, verde 30d",
    "Configurar alerta no calendário pra agendar próxima",
  ],
  "orphan-folder": [
    "Listar folders órfãos: existe operação ativa pra esse cliente?",
    "Se sim: cadastrar como task em Gestão de Clientes (Empresa)",
    "Se não: arquivar o folder no ClickUp",
    "Padronizar: todo cliente ativo deve ter (1) task mestre + (1) folder operacional",
  ],
};
