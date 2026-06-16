"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Clock,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  KeyRound,
  Loader2,
  Check,
} from "lucide-react";
import {
  ALL_SECTIONS,
  SECTION_LABEL,
  ROLE_LABEL,
  type Role,
  type Section,
} from "@/lib/session";
import type { AppUser, AppSettings } from "@/lib/users";
import { cn } from "@/lib/utils";

interface ConfigViewProps {
  settings: AppSettings;
  users: AppUser[];
}

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Rio_Branco",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "UTC",
  "America/New_York",
  "Europe/Lisbon",
];

const ROLE_OPTIONS: Role[] = ["admin", "gestor", "leitor"];

export function ConfigView({ settings, users }: ConfigViewProps) {
  return (
    <div className="space-y-6">
      <AccountBlock settings={settings} />
      <AccessBlock settings={settings} />
      <UsersBlock users={users} />
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Globe;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-[color:var(--muted)] grid place-items-center">
          <Icon className="size-4 text-[color:var(--muted-foreground)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SavedTick({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 animate-fade-in">
      <Check className="size-3.5" /> salvo
    </span>
  );
}

// === Conta: idioma + fuso ===========================================
function AccountBlock({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(settings.timezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(tz: string) {
    setTimezone(tz);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/config/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card icon={Globe} title="Conta" subtitle="Idioma e fuso horário do sistema">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <Globe className="size-3" /> Idioma
          </label>
          <select
            disabled
            value="pt-BR"
            className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm opacity-70"
          >
            <option value="pt-BR">Português (Brasil)</option>
          </select>
          <p className="text-[10px] text-[color:var(--muted-foreground)]">
            Outros idiomas chegam em breve.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold flex items-center gap-1.5">
            <Clock className="size-3" /> Fuso horário
            {saving && <Loader2 className="size-3 animate-spin" />}
            <SavedTick show={saved} />
          </label>
          <select
            value={timezone}
            onChange={(e) => save(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}

// === Acessos: seções por papel ======================================
function AccessBlock({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [access, setAccess] = useState<Record<string, Section[]>>({
    gestor: settings.roleAccess.gestor ?? ["dashboard"],
    leitor: settings.roleAccess.leitor ?? ["dashboard"],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(role: "gestor" | "leitor", section: Section) {
    setAccess((prev) => {
      const cur = new Set(prev[role]);
      if (cur.has(section)) cur.delete(section);
      else cur.add(section);
      cur.add("dashboard"); // sempre garante um pouso
      return { ...prev, [role]: ALL_SECTIONS.filter((s) => cur.has(s)) };
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/config/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleAccess: access }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      icon={ShieldCheck}
      title="Acessos por papel"
      subtitle="O que cada papel enxerga · admin vê tudo"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
              <th className="font-semibold py-2 pr-4">Papel</th>
              {ALL_SECTIONS.map((s) => (
                <th key={s} className="font-semibold py-2 px-2 text-center">
                  {SECTION_LABEL[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[color:var(--border)]">
              <td className="py-2.5 pr-4 font-medium">Admin</td>
              {ALL_SECTIONS.map((s) => (
                <td key={s} className="text-center text-emerald-500">
                  <Check className="size-4 inline" />
                </td>
              ))}
            </tr>
            {(["gestor", "leitor"] as const).map((role) => (
              <tr key={role} className="border-t border-[color:var(--border)]">
                <td className="py-2.5 pr-4 font-medium">{ROLE_LABEL[role]}</td>
                {ALL_SECTIONS.map((s) => {
                  const on = access[role].includes(s);
                  const locked = s === "dashboard";
                  return (
                    <td key={s} className="text-center">
                      <button
                        type="button"
                        onClick={() => !locked && toggle(role, s)}
                        disabled={locked}
                        aria-pressed={on}
                        aria-label={`${SECTION_LABEL[s]} para ${ROLE_LABEL[role]}`}
                        className={cn(
                          "size-6 rounded-md grid place-items-center mx-auto transition-colors",
                          on
                            ? "bg-blue-600 text-white"
                            : "border border-[color:var(--border)] text-transparent hover:border-blue-500/60",
                          locked && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[10px] text-[color:var(--muted-foreground)] leading-relaxed">
          Dashboard é fixo (todos têm um pouso). Mudanças valem no próximo login do usuário.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <SavedTick show={saved} />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-xs font-medium px-3 h-8 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Salvar acessos
          </button>
        </div>
      </div>
    </Card>
  );
}

// === Usuários: lista + criar + editar ===============================
function UsersBlock({ users }: { users: AppUser[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("gestor");
  const [password, setPassword] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/config/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, role, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEmail("");
      setName("");
      setPassword("");
      setRole("gestor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      await fetch(`/api/config/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(id: number) {
    const np = prompt("Nova senha (mín. 6 caracteres):");
    if (!np) return;
    if (np.length < 6) {
      setError("Senha precisa de ao menos 6 caracteres");
      return;
    }
    await patch(id, { password: np });
  }

  async function remove(id: number, label: string) {
    if (!confirm(`Remover ${label}?`)) return;
    setBusyId(id);
    try {
      await fetch(`/api/config/users/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card icon={Users} title="Usuários" subtitle="Quem entra no sistema e com qual papel">
      {/* Criar */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e-mail"
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="nome (opcional)"
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha temporária"
            className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            ⚠️ {error}
          </p>
        )}
        <button
          type="button"
          onClick={create}
          disabled={adding || !email || password.length < 6}
          className="text-xs font-medium px-3 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Adicionar usuário
        </button>
      </div>

      {/* Lista */}
      {users.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)] py-2">
          Nenhum usuário cadastrado ainda. Você entra com a senha mestra como admin.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="py-3 flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {u.name || u.email}
                  {!u.active && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
                      inativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)] truncate">{u.email}</p>
              </div>
              <select
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                disabled={busyId === u.id}
                aria-label={`Papel de ${u.email}`}
                className="h-8 px-2 rounded-md border border-[color:var(--border)] bg-[color:var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patch(u.id, { active: !u.active })}
                disabled={busyId === u.id}
                className="text-[11px] px-2 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
              >
                {u.active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={() => resetPassword(u.id)}
                disabled={busyId === u.id}
                aria-label="Resetar senha"
                title="Resetar senha"
                className="size-8 rounded-md grid place-items-center text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] transition-colors"
              >
                <KeyRound className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(u.id, u.name || u.email)}
                disabled={busyId === u.id}
                aria-label="Remover usuário"
                title="Remover"
                className="size-8 rounded-md grid place-items-center text-[color:var(--muted-foreground)] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                {busyId === u.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
