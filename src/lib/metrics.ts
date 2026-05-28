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

export interface LTVMetrics {
  /** Tempo médio (meses) que os clientes ATIVOS estão com a agência. */
  avgTenureMonths: number;
  /** Soma das mensalidades × tempo médio (estimativa de pipeline atual). */
  totalLTV: number;
  /** LTV médio por cliente — `totalLTV / nº de clientes com dados`. */
  avgLTV: number;
  /** Quantos clientes têm dados suficientes pra entrar na conta. */
  clientsWithData: number;
  /** Top N clientes ordenados por LTV estimado. */
  perClient: ClientLTV[];
  /** Mensalidade total recorrente da base (MRR cumulativo). */
  totalMRR: number;
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
      clientsWithData: 0,
      perClient: perClient.sort((a, b) => b.estimatedLTV - a.estimatedLTV),
      totalMRR,
    };
  }

  const avgTenure =
    withData.reduce((s, p) => s + p.tenureMonths, 0) / withData.length;
  const totalLTV = withData.reduce((s, p) => s + p.estimatedLTV, 0);
  const avgLTV = totalLTV / withData.length;

  return {
    avgTenureMonths: avgTenure,
    totalLTV,
    avgLTV,
    clientsWithData: withData.length,
    perClient: perClient.sort((a, b) => b.estimatedLTV - a.estimatedLTV),
    totalMRR,
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
