// Análises agregadas sobre saídas (churn) de clientes.
// Pura função: recebe events + clientes, devolve buckets prontos pra UI.

import type { ChurnEvent, ChurnReason, Client } from "./types";

export interface ChurnBucket {
  /** Label legível pro humano. */
  label: string;
  /** Início do período (inclusivo), ISO YYYY-MM-DD. */
  from: string;
  /** Fim do período (inclusivo), ISO YYYY-MM-DD. */
  to: string;
  count: number;
  /** R$/mês de mensalidade total que saiu (snapshot do momento). */
  monthlyRevenueLost: number;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function startOfMonthISO(year: number, month: number): string {
  // month é 0-based
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function endOfMonthISO(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function isInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/**
 * 6 buckets padrão pra dashboard financeira:
 * Este mês · Mês passado · Últimos 3 meses · Últimos 6 meses · Últimos 12 meses · Total
 */
export function buildChurnBuckets(events: ChurnEvent[]): ChurnBucket[] {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const Y = now.getFullYear();
  const M = now.getMonth();

  const lastMonthYear = M === 0 ? Y - 1 : Y;
  const lastMonth = M === 0 ? 11 : M - 1;

  const ranges: Array<Omit<ChurnBucket, "count" | "monthlyRevenueLost">> = [
    {
      label: "Este mês",
      from: startOfMonthISO(Y, M),
      to: todayISO,
    },
    {
      label: "Mês passado",
      from: startOfMonthISO(lastMonthYear, lastMonth),
      to: endOfMonthISO(lastMonthYear, lastMonth),
    },
    {
      label: "Últimos 3 meses",
      from: daysAgoISO(90),
      to: todayISO,
    },
    {
      label: "Últimos 6 meses",
      from: daysAgoISO(180),
      to: todayISO,
    },
    {
      label: "Últimos 12 meses",
      from: daysAgoISO(365),
      to: todayISO,
    },
    {
      label: "Desde sempre",
      from: "1900-01-01",
      to: todayISO,
    },
  ];

  return ranges.map((r) => {
    const inRange = events.filter((e) => isInRange(e.churnedAt, r.from, r.to));
    const count = inRange.length;
    const monthlyRevenueLost = inRange.reduce(
      (s, e) => s + (e.monthlyRevenueAtTime ?? 0),
      0
    );
    return { ...r, count, monthlyRevenueLost };
  });
}

export interface ChurnByReason {
  reason: ChurnReason;
  count: number;
  monthlyRevenueLost: number;
  pct: number; // do total de eventos no período
}

/**
 * Agrupa por motivo. Eventos multi-motivo aparecem em MAIS DE UM bucket
 * (um cliente que saiu por "ROI baixo" + "atendimento" conta nos 2).
 * `pct` é a % de eventos que mencionam esse motivo (denominador = nº de eventos).
 */
export function groupByReason(events: ChurnEvent[]): ChurnByReason[] {
  const map = new Map<ChurnReason, { count: number; mrr: number }>();
  for (const e of events) {
    for (const reason of e.reasons) {
      const cur = map.get(reason) ?? { count: 0, mrr: 0 };
      cur.count += 1;
      // MRR perdido é contado UMA VEZ por motivo mencionado — pra somas comparáveis
      // entre buckets. Ex: cliente R$ 1k que saiu por 2 motivos → R$ 1k em cada.
      cur.mrr += e.monthlyRevenueAtTime ?? 0;
      map.set(reason, cur);
    }
  }
  const totalEvents = events.length || 1;
  return [...map.entries()]
    .map(([reason, v]) => ({
      reason,
      count: v.count,
      monthlyRevenueLost: v.mrr,
      pct: v.count / totalEvents,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface ChurnMonth {
  ym: string; // YYYY-MM
  label: string; // "jun/26"
  count: number;
  monthlyRevenueLost: number;
}

const MONTH_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * Saídas agrupadas por mês, nos últimos `monthsBack` meses (inclui meses
 * sem saída pra a linha do tempo não ter buracos). Dados retroativos —
 * vêm dos churn_events que já existem.
 */
export function churnByMonth(
  events: ChurnEvent[],
  monthsBack = 6
): ChurnMonth[] {
  const now = new Date();
  const months: ChurnMonth[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      ym,
      label: `${MONTH_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      count: 0,
      monthlyRevenueLost: 0,
    });
  }
  const index = new Map(months.map((m) => [m.ym, m]));
  for (const e of events) {
    const ym = e.churnedAt.slice(0, 7);
    const bucket = index.get(ym);
    if (bucket) {
      bucket.count += 1;
      bucket.monthlyRevenueLost += e.monthlyRevenueAtTime ?? 0;
    }
  }
  return months;
}

export interface CsmStat {
  csm: string;
  /** Clientes ativos sob a gestão hoje. */
  activeCount: number;
  /** MRR total dos clientes ativos. */
  activeMrr: number;
  /** Saídas no período analisado. */
  churnCount: number;
  /** R$/mês perdido no período (snapshot da época). */
  churnMrrLost: number;
  /** Taxa: saídas / (ativos + saídas) — proxy de retenção. */
  churnRate: number;
}

/**
 * Estatística por CSM/responsável.
 * activeClients = só os ativos (já filtrados, não inclui churned).
 * churnEventsInPeriod = eventos de churn no período de interesse.
 */
export function buildCsmStats(
  activeClients: Client[],
  churnEventsInPeriod: ChurnEvent[]
): CsmStat[] {
  // Ativos por CSM
  const activeByOwner = new Map<string, Client[]>();
  for (const c of activeClients) {
    const k = c.owner || "Sem responsável";
    if (!activeByOwner.has(k)) activeByOwner.set(k, []);
    activeByOwner.get(k)!.push(c);
  }

  // Churn por CSM da época
  const churnByOwner = new Map<string, ChurnEvent[]>();
  for (const e of churnEventsInPeriod) {
    const k = e.csmAtTime || "Sem responsável";
    if (!churnByOwner.has(k)) churnByOwner.set(k, []);
    churnByOwner.get(k)!.push(e);
  }

  // Conjunto único de todos os owners (ativo ou que já perdeu cliente)
  const allOwners = new Set<string>([
    ...activeByOwner.keys(),
    ...churnByOwner.keys(),
  ]);

  const stats: CsmStat[] = [];
  for (const csm of allOwners) {
    const ative = activeByOwner.get(csm) ?? [];
    const losses = churnByOwner.get(csm) ?? [];
    const activeCount = ative.length;
    const activeMrr = ative.reduce((s, c) => s + (c.monthlyRevenue ?? 0), 0);
    const churnCount = losses.length;
    const churnMrrLost = losses.reduce(
      (s, e) => s + (e.monthlyRevenueAtTime ?? 0),
      0
    );
    const denom = activeCount + churnCount;
    const churnRate = denom > 0 ? churnCount / denom : 0;
    stats.push({
      csm,
      activeCount,
      activeMrr,
      churnCount,
      churnMrrLost,
      churnRate,
    });
  }

  // Ordena: pior (mais perdas) primeiro
  stats.sort((a, b) => {
    if (b.churnCount !== a.churnCount) return b.churnCount - a.churnCount;
    if (b.churnMrrLost !== a.churnMrrLost) return b.churnMrrLost - a.churnMrrLost;
    return b.activeCount - a.activeCount;
  });

  return stats;
}
