import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Ticket,
  Star,
} from "lucide-react";
import { getClientById } from "@/lib/clients";
import { getClientAnalysis } from "@/lib/mock-ai";
import { StatusBadge } from "@/components/status-badge";
import { AIPanel } from "@/components/ai-panel";
import { Timeline } from "@/components/timeline";
import { MeetingNotes } from "@/components/meeting-notes";
import { ClientChurnSection } from "@/components/client-churn-section";
import { cn, formatBRL, formatDate, formatRelative, statusConfig } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const analysis = getClientAnalysis(client);
  const cfg = statusConfig[client.status];
  const hasFinancials = client.mrr > 0;
  const hasMonthlyRevenue = (client.monthlyRevenue ?? 0) > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors animate-fade-in"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Voltar ao dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 animate-fade-up">
        <div className="flex items-start gap-4">
          <div className={`size-12 rounded-xl ${cfg.dot} shadow-sm`} />
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              {client.niche ?? client.segment} · Responsável:{" "}
              <span className="text-[color:var(--foreground)] font-medium">{client.owner}</span>
            </p>
            <p className="text-sm mt-2 max-w-2xl leading-relaxed">{client.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {client.clickupUrl && (
            <a
              href={client.clickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[color:var(--border)] text-sm hover:bg-[color:var(--muted)] hover:border-[color:var(--muted-foreground)]/30 transition-all"
            >
              Abrir no ClickUp
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {!client.isChurned && (
            <ClientChurnSection
              clientId={client.id}
              clientName={client.name}
              isChurned={false}
            />
          )}
        </div>
      </div>

      {/* Banner de churn (se já saiu) */}
      {client.isChurned && client.lastChurnEvent && (
        <ClientChurnSection
          clientId={client.id}
          clientName={client.name}
          isChurned={true}
          lastChurnEvent={client.lastChurnEvent}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-up stagger-1">
        <KpiTile
          label={hasMonthlyRevenue ? "Mensalidade" : "MRR"}
          value={
            hasMonthlyRevenue
              ? formatBRL(client.monthlyRevenue!)
              : hasFinancials
              ? formatBRL(client.mrr)
              : "—"
          }
          icon={TrendingUp}
          hint={!hasMonthlyRevenue && !hasFinancials ? "preencha em /financeiro" : undefined}
          accent={hasMonthlyRevenue ? "good" : undefined}
        />
        <KpiTile
          label="Margem"
          value={hasFinancials ? `${Math.round(client.margin * 100)}%` : "—"}
          icon={client.margin < 0.2 ? TrendingDown : TrendingUp}
          accent={
            !hasFinancials
              ? undefined
              : client.margin < 0.2
              ? "danger"
              : client.margin < 0.4
              ? "warn"
              : "good"
          }
        />
        <KpiTile
          label="NPS"
          value={client.nps?.toString() ?? "—"}
          icon={Star}
          accent={
            client.nps === undefined
              ? undefined
              : client.nps >= 8
              ? "good"
              : client.nps >= 5
              ? "warn"
              : "danger"
          }
        />
        <KpiTile
          label="Tickets abertos"
          value={client.openTickets.toString()}
          icon={Ticket}
          accent={
            client.openTickets >= 3 ? "danger" : client.openTickets > 0 ? "warn" : "good"
          }
        />
        <KpiTile
          label="Próxima reunião"
          value={client.nextMeetingAt ? formatDate(client.nextMeetingAt) : "—"}
          icon={CalendarClock}
        />
      </div>

      {/* Risk tags */}
      {client.riskTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-fade-up stagger-2">
          <span className="text-xs text-[color:var(--muted-foreground)] uppercase tracking-wide font-semibold">
            Sinais
          </span>
          {client.riskTags.map((t) => (
            <span
              key={t}
              className="text-xs font-mono px-2 py-1 rounded-lg bg-[color:var(--muted)] text-[color:var(--foreground)] transition-all hover:scale-105"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Notas */}
      <div className="animate-fade-up stagger-3">
        <MeetingNotes
          notes={client.meetingNotes}
          lastMeetingAt={client.lastMeetingAt}
          clickupMasterUrl={client.clickupMasterUrl}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* AI panel */}
        <div className="lg:col-span-3 animate-fade-up stagger-4">
          <AIPanel client={client} analysis={analysis} />
        </div>

        {/* Side */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up stagger-5">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 transition-all hover:shadow-md">
            <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold mb-3">
              Histórico de status
            </h4>
            <div className="flex items-center gap-2">
              {client.previousStatus && (
                <>
                  <StatusBadge status={client.previousStatus} size="sm" />
                  <span className="text-[color:var(--muted-foreground)]">→</span>
                </>
              )}
              <StatusBadge status={client.status} size="sm" />
              <span className="text-xs text-[color:var(--muted-foreground)] ml-auto">
                {client.previousStatus
                  ? `mudou ${formatRelative(client.statusChangedAt)}`
                  : `estável há ${formatRelative(client.statusChangedAt)}`}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-3 text-sm transition-all hover:shadow-md">
            <h4 className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
              Reuniões
            </h4>
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-[color:var(--muted-foreground)]" />
              <span>
                Última:{" "}
                <span className="font-medium">
                  {client.lastMeetingAt ? formatRelative(client.lastMeetingAt) : "—"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-3.5 text-[color:var(--muted-foreground)]" />
              <span>
                Próxima:{" "}
                <span className="font-medium">
                  {client.nextMeetingAt ? formatDate(client.nextMeetingAt) : "—"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4 animate-fade-up stagger-6">
        <h2 className="text-base font-semibold">Histórico operacional</h2>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
          <Timeline events={client.events} />
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "good" | "warn" | "danger";
  hint?: string;
}) {
  const color =
    accent === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-[color:var(--foreground)]";

  const iconBg =
    accent === "danger"
      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
      : accent === "warn"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
      : accent === "good"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]";

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs text-[color:var(--muted-foreground)] uppercase tracking-wide font-semibold">
          {label}
        </div>
        <div className={cn("size-6 rounded-md grid place-items-center", iconBg)}>
          <Icon className="size-3" />
        </div>
      </div>
      <p className={`text-xl font-bold tabular-nums tracking-tight ${color}`}>{value}</p>
      {hint && (
        <p className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5">{hint}</p>
      )}
    </div>
  );
}
