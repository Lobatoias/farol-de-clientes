"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lightbulb, LayoutDashboard, Compass, DollarSign, UserMinus, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette";
import type { Role, Section } from "@/lib/session";

const items: { href: string; label: string; icon: typeof LayoutDashboard; section: Section }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
  { href: "/estrategico", label: "Estratégico", icon: Compass, section: "estrategico" },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign, section: "financeiro" },
  { href: "/saidas", label: "Saídas", icon: UserMinus, section: "saidas" },
];

interface TopNavProps {
  session?: { name: string; role: Role; sections: Section[] } | null;
}

export function TopNav({ session }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    router.push("/login");
    router.refresh();
  }

  // Esconde nav na página de login e na aprovação pública (cliente externo)
  if (pathname === "/login" || pathname.startsWith("/aprovacao")) return null;

  const isAdmin = session?.role === "admin";
  // Admin vê tudo; demais só as seções permitidas. Sem sessão (dev sem senha) mostra tudo.
  const visible = items.filter(
    (it) => !session || isAdmin || session.sections.includes(it.section)
  );
  return (
    <header className="border-b border-[color:var(--border)] bg-[color:var(--card)] sticky top-0 z-40 backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--card)]/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold text-base transition-opacity hover:opacity-80 shrink-0"
        >
          <span className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 via-amber-400 to-rose-500 grid place-items-center shadow-sm transition-transform group-hover:scale-105 group-hover:rotate-3">
            <Lightbulb className="size-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="hidden sm:inline">Farol de Clientes</span>
        </Link>
        <nav className="flex items-center gap-1">
          {visible.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative flex items-center gap-2 px-2.5 sm:px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[color:var(--muted)] text-[color:var(--foreground)] shadow-sm"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 transition-transform",
                    active ? "scale-110" : "group-hover:scale-105"
                  )}
                />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <CommandPalette />
          {isAdmin && (
            <Link
              href="/config"
              aria-current={pathname.startsWith("/config") ? "page" : undefined}
              title="Configurações"
              className={cn(
                "size-8 rounded-lg grid place-items-center transition-colors",
                pathname.startsWith("/config")
                  ? "bg-[color:var(--muted)] text-[color:var(--foreground)]"
                  : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--muted)]/60"
              )}
            >
              <Settings className="size-4" />
            </Link>
          )}
          {session?.name && (
            <span
              className="hidden md:inline text-xs text-[color:var(--muted-foreground)] max-w-[120px] truncate"
              title={session.name}
            >
              {session.name}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors flex items-center gap-1 group"
            title="Sair"
          >
            <LogOut className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
