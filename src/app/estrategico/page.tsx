import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  Target,
  AlertOctagon,
} from "lucide-react";
import { getClients, isUsingMockData } from "@/lib/clients";
import { getStrategicInsights } from "@/lib/mock-ai";
import { StatusBadge } from "@/components/status-badge";
import { SourceBanner } from "@/components/source-banner";
import { formatBRL, formatDate } from "@/lib/utils";
import type { AIInsight, Client } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EstrategicoPage() {
  const clients = await getClients();
  const insights = getStrategicInsights(clients);

  const byType = {
    padrao: insights.filter((i) => i.type === "padrao"),
    prioridade: insights.filter((i) => i.type === "prioridade"),
    "alerta-degradacao": insights.filter((i) => i.type === "alerta-degradacao"),
  };

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap animate-fade-up">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 grid place-items-center">
              <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
              Análise estratégica
            </span>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)] ring-1 ring-inset ring-[color:var(--border)]">
              semanal
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            O que merece sua atenção esta semana
          </h1>
          <p className="text-sm text-[color:var(--muted-foreground)] max-w-2xl leading-relaxed">
            Padrões, prioridades e alertas gerados pela IA a partir da base de{" "}
            <strong className="text-[color:var(--foreground)]">{clients.length}</strong> clientes.
            Atualizado em {formatDate(new Date().toISOString())}.
          </p>
        </div>
        <SourceBanner source={isUsingMockData() ? "mock" : "clickup"} count={clients.length} />
      </div>

      {byType.prioridade.length > 0 && (
        <Section
          icon={<Target className="size-4" />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          title="Prioridades"
          subtitle="Onde concentrar esforço esta semana"
          insights={byType.prioridade}
          tone="priority"
          clientMap={clientMap}
          delayBase={1}
        />
      )}

      {byType["alerta-degradacao"].length > 0 && (
        <Section
          icon={<AlertOctagon className="size-4" />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          title="Alertas de degradação"
          subtitle="Movimentos negativos detectados recentemente"
          insights={byType["alerta-degradacao"]}
          tone="alert"
          clientMap={clientMap}
          delayBase={2}
        />
      )}

      {byType.padrao.length > 0 && (
        <Section
          icon={<TrendingDown className="size-4" />}
          iconBg="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          title="Padrões identificados"
          subtitle="Sinais comuns entre múltiplos clientes — possíveis causas sistêmicas"
          insights={byType.padrao}
          tone="pattern"
          clientMap={clientMap}
          delayBase={3}
        />
      )}

      {insights.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-16 text-center animate-fade-up stagger-2">
          <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 grid place-items-center mx-auto mb-4">
            <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-base font-medium mb-1">Tudo sob controle</p>
          <p className="text-sm text-[color:var(--muted-foreground)] max-w-md mx-auto">
            Nenhum padrão crítico detectado nesta semana. Sua base está saudável
            (ou os dados ainda não são suficientes pra cruzar).
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  iconBg,
  title,
  subtitle,
  insights,
  tone,
  clientMap,
  delayBase,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  insights: AIInsight[];
  tone: "priority" | "alert" | "pattern";
  clientMap: Map<string, Client>;
  delayBase: number;
}) {
  return (
    <section
      className="space-y-4 animate-fade-up"
      style={{ animationDelay: `${delayBase * 60}ms` }}
    >
      <header className="flex items-center gap-3">
        <div className={`size-8 rounded-lg grid place-items-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">{subtitle}</p>
        </div>
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)] tabular-nums">
          {insights.length} insight{insights.length > 1 ? "s" : ""}
        </span>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {insights.map((insight, i) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            tone={tone}
            clientMap={clientMap}
            delay={delayBase * 60 + i * 50}
          />
        ))}
      </div>
    </section>
  );
}

function InsightCard({
  insight,
  tone,
  clientMap,
  delay,
}: {
  insight: AIInsight;
  tone: "priority" | "alert" | "pattern";
  clientMap: Map<string, Client>;
  delay: number;
}) {
  const toneClass = {
    priority: "border-l-4 border-l-rose-500",
    alert: "border-l-4 border-l-amber-500",
    pattern: "border-l-4 border-l-violet-500",
  }[tone];

  const confidenceColor = {
    alta: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    media: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    baixa: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  }[insight.confidence];

  return (
    <div
      className={`group rounded-2xl border border-[color:var(--border)] ${toneClass} bg-[color:var(--card)] p-5 space-y-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-sm leading-snug">{insight.title}</h3>
        <span
          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${confidenceColor}`}
        >
          confiança {insight.confidence}
        </span>
      </div>
      <p className="text-sm text-[color:var(--muted-foreground)] leading-relaxed">
        {insight.body}
      </p>
      {insight.affectedClientIds.length > 0 && (
        <div className="pt-3 border-t border-[color:var(--border)]">
          <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)] font-medium mb-2">
            {insight.affectedClientIds.length} cliente
            {insight.affectedClientIds.length > 1 ? "s" : ""} afetado
            {insight.affectedClientIds.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {insight.affectedClientIds.slice(0, 6).map((cid) => {
              const c = clientMap.get(cid);
              if (!c) return null;
              return (
                <Link
                  key={cid}
                  href={`/cliente/${cid}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] hover:bg-[color:var(--muted)] hover:border-[color:var(--muted-foreground)]/30 hover:-translate-y-0.5 transition-all duration-150"
                >
                  <StatusBadge status={c.status} size="sm" showLabel={false} />
                  <span>{c.name}</span>
                  {c.monthlyRevenue ? (
                    <span className="text-[color:var(--muted-foreground)] tabular-nums">
                      {formatBRL(c.monthlyRevenue)}
                    </span>
                  ) : c.mrr > 0 ? (
                    <span className="text-[color:var(--muted-foreground)] tabular-nums">
                      {formatBRL(c.mrr)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {insight.affectedClientIds.length > 6 && (
              <span className="inline-flex items-center text-xs text-[color:var(--muted-foreground)] px-2 py-1">
                +{insight.affectedClientIds.length - 6}
              </span>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/btn"
      >
        Gerar plano de ação
        <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
      </button>
    </div>
  );
}
