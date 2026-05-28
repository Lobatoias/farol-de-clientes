"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lightbulb, LayoutDashboard, Compass, DollarSign, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estrategico", label: "Estratégico", icon: Compass },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    router.push("/login");
    router.refresh();
  }

  // Esconde nav na página de login
  if (pathname === "/login") return null;
  return (
    <header className="border-b border-[color:var(--border)] bg-[color:var(--card)] sticky top-0 z-40 backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--card)]/85">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold text-base transition-opacity hover:opacity-80"
        >
          <span className="size-7 rounded-lg bg-gradient-to-br from-emerald-400 via-amber-400 to-rose-500 grid place-items-center shadow-sm transition-transform group-hover:scale-105 group-hover:rotate-3">
            <Lightbulb className="size-4 text-white" strokeWidth={2.5} />
          </span>
          Farol de Clientes
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200",
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
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[color:var(--muted-foreground)] hidden sm:block">
            MVP · v0.1
          </span>
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
