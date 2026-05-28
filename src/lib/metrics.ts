import type { Client } from "./types";

export interface ClientLTV {
  clientId: string;
  name: string;
  niche?: string;
  status: Client["status"];
  tenureMonths: number;
  monthlyRevenue: number;
  estimatedLTV: number;
  /** True quando o cliente tem clientSince + monthlyRevenue preenchidos. */
  hasFullData: boolean;
}

export interface LTVByNiche {
  niche: string;
  count: number;
  totalLTV: number;
  avgLTV: number;
}

export interface LTVMetrics {
  /** Tempo médio (meses) que os clientes ATIVOS estão com a agência. */
  avgTenureMonths: number;
  /** Soma das mensalidades × tempo médio (estimativa de pipeline atual). */
  totalLTV: number;
  /** LTV médio por cliente — `totalLTV / nº de clientes com dados`. */
  avgLTV: number;
  /** LTV em risco = soma de LTV de clientes amarelo + vermelho. */
  ltvAtRisk: number;
  /** % do LTV total que está em risco. */
  riskPct: number;
  /** Quantos clientes têm dados suficientes pra entrar na conta. */
  clientsWithData: number;
  /** Top N clientes ordenados por LTV estimado. */
  perClient: ClientLTV[];
  /** Mensalidade total recorrente da base (MRR cumulativo). */
  totalMRR: number;
  /** Projeção: se a retenção média continuar, quanto vira em 12/24 meses (MRR × meses adicionais). */
  forecast12mo: number;
  forecast24mo: number;
  /** LTV agrupado por nicho. */
  byNiche: LTVByNiche[];
}

/**
 * Calcula meses inteiros + fração entre a data ISO e hoje.
 * Retorna 0 se a data for inválida ou no futuro.
 */
export function monthsSince(iso: string | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const now = new Date();
  const diffDays = (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 0;
  return diffDays / (365.25 / 12); // 30.4375 dias/mês
}

export function calculateLTV(clients: Client[]): LTVMetrics {
  const perClient: ClientLTV[] = clients.map((c) => {
    const tenure = monthsSince(c.clientSince);
    const revenue = c.monthlyRevenue ?? 0;
    const ltv = tenure * revenue;
    return {
      clientId: c.id,
      name: c.name,
      niche: c.niche,
      status: c.status,
      tenureMonths: tenure,
      monthlyRevenue: revenue,
      estimatedLTV: ltv,
      hasFullData: tenure > 0 && revenue > 0,
    };
  });

  const withData = perClient.filter((p) => p.hasFullData);
  const totalMRR = perClient.reduce((s, p) => s + p.monthlyRevenue, 0);

  if (withData.length === 0) {
    return {
      avgTenureMonths: 0,
      totalLTV: 0,
      avgLTV: 0,
      ltvAtRisk: 0,
      riskPct: 0,
      clientsWithData: 0,
      perClient: perClient.sort((a, b) => b.estimatedLTV - a.estimatedLTV),
      totalMRR,
      forecast12mo: 0,
      forecast24mo: 0,
      byNiche: [],
    };
  }

  const avgTenure =
    withData.reduce((s, p) => s + p.tenureMonths, 0) / withData.length;
  const totalLTV = withData.reduce((s, p) => s + p.estimatedLTV, 0);
  const avgLTV = totalLTV / withData.length;

  // LTV em risco = soma do LTV dos clientes em amarelo + vermelho
  const ltvAtRisk = withData
    .filter((p) => p.status !== "verde")
    .reduce((s, p) => s + p.estimatedLTV, 0);
  const riskPct = totalLTV > 0 ? ltvAtRisk / totalLTV : 0;

  // Forecast: se a retenção média continuar, MRR vezes meses adicionais.
  // Usa TODOS os clientes com dados (otimista). O LTV em risco já indica
  // o quanto dessa projeção pode evaporar se vermelhos/amarelos churnarem.
  const allMRR = withData.reduce((s, p) => s + p.monthlyRevenue, 0);
  const forecast12mo = totalLTV + allMRR * 12;
  const forecast24mo = totalLTV + allMRR * 24;

  // Agrupar por nicho
  const nicheMap = new Map<string, { count: number; total: number }>();
  for (const p of withData) {
    const key = p.niche?.trim() || "Sem nicho";
    const existing = nicheMap.get(key) ?? { count: 0, total: 0 };
    existing.count++;
    existing.total += p.estimatedLTV;
    nicheMap.set(key, existing);
  }
  const byNiche: LTVByNiche[] = Array.from(nicheMap.entries())
    .map(([niche, { count, total }]) => ({
      niche,
      count,
      totalLTV: total,
      avgLTV: total / count,
    }))
    .sort((a, b) => b.totalLTV - a.totalLTV);

  return {
    avgTenureMonths: avgTenure,
    totalLTV,
    avgLTV,
    ltvAtRisk,
    riskPct,
    clientsWithData: withData.length,
    perClient: perClient.sort((a, b) => b.estimatedLTV - a.estimatedLTV),
    totalMRR,
    forecast12mo,
    forecast24mo,
    byNiche,
  };
}

/** Formata "X meses" ou "Xa Ym" se >= 12 meses. */
export function formatTenure(months: number): string {
  if (months < 1) {
    const days = Math.round(months * 30.4);
    if (days <= 0) return "—";
    return `${days}d`;
  }
  if (months < 12) {
    return `${months.toFixed(months < 3 ? 1 : 0)} ${months === 1 ? "mês" : "meses"}`;
  }
  const years = Math.floor(months / 12);
  const remMonths = Math.round(months - years * 12);
  if (remMonths === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years}a ${remMonths}m`;
}
