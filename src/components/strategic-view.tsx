"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Users,
  Megaphone,
  Coins,
  Database,
  Target,
  Layers,
  UserCog,
  CalendarX,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { Client } from "@/lib/types";
import { cn, formatBRL, daysUntil } from "@/lib/utils";
import {
  ACTION_CHECKLISTS,
  type HygieneIssue,
  type PrioritizedClient,
  type StrategicView,
  type SystemicSignal,
} from "@/lib/strategy";
import { StatusBadge, StatusDot } from "./status-badge";
import { CountUp } from "./count-up";
import { ActionChecklistDialog } from "./action-checklist-dialog";

interface StrategicViewProps {
  view: StrategicView;
  generatedAt: string;
}

interface DialogState {
  title: string;
  subtitle?: string;
  items: string[];
}

export function StrategicViewBlock({ view, generatedAt }: StrategicViewProps) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  function openChecklist(key: string, title: string, subtitle?: string) {
    const items = ACTION_CHECKLISTS[key] ?? [];
    setDialog({ title, subtitle, items });
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="space-y-2 animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 grid place-items-center">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
            Análise estratégica
          </span>
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] ring-1 ring-inset ring-[color:var(--border)]">
            tempo real · {generatedAt}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          O que merece sua atenção esta semana
        </h1>
        <p className="text-sm text-[color:var(--muted-foreground)] max-w-2xl">
          Cruzamentos da sua base real — sem mock. Cada insight tem um
          <strong className="text-[color:var(--foreground)]"> plano de ação clicável</strong> com 4-6 passos práticos.
        </p>
      </div>

      <SummarySection summary={view.summary} />

      {view.priorities.length > 0 && (
        <PrioritiesSection
          priorities={view.priorities}
          onOpenChecklist={(client) =>
            openChecklist(
              client.status === "vermelho" ? "critical-account" : "critical-account",
              `Plano para ${client.name}`,
              `${client.niche ?? "Sem nicho"} · ${client.owner}`
            )
          }
        />
      )}

      {view.signals.length > 0 && (
        <SignalsSection
          signals={view.signals}
          onOpenChecklist={(signal) => {
            if (signal.kind === "niche-concentration") {
              openChecklist(
                "niche-concentration",
                `Concentração de risco em ${signal.niche}`,
                `${signal.criticalCount} críticos de ${signal.total} clientes`
              );
            } else if (signal.kind === "csm-load") {
              openChecklist(
                "csm-load",
                `Carga crítica de ${signal.csm}`,
                `${signal.criticalCount} críticos / ${signal.atRiskCount} em risco`
              );
            } else if (signal.kind === "contract-expiring") {
              openChecklist(
                "contract-expiring",
                `Renovação: ${signal.client.name}`,
                `Contrato vence em ${signal.daysUntil} dia${signal.daysUntil === 1 ? "" : "s"}`
              );
            }
          }}
        />
      )}

      <HygieneSection
        issues={view.hygiene}
        onOpenChecklist={(issue) =>
          openChecklist(issue.kind, issue.title, issue.description)
        }
      />

      <ActionChecklistDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.title ?? ""}
        subtitle={dialog?.subtitle}
        items={dialog?.items ?? []}
      />
    </div>
  );
}

// === Subcomponentes ==================================================

