import { Ticket } from "lucide-react";
import { getClientTimeline } from "@/lib/clients";
import { Timeline } from "./timeline";
import { cn } from "@/lib/utils";

interface TimelineSectionProps {
  clientId: string;
}

/**
 * Server component async que carrega timeline + tickets em paralelo
 * com o resto da página. Renderiza dentro de um <Suspense>.
 */
export async function TimelineSection({ clientId }: TimelineSectionProps) {
  const data = await getClientTimeline(clientId);
  const events = data?.events ?? [];
  return <Timeline events={events} clientId={clientId} />;
}

/**
 * KPI de "Tickets abertos" que carrega via Suspense também.
 * Reusa o cache da timeline — não dispara fetch novo.
 */
export async function OpenTicketsTile({ clientId }: TimelineSectionProps) {
  const data = await getClientTimeline(clientId);
  const openTickets = data?.openTickets ?? 0;
  const accent =
    openTickets >= 3 ? "danger" : openTickets > 0 ? "warn" : "good";

  const valColor = {
    danger: "text-rose-600 dark:text-rose-400",
    warn: "text-amber-600 dark:text-amber-400",
    good: "text-emerald-600 dark:text-emerald-400",
  }[accent];

  const iconBg = {
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    good:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  }[accent];

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs text-[color:var(--muted-foreground)] uppercase tracking-wide font-semibold">
          Tickets abertos
        </div>
        <div className={cn("size-6 rounded-md grid place-items-center", iconBg)}>
          <Ticket className="size-3" />
        </div>
      </div>
      <p className={cn("text-xl font-bold tabular-nums tracking-tight", valColor)}>
        {openTickets}
      </p>
    </div>
  );
}

/** Skeleton do KPI de tickets. */
export function OpenTicketsTileSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 animate-pulse">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs text-[color:var(--muted-foreground)] uppercase tracking-wide font-semibold">
          Tickets abertos
        </div>
        <div className="size-6 rounded-md bg-[color:var(--muted)]" />
      </div>
      <div className="h-6 w-8 bg-[color:var(--muted)] rounded" />
    </div>
  );
}

/** Skeleton mostrado enquanto a timeline carrega. */
export function TimelineSectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 py-2"
        >
          <div className="size-8 rounded-md bg-[color:var(--muted)] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 bg-[color:var(--muted)] rounded" />
            <div className="h-3 w-2/3 bg-[color:var(--muted)] rounded" />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[color:var(--muted-foreground)] text-center pt-2">
        Carregando histórico operacional…
      </p>
    </div>
  );
}
