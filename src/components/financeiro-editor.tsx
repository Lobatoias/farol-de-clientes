"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Search,
  AlertCircle,
  DollarSign,
  Lock,
  Users,
  TrendingDown,
  CircleAlert,
  CircleDashed,
  CircleCheck,
  Clock,
} from "lucide-react";
import type { Client, Status } from "@/lib/types";
import { cn, daysUntil, formatBRL, statusConfig } from "@/lib/utils";
import { CountUp } from "./count-up";

type FieldKey =
  | "monthlyRevenue"
  | "contractStartAt"
  | "contractEndAt"
  | "clientSince";

interface FinanceiroEditorProps {
  clients: Client[];
}

interface RowState {
  monthlyRevenue: string;
  contractStartAt: string;
  contractEndAt: string;
  clientSince: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

function toInput(value: number | undefined): string {
  return value ? String(value) : "";
}

function toDateInput(value: string | undefined): string {
  if (!value) return "";
  return value.split("T")[0];
}

const STATUS_ORDER: Record<Status, number> = { vermelho: 0, amarelo: 1, verde: 2 };

export function FinanceiroEditor({ clients }: FinanceiroEditorProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const c of clients) {
      init[c.id] = {
        monthlyRevenue: toInput(c.monthlyRevenue),
        contractStartAt: toDateInput(c.contractStartAt),
        contractEndAt: toDateInput(c.contractEndAt),
        clientSince: toDateInput(c.clientSince),
        saving: false,
        saved: false,
        error: null,
      };
    }
    return init;
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
    return [...base].sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      return a.name.localeCompare(b.name);
    });
  }, [clients, query]);

  const grouped = useMemo(() => {
    const groups: Record<Status, Client[]> = { vermelho: [], amarelo: [], verde: [] };
    for (const c of filtered) groups[c.status].push(c);
    return groups;
  }, [filtered]);

  const totals = useMemo(() => {
    const all = clients.reduce((sum, c) => {
      const v = parseFloat(rows[c.id]?.monthlyRevenue ?? "0");
      return sum + (Number.isNaN(v) ? 0 : v);
    }, 0);
    const atRisk = clients
      .filter((c) => c.status !== "verde")
      .reduce((sum, c) => {
        const v = parseFloat(rows[c.id]?.monthlyRevenue ?? "0");
        return sum + (Number.isNaN(v) ? 0 : v);
      }, 0);
    const preenchidos = clients.filter((c) => {
      const v = parseFloat(rows[c.id]?.monthlyRevenue ?? "0");
      return !Number.isNaN(v) && v > 0;
    }).length;
    return {
      all,
      atRisk,
      riskPct: all > 0 ? atRisk / all : 0,
      preenchidos,
      pendentes: clients.length - preenchidos,
    };
  }, [clients, rows]);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRow(client: Client, field: FieldKey) {
    const row = rows[client.id];
    if (!row) return;
    updateRow(client.id, { saving: true, error: null, saved: false });

    const payload: Record<string, unknown> = { name: client.name };
    if (field === "monthlyRevenue") {
      const v = row.monthlyRevenue.trim();
      payload.monthlyRevenue = v === "" ? null : parseFloat(v);
    } else if (field === "contractStartAt") {
      payload.contractStartAt = row.contractStartAt || null;
    } else if (field === "contractEndAt") {
      payload.contractEndAt = row.contractEndAt || null;
    } else if (field === "clientSince") {
      payload.clientSince = row.clientSince || null;
    }

    try {
      const res = await fetch(`/api/financials/${client.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      updateRow(client.id, { saving: false, saved: true, error: null });
      setTimeout(() => updateRow(client.id, { saved: false }), 1800);
      startTransition(() => router.refresh());
    } catch (err) {
      updateRow(client.id, {
        saving: false,
        saved: false,
        error: err instanceof Error ? err.message : "Falha",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats — financial dashboard pattern: big numbers, trust blue, animated */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<DollarSign className="size-4" />}
          label="Faturamento mensal"
          numericValue={totals.all}
          formatValue={(n) => formatBRL(n)}
          sublabel={`${totals.preenchidos}/${clients.length} clientes preenchidos`}
          accent="primary"
          className="animate-fade-up stagger-1"
        />
        <Stat
          icon={<TrendingDown className="size-4" />}
          label="Em risco"
          numericValue={totals.atRisk}
          formatValue={(n) => formatBRL(n)}
          sublabel={`${Math.round(totals.riskPct * 100)}% do total · amarelo + vermelho`}
          accent={
            totals.riskPct > 0.3 ? "danger" : totals.riskPct > 0.15 ? "warn" : undefined
          }
          className="animate-fade-up stagger-2"
        />
        <Stat
          icon={<CircleDashed className="size-4" />}
          label="Pendentes"
          numericValue={totals.pendentes}
          formatValue={(n) => Math.round(n).toString()}
          sublabel={
            totals.pendentes > 0
              ? "clientes sem mensalidade"
              : "todos preenchidos"
          }
          className="animate-fade-up stagger-3"
        />
        <Stat
          icon={<Lock className="size-4" />}
          label="Privacidade"
          value="Local"
          sublabel="financials.local.json · gitignored"
          muted
          className="animate-fade-up stagger-4"
        />
      </div>

      {/* Busca */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm placeholder:text-[color:var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
          />
        </div>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Salva ao sair do campo · <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-[color:var(--border)] bg-[color:var(--muted)]">Enter</kbd> ou <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-[color:var(--border)] bg-[color:var(--muted)]">Tab</kbd>
        </p>
      </div>

      {/* Tabela com agrupamento */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden shadow-sm animate-fade-up stagger-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] bg-[color:var(--muted)]/60 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-3 py-3 font-medium">Nicho</th>
                <th className="text-right px-3 py-3 font-medium">Mensalidade</th>
                <th className="text-left px-3 py-3 font-medium">Cliente desde</th>
                <th className="text-left px-3 py-3 font-medium">Início contrato</th>
                <th className="text-left px-3 py-3 font-medium">Fim contrato</th>
              </tr>
            </thead>
            <tbody>
              {(["vermelho", "amarelo", "verde"] as Status[]).map((status) => {
                const groupClients = grouped[status];
                if (groupClients.length === 0) return null;
                return (
                  <GroupRows
                    key={status}
                    status={status}
                    clients={groupClients}
                    rows={rows}
                    onUpdate={updateRow}
                    onSave={saveRow}
                  />
                );
              })}
              {filtered.length > 0 && (
                <tr className="bg-[color:var(--muted)]/40 border-t-2 border-[color:var(--border)]">
                  <td className="px-4 py-3 font-semibold" colSpan={2}>
                    Total · {filtered.length} clientes
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    <CountUp to={totals.all} format={(n) => formatBRL(n)} />
                  </td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <CircleAlert className="size-8 mx-auto text-[color:var(--muted-foreground)] mb-2" />
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Nenhum cliente bate com a busca.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-[color:var(--muted-foreground)]">
        Dados em <code className="bg-[color:var(--muted)] px-1 rounded">data/financials.local.json</code> — gitignored,
        fora do ClickUp. Acessível apenas a quem tem este projeto rodando localmente.
      </p>
    </div>
  );
}

// === Subcomponentes ===

function GroupRows({
  status,
  clients,
  rows,
  onUpdate,
  onSave,
}: {
  status: Status;
  clients: Client[];
  rows: Record<string, RowState>;
  onUpdate: (id: string, patch: Partial<RowState>) => void;
  onSave: (c: Client, field: FieldKey) => void;
}) {
  const cfg = statusConfig[status];
  const groupTotal = clients.reduce((s, c) => {
    const v = parseFloat(rows[c.id]?.monthlyRevenue ?? "0");
    return s + (Number.isNaN(v) ? 0 : v);
  }, 0);
  const Icon = status === "vermelho" ? CircleAlert : status === "amarelo" ? CircleDashed : CircleCheck;

  return (
    <>
      <tr className="bg-[color:var(--muted)]/30 border-t border-[color:var(--border)]">
        <td colSpan={6} className="px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className={cn("size-3.5", cfg.text)} />
              <span className={cn("text-[11px] uppercase tracking-wide font-semibold", cfg.text)}>
                {cfg.label}
              </span>
              <span className="text-xs text-[color:var(--muted-foreground)]">
                · {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
              </span>
            </div>
            {groupTotal > 0 && (
              <span className="text-xs text-[color:var(--muted-foreground)] tabular-nums">
                {formatBRL(groupTotal)} <span className="opacity-70">/mês</span>
              </span>
            )}
          </div>
        </td>
      </tr>
      {clients.map((client) => {
        const row = rows[client.id];
        if (!row) return null;
        return (
          <ClientRow
            key={client.id}
            client={client}
            row={row}
            onUpdate={(patch) => onUpdate(client.id, patch)}
            onSave={(field) => onSave(client, field)}
          />
        );
      })}
    </>
  );
}

function ClientRow({
  client,
  row,
  onUpdate,
  onSave,
}: {
  client: Client;
  row: RowState;
  onUpdate: (patch: Partial<RowState>) => void;
  onSave: (field: FieldKey) => void;
}) {
  const expiringSoon = client.contractEndAt ? daysUntil(client.contractEndAt) : null;
  const showExpiring =
    expiringSoon !== null && expiringSoon <= 30 && expiringSoon >= -7;

  return (
    <tr
      className={cn(
        "border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/30 transition-colors",
        row.saved && "animate-saved"
      )}
    >
      <td className="px-4 py-2.5">
        <div className="font-medium">{client.name}</div>
        <div className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5 flex items-center gap-1.5 flex-wrap">
          <Users className="size-2.5" />
          {client.owner}
          {!client.hasMasterRecord && (
            <span
              className="text-amber-600 font-mono text-[10px]"
              title="Folder operacional sem cadastro mestre"
            >
              · órfão
            </span>
          )}
          {showExpiring && <ContractExpiryBadge days={expiringSoon} />}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {client.niche ?? <em className="opacity-50">—</em>}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="relative w-36 ml-auto">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[color:var(--muted-foreground)]">
            R$
          </span>
          <input
            type="number"
            step="50"
            min="0"
            placeholder="—"
            value={row.monthlyRevenue}
            onChange={(e) => onUpdate({ monthlyRevenue: e.target.value })}
            onBlur={() => onSave("monthlyRevenue")}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={cn(
              "w-full text-right pl-7 pr-7 h-9 rounded-md border bg-[color:var(--background)] text-sm tabular-nums focus:outline-none transition-all",
              row.saved
                ? "border-emerald-500 ring-1 ring-emerald-500/30"
                : row.error
                ? "border-rose-500 ring-1 ring-rose-500/30"
                : "border-[color:var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            )}
          />
          <FieldStatus state={row} />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <DateInput
          value={row.clientSince}
          onChange={(v) => onUpdate({ clientSince: v })}
          onBlur={() => onSave("clientSince")}
        />
      </td>
      <td className="px-3 py-2.5">
        <DateInput
          value={row.contractStartAt}
          onChange={(v) => onUpdate({ contractStartAt: v })}
          onBlur={() => onSave("contractStartAt")}
        />
      </td>
      <td className="px-3 py-2.5">
        <DateInput
          value={row.contractEndAt}
          onChange={(v) => onUpdate({ contractEndAt: v })}
          onBlur={() => onSave("contractEndAt")}
        />
      </td>
    </tr>
  );
}

function DateInput({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="px-2 h-9 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all w-[125px]"
    />
  );
}

function ContractExpiryBadge({ days }: { days: number }) {
  const isExpired = days < 0;
  const isCritical = days >= 0 && days <= 14;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium",
        isExpired
          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
          : isCritical
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
      )}
      title={isExpired ? "Contrato expirou" : "Contrato próximo do fim"}
    >
      <Clock className="size-2.5" />
      {isExpired ? `expirou há ${Math.abs(days)}d` : `renova em ${days}d`}
    </span>
  );
}

function FieldStatus({ state }: { state: RowState }) {
  if (state.saving) {
    return (
      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3 animate-spin text-[color:var(--muted-foreground)]" />
    );
  }
  if (state.saved) {
    return (
      <Check className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-emerald-500" />
    );
  }
  if (state.error) {
    return (
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2"
        title={state.error}
        aria-label={state.error}
      >
        <AlertCircle className="size-3 text-rose-500" />
      </span>
    );
  }
  return null;
}

function Stat({
  icon,
  label,
  value,
  numericValue,
  formatValue,
  sublabel,
  accent,
  muted,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  /** Use `value` para texto estático (ex: "Local") OU `numericValue` + `formatValue` pra animação. */
  value?: string;
  numericValue?: number;
  formatValue?: (n: number) => string;
  sublabel?: string;
  accent?: "danger" | "warn" | "primary";
  muted?: boolean;
  className?: string;
}) {
  const valueColor =
    accent === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : accent === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "primary"
      ? "text-blue-600 dark:text-blue-400"
      : muted
      ? "text-[color:var(--muted-foreground)]"
      : "text-[color:var(--foreground)]";

  const iconBg =
    accent === "danger"
      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
      : accent === "warn"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
      : accent === "primary"
      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
      : "bg-[color:var(--muted)] text-[color:var(--muted-foreground)]";

  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)] font-semibold">
          {label}
        </p>
        <div className={cn("size-8 rounded-lg grid place-items-center transition-colors", iconBg)}>
          {icon}
        </div>
      </div>
      <p className={cn("text-3xl font-bold tabular-nums tracking-tight", valueColor)}>
        {numericValue !== undefined && formatValue ? (
          <CountUp to={numericValue} format={formatValue} />
        ) : (
          value
        )}
      </p>
      {sublabel && (
        <p className="text-[11px] text-[color:var(--muted-foreground)] mt-1.5 leading-tight">
          {sublabel}
        </p>
      )}
    </div>
  );
}