function SummarySection({ summary }: { summary: StrategicView["summary"] }) {
  const coveragePct =
    summary.totalClients > 0
      ? (summary.coverage.withoutNiche / summary.totalClients) * 100
      : 0;

  return (
    <section className="animate-fade-up stagger-1 space-y-3">
      <header className="flex items-center gap-2">
        <Target className="size-4 text-[color:var(--muted-foreground)]" />
        <h2 className="text-base font-semibold">Resumo executivo</h2>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
        <SummaryTile
          icon={<AlertOctagon className="size-4" />}
          label="Críticos"
          value={summary.critical.toString()}
          hint={`${summary.warning} em alerta · ${summary.healthy} saudáveis`}
          tone={summary.critical >= 3 ? "danger" : summary.critical > 0 ? "warn" : "neutral"}
        />
        <SummaryTile
          icon={<Megaphone className="size-4" />}
          label="Investimento em risco"
          numericValue={summary.totalInvestmentAtRisk}
          formatValue={(n) => formatBRL(n)}
          hint={`${Math.round(summary.investmentRiskPct * 100)}% sob gestão`}
          tone={summary.investmentRiskPct > 0.3 ? "danger" : summary.investmentRiskPct > 0.15 ? "warn" : "neutral"}
        />
        <SummaryTile
          icon={<Coins className="size-4" />}
          label="Faturamento em risco"
          numericValue={summary.totalRevenueAtRisk}
          formatValue={(n) => formatBRL(n)}
          hint={`LTV em risco: ${formatBRL(summary.totalLTVAtRisk)}`}
          tone={summary.totalRevenueAtRisk > 0 ? "warn" : "neutral"}
        />
        <SummaryTile
          icon={<Database className="size-4" />}
          label="Cobertura de dados"
          value={`${100 - Math.round(coveragePct)}%`}
          hint={`${summary.coverage.withoutNiche} sem nicho · ${summary.coverage.withoutRevenue} sem mensalidade`}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  numericValue,
  formatValue,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  numericValue?: number;
  formatValue?: (n: number) => string;
  hint?: string;
  tone: "neutral" | "warn" | "danger";
}) {
  const iconBg = {
    neutral: "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  }[tone];
  const valueColor = {
    neutral: "text-[color:var(--foreground)]",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
          {label}
        </p>
        <div className={cn("size-8 rounded-lg grid place-items-center", iconBg)}>
          {icon}
        </div>
      </div>
      <p className={cn("text-3xl font-bold tabular-nums tracking-tight leading-none", valueColor)}>
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
    </div>
  );
}

function PrioritiesSection({
  priorities,
  onOpenChecklist,
}: {
  priorities: PrioritizedClient[];
  onOpenChecklist: (c: Client) => void;
}) {
  return (
    <section className="animate-fade-up stagger-2 space-y-3">
      <header className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 grid place-items-center">
          <Target className="size-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Priorize esta semana</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Top {priorities.length} contas em risco rankeadas por gravidade + impacto
          </p>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {priorities.map((p, i) => (
          <article
            key={p.client.id}
            className="rounded-2xl border border-[color:var(--border)] border-l-4 border-l-rose-500 bg-[color:var(--card-elevated)] p-5 space-y-4 transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-7 rounded-lg bg-[color:var(--muted)] grid place-items-center text-xs font-bold tabular-nums shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/cliente/${p.client.id}`}
                    className="font-semibold hover:underline truncate block"
                  >
                    {p.client.name}
                  </Link>
                  <p className="text-[11px] text-[color:var(--muted-foreground)]">
                    {p.client.niche ?? p.client.segment} · {p.client.owner}
                  </p>
                </div>
              </div>
              <StatusBadge status={p.client.status} size="sm" />
            </div>
            <ul className="space-y-1.5">
              {p.reasons.map((r, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]"
                >
                  <AlertTriangle className="size-3 shrink-0 mt-0.5 text-amber-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
              <Link
                href={`/cliente/${p.client.id}`}
                className="text-xs font-medium text-[color:var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 group transition-colors"
              >
                Ver detalhe
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={() => onOpenChecklist(p.client)}
                className="text-xs font-medium px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="size-3" />
                Plano de ação
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SignalsSection({
  signals,
  onOpenChecklist,
}: {
  signals: SystemicSignal[];
  onOpenChecklist: (s: SystemicSignal) => void;
}) {
  const niche = signals.filter((s) => s.kind === "niche-concentration");
  const csm = signals.filter((s) => s.kind === "csm-load");
  const expiring = signals.filter((s) => s.kind === "contract-expiring");

  return (
    <section className="animate-fade-up stagger-3 space-y-3">
      <header className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 grid place-items-center">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Sinais sistêmicos</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Padrões que indicam causa comum (não cliente isolado)
          </p>
        </div>
      </header>

      {niche.length === 0 && csm.length === 0 && expiring.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
          <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-medium">Nenhum padrão sistêmico detectado</p>
          <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
            Sua base está distribuída — sem nicho ou CSM concentrando risco.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {niche.map((s, i) => (
            <SignalCard
              key={`niche-${i}`}
              icon={<Layers className="size-4" />}
              tone="violet"
              title={`Nicho ${s.kind === "niche-concentration" ? s.niche : ""} com alta taxa de críticos`}
              body={
                s.kind === "niche-concentration"
                  ? `${s.criticalCount} de ${s.total} clientes (${Math.round(s.pctCritical * 100)}%) estão críticos — média da base é ${Math.round(s.pctBase * 100)}%. Investimento em risco: ${formatBRL(s.investmentAtRisk)}.`
                  : ""
              }
              onAction={() => onOpenChecklist(s)}
            />
          ))}
          {csm.map((s, i) => (
            <SignalCard
              key={`csm-${i}`}
              icon={<UserCog className="size-4" />}
              tone="amber"
              title={
                s.kind === "csm-load"
                  ? `${s.csm} com ${s.criticalCount} críticos`
                  : ""
              }
              body={
                s.kind === "csm-load"
                  ? `Carteira de ${s.total} clientes, sendo ${s.atRiskCount} em risco (${Math.round((s.atRiskCount / s.total) * 100)}%). Avalie redistribuir ou apoiar.`
                  : ""
              }
              onAction={() => onOpenChecklist(s)}
            />
          ))}
          {expiring.slice(0, 4).map((s, i) =>
            s.kind === "contract-expiring" ? (
              <SignalCard
                key={`exp-${i}`}
                icon={<CalendarX className="size-4" />}
                tone="rose"
                title={`Contrato de ${s.client.name} vence em ${s.daysUntil}d`}
                body={`${s.client.niche ?? "Sem nicho"} · ${s.client.owner} · status ${s.client.status}. Considere iniciar conversa de renovação agora.`}
                onAction={() => onOpenChecklist(s)}
              />
            ) : null
          )}
        </div>
      )}
    </section>
  );
}

function SignalCard({
  icon,
  tone,
  title,
  body,
  onAction,
}: {
  icon: React.ReactNode;
  tone: "violet" | "amber" | "rose";
  title: string;
  body: string;
  onAction: () => void;
}) {
  const borderClass = {
    violet: "border-l-violet-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
  }[tone];
  const iconBg = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  }[tone];
  return (
    <article
      className={cn(
        "rounded-2xl border border-[color:var(--border)] border-l-4 bg-[color:var(--card-elevated)] p-5 space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5",
        borderClass
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className={cn("size-8 rounded-lg grid place-items-center shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-[color:var(--muted-foreground)] leading-relaxed">
        {body}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="text-xs font-medium px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors inline-flex items-center gap-1.5"
      >
        <CheckCircle2 className="size-3" />
        Plano de ação
      </button>
    </article>
  );
}

function HygieneSection({
  issues,
  onOpenChecklist,
}: {
  issues: HygieneIssue[];
  onOpenChecklist: (i: HygieneIssue) => void;
}) {
  return (
    <section className="animate-fade-up stagger-4 space-y-3">
      <header className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
          <Database className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Higiene de dados</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Lacunas que limitam a análise — preenchimentos rápidos
          </p>
        </div>
      </header>

      {issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center">
          <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-medium">Base 100% preenchida</p>
          <p className="text-xs text-[color:var(--muted-foreground)] mt-1">
            Nenhuma lacuna detectada. Análises rodam com cobertura máxima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {issues.map((issue) => (
            <article
              key={issue.kind}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm">{issue.title}</h3>
                  <p className="text-xs text-[color:var(--muted-foreground)] mt-1 leading-relaxed">
                    {issue.description}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] shrink-0">
                  {issue.clients.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.clients.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/cliente/${c.id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] hover:bg-[color:var(--muted)] hover:-translate-y-0.5 transition-all"
                  >
                    <StatusDot status={c.status} />
                    <span className="truncate max-w-[140px]">{c.name}</span>
                  </Link>
                ))}
                {issue.clients.length > 5 && (
                  <span className="inline-flex items-center text-xs text-[color:var(--muted-foreground)] px-2 py-1">
                    +{issue.clients.length - 5}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChecklist(issue)}
                className="text-xs font-medium px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="size-3" />
                Como resolver
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
