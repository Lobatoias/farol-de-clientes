import Link from "next/link";
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  Ticket,
  ArrowRight,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import type { Client } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { FarolPicker } from "./farol-picker";
import { cn, formatBRL, formatRelative, statusConfig } from "@/lib/utils";

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const cfg = statusConfig[client.status];
  const degraded =
    client.previousStatus && client.previousStatus !== client.status &&
    ["amarelo", "vermelho"].indexOf(client.status) > ["amarelo", "vermelho"].indexOf(client.previousStatus || "verde");
  const hasInvestment = (client.investmentMeta ?? 0) > 0 || (client.investmentGoogle ?? 0) > 0;
  const totalInvestment = (client.investmentMeta ?? 0) + (client.investmentGoogle ?? 0);
  const hasMrr = client.mrr > 0;
  const hasMonthlyRevenue = (client.monthlyRevenue ?? 0) > 0;
  const isOrphan = client.hasOperationalFolder && client.hasMasterRecord === false;

  return (
    <Link
      href={`/cliente/${client.id}`}
      className={cn(
        "group relative block rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 transition-all duration-200 hover:shadow-md hover:border-[color:var(--muted-foreground)]/30 hover:-translate-y-0.5"
      )}
    >
      <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", cfg.dot)} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{client.name}</h3>
            <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5 truncate">
              {client.niche ?? client.segment} · {client.owner}
            </p>
          </div>
          <FarolPicker
            clientId={client.id}
            currentStatus={client.status}
            disabled={!client.hasMasterRecord}
            size="sm"
          />
        </div>

        {hasInvestment ? (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-[color:var(--muted-foreground)]">
              <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-1 rounded font-mono">
                meta
              </span>
              <span className="text-[color:var(--foreground)] font-medium">
                {client.investmentMeta ? formatBRL(client.investmentMeta) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[color:var(--muted-foreground)]">
              <span className="text-[10px] uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-1 rounded font-mono">
                google
              </span>
              <span className="text-[color:var(--foreground)] font-medium">
                {client.investmentGoogle ? formatBRL(client.investmentGoogle) : "—"}
              </span>
            </div>
          </div>
        ) : hasMrr ? (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-[color:var(--muted-foreground)]">
              <span className="text-[color:var(--foreground)] font-medium">
                {formatBRL(client.mrr)}
              </span>
              <span>MRR</span>
            </div>
            <div className="flex items-center gap-1.5 text-[color:var(--muted-foreground)]">
              {client.margin > 0.3 ? (
                <TrendingUp className="size-3 text-emerald-500" />
              ) : (
                <TrendingDown className="size-3 text-rose-500" />
              )}
              <span
                className={cn(
                  "font-medium",
                  client.margin < 0.2 ? "text-rose-600" : "text-[color:var(--foreground)]"
                )}
              >
                {Math.round(client.margin * 100)}%
              </span>
              <span>margem</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-[color:var(--muted-foreground)] opacity-50">
            <span>— sem investimento cadastrado</span>
          </div>
        )}

        {hasMonthlyRevenue && (
          <div className="flex items-center gap-1.5 mb-2 text-xs">
            <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1 rounded font-mono">
              fee
            </span>
            <span className="text-[color:var(--foreground)] font-medium">
              {formatBRL(client.monthlyRevenue!)}
            </span>
            <span className="text-[color:var(--muted-foreground)]">/mês</span>
          </div>
        )}

        {client.services && client.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {client.services.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--muted)] text-[color:var(--muted-foreground)]"
              >
                {s}
              </span>
            ))}
            {client.services.length > 3 && (
              <span className="text-[10px] text-[color:var(--muted-foreground)]">
                +{client.services.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
          {client.riskTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-mono",
                client.status === "verde"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : client.status === "amarelo"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              )}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)] flex-wrap gap-2">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {client.lastMeetingAt ? formatRelative(client.lastMeetingAt) : "sem reunião"}
          </span>
          {client.openTickets > 0 && (
            <span className="flex items-center gap-1">
              <Ticket className="size-3" />
              {client.openTickets} task{client.openTickets > 1 ? "s" : ""}
            </span>
          )}
          {(client.internalNotesCount ?? 0) > 0 && (
            <span
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
              title={`${client.internalNotesCount} nota(s) interna(s) do time`}
            >
              <StickyNote className="size-3" />
              {client.internalNotesCount}
            </span>
          )}
          {degraded && (
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <TrendingDown className="size-3" />
              degradou
            </span>
          )}
          {isOrphan && (
            <span
              className="flex items-center gap-1 text-amber-600 font-medium"
              title="Cliente tem folder operacional mas não está no cadastro mestre"
            >
              <AlertCircle className="size-3" />
              órfão
            </span>
          )}
        </div>

        <ArrowRight className="absolute right-3 top-3 size-3.5 text-[color:var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
