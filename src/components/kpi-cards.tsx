"use client";

import {
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  TrendingDown,
  DollarSign,
  Coins,
} from "lucide-react";
import type { Client } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";
import { StatusDot } from "./status-badge";
import { CountUp } from "./count-up";

interface KpiCardsProps {
  clients: Client[];
}

export function KpiCards({ clients }: KpiCardsProps) {
  const total = clients.length;
  const verde = clients.filter((c) => c.status === "verde").length;
  const amarelo = clients.filter((c) => c.status === "amarelo").length;
  const vermelho = clients.filter((c) => c.status === "vermelho").length;

  // Investimento sob gestão (Meta+Google, ClickUp)
  const investmentTotal = clients.reduce(
    (sum, c) => sum + (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0),
    0
  );
  const investmentAtRisk = clients
    .filter((c) => c.status !== "verde")
    .reduce((sum, c) => sum + (c.investmentMeta ?? 0) + (c.investmentGoogle ?? 0), 0);
  const investmentRiskPct = investmentTotal > 0 ? investmentAtRisk / investmentTotal : 0;
  const hasInvestment = investmentTotal > 0;

  // Faturamento (mensalidade da agência — privado, JSON local)
  const revenueTotal = clients.reduce((sum, c) => sum + (c.monthlyRevenue ?? 0), 0);
  const revenueAtRisk = clients
    .filter((c) => c.status !== "verde")
    .reduce((sum, c) => sum + (c.monthlyRevenue ?? 0), 0);
  const revenueRiskPct = revenueTotal > 0 ? revenueAtRisk / revenueTotal : 0;
  const hasRevenue = revenueTotal > 0;

  // Fallback legado pra mock data
  const mrrTotal = clients.reduce((sum, c) => sum + c.mrr, 0);
  const hasMrr = !hasRevenue && !hasInvestment && mrrTotal > 0;

  return (
    <div className="space-y-3">
      {/* Linha 1: Saúde da base */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
        <div className="animate-fade-up stagger-1 h-full">
          <Kpi
            label="Clientes"
            icon={<Users className="size-4" />}
            iconTone="neutral"
            numericValue={total}
            formatValue={(n) => Math.round(n).toString()}
            footer={
              <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
                <span className="flex items-center gap-1 tabular-nums">
                  <StatusDot status="verde" /> {verde}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <StatusDot status="amarelo" /> {amarelo}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <StatusDot status="vermelho" /> {vermelho}
                </span>
              </div>
            }
          />
        </div>
        <div className="animate-fade-up stagger-2 h-full">
          <Kpi
            label="Críticos"
            icon={<AlertCircle className="size-4" />}
            iconTone={vermelho > 0 ? "danger" : "neutral"}
            numericValue={vermelho}
            formatValue={(n) => Math.round(n).toString()}
            sublabel={vermelho > 0 ? "exigem ação esta semana" : "tudo sob controle"}
            accent={vermelho >= 3 ? "danger" : vermelho > 0 ? "warn" : undefined}
          />
        </div>
        <div className="animate-fade-up stagger-3 h-full">
          <Kpi
            label="Em atenção"
            icon={<AlertTriangle className="size-4" />}
            iconTone={amarelo > 0 ? "warn" : "neutral"}
            numericValue={amarelo}
            formatValue={(n) => Math.round(n).toString()}
            sublabel={amarelo > 0 ? "monitorar de perto" : "sem alertas"}
            accent={amarelo >= 5 ? "warn" : undefined}
          />
        </div>
        <div className="animate-fade-up stagger-4 h-full">
          <Kpi
            label="Saudáveis"
            icon={<CheckCircle2 className="size-4" />}
            iconTone="good"
            numericValue={verde}
            formatValue={(n) => Math.round(n).toString()}
            sublabel={total > 0 ? `${Math.round((verde / total) * 100)}% da base` : undefined}
          />
        </div>
      </div>

      {/* Linha 2: Financeiro */}
      {(hasInvestment || hasMrr || hasRevenue) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
          <div className="animate-fade-up stagger-3 h-full">
            <Kpi
              label="Investimento sob gestão"
              sublabel="Meta + Google · ClickUp"
              icon={<Megaphone className="size-4" />}
              iconTone="primary"
              numericValue={hasInvestment ? investmentTotal : mrrTotal}
              formatValue={(n) => formatBRL(n)}
            />
          </div>
          <div className="animate-fade-up stagger-4 h-full">
            <Kpi
              label="Investimento em risco"
              sublabel={`${Math.round(investmentRiskPct * 100)}% da base · amarelo + vermelho`}
              icon={<TrendingDown className="size-4" />}
              iconTone={investmentRiskPct > 0.3 ? "danger" : investmentRiskPct > 0.15 ? "warn" : "neutral"}
              numericValue={hasInvestment ? investmentAtRisk : 0}
              formatValue={(n) => formatBRL(n)}
              accent={
                investmentRiskPct > 0.3 ? "danger" : investmentRiskPct > 0.15 ? "warn" : undefined
              }
            />
          </div>
          {hasRevenue ? (
            <>
              <div className="animate-fade-up stagger-5 h-full">
                <Kpi
                  label="Faturamento mensal"
                  sublabel="mensalidade · privado"
                  icon={<DollarSign className="size-4" />}
                  iconTone="good"
                  numericValue={revenueTotal}
                  formatValue={(n) => formatBRL(n)}
                  accent="positive"
                />
              </div>
              <div className="animate-fade-up stagger-6 h-full">
                <Kpi
                  label="Faturamento em risco"
                  sublabel={`${Math.round(revenueRiskPct * 100)}% do faturamento`}
                  icon={<Coins className="size-4" />}
                  iconTone={revenueRiskPct > 0.3 ? "danger" : revenueRiskPct > 0.15 ? "warn" : "neutral"}
                  numericValue={revenueAtRisk}
                  formatValue={(n) => formatBRL(n)}
                  accent={
                    revenueRiskPct > 0.3 ? "danger" : revenueRiskPct > 0.15 ? "warn" : undefined
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="animate-fade-up stagger-5 h-full">
                <Kpi
                  label="Faturamento mensal"
                  sublabel="mensalidade · privado"
                  icon={<DollarSign className="size-4" />}
                  iconTone="neutral"
                  value="—"
                  hint="preencha em /financeiro"
                  muted
                />
              </div>
              <div className="animate-fade-up stagger-6 h-full">
                <Kpi
                  label="Faturamento em risco"
                  sublabel="—"
                  icon={<Coins className="size-4" />}
                  iconTone="neutral"
                  value="—"
                  muted
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type IconTone = "neutral" | "primary" | "good" | "warn" | "danger";

function Kpi({
  label,
  sublabel,
  icon,
  iconTone = "neutral",
  value,
  numericValue,
  formatValue,
  hint,
  accent,
  muted,
  footer,
}: {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  iconTone?: IconTone;
  /** Use `value` para texto estático OU `numericValue` + `formatValue` pra CountUp animado. */
  value?: string;
  numericValue?: number;
  formatValue?: (n: number) => string;
  hint?: string;
  accent?: "warn" | "danger" | "positive";
  muted?: boolean;
  /** Conteúdo extra que se acomoda no rodapé (ex: dots de status). */
  footer?: React.ReactNode;
}) {
  const valueColor =
    accent === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : muted
      ? "text-[color:var(--muted-foreground)]"
      : "text-[color:var(--foreground)]";

  const iconBg = {
    neutral: "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
    primary:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    good:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    warn:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    danger:
      "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  }[iconTone];

  return (
    <div className="h-full flex flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[color:var(--muted-foreground)]/30 relative overflow-hidden">
      {/* Gradient sutil pra dar profundidade no topo */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
      />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold leading-tight">
            {label}
          </p>
          {sublabel && (
            <p className="text-[10px] text-[color:var(--muted-foreground)] opacity-70 mt-1 leading-tight">
              {sublabel}
            </p>
          )}
        </div>
        <div
          className={cn(
            "size-8 rounded-lg grid place-items-center shrink-0 transition-colors",
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
      <p
        className={cn(
          "text-3xl font-bold tabular-nums tracking-tight leading-none",
          valueColor
        )}
      >
        {numericValue !== undefined && formatValue ? (
          <CountUp to={numericValue} format={formatValue} />
        ) : (
          value
        )}
      </p>
      {hint && (
        <p className="text-[11px] text-[color:var(--muted-foreground)] mt-2 leading-tight">
          {hint}
        </p>
      )}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  );
}
