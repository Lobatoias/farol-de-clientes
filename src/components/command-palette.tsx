"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Compass,
  DollarSign,
  UserMinus,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/status-badge";
import type { Status } from "@/lib/types";

interface ClientLite {
  id: string;
  name: string;
  status: Status;
  niche: string | null;
  owner: string | null;
}

interface PageEntry {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PAGES: PageEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estrategico", label: "Estratégico", icon: Compass },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/saidas", label: "Saídas", icon: UserMinus },
];

/** Busca acento-insensível: "vehitech" acha "VEHITECH", "joao" acha "João" */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Result =
  | { kind: "page"; page: PageEntry }
  | { kind: "client"; client: ClientLite };

const MAX_CLIENT_RESULTS = 8;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientLite[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Atalho global Ctrl+K / ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Carrega a lista lite uma vez por sessão de página
  const loadClients = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setClients(body.clients ?? []);
      setLoadError(false);
    } catch {
      fetchedRef.current = false; // permite retry na próxima abertura
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadClients();
      setQuery("");
      setActive(0);
    }
  }, [open, loadClients]);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    const pages = q
      ? PAGES.filter((p) => normalize(p.label).includes(q))
      : PAGES;
    const matchedClients = (clients ?? [])
      .filter((c) => {
        if (!q) return true;
        return (
          normalize(c.name).includes(q) ||
          (c.niche ? normalize(c.niche).includes(q) : false) ||
          (c.owner ? normalize(c.owner).includes(q) : false)
        );
      })
      .slice(0, q ? MAX_CLIENT_RESULTS : 5);
    return [
      ...pages.map((page) => ({ kind: "page" as const, page })),
      ...matchedClients.map((client) => ({ kind: "client" as const, client })),
    ];
  }, [query, clients]);

  // Mantém o item ativo dentro da área visível
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    (r: Result) => {
      setOpen(false);
      router.push(r.kind === "page" ? r.page.href : `/cliente/${r.client.id}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r);
    }
  }

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  return (
    <>
      {/* Trigger: pill de busca na nav */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 h-8 px-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--muted-foreground)]/40 transition-colors"
        aria-label="Buscar cliente (atalho Ctrl+K)"
      >
        <Search className="size-3.5" />
        <span className="text-xs hidden md:inline">Buscar</span>
        <kbd className="hidden lg:inline text-[10px] font-sans px-1.5 py-0.5 rounded border border-[color:var(--border)] bg-[color:var(--background)] tabular-nums">
          {shortcut}
        </kbd>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh] animate-fade-in"
            style={{ backdropFilter: "blur(4px)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60"
              aria-label="Fechar busca"
              tabIndex={-1}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Busca rápida"
              className="relative w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] shadow-2xl overflow-hidden animate-fade-up"
              onKeyDown={onKeyDown}
            >
              <div className="flex items-center gap-3 px-4 border-b border-[color:var(--border)]">
                <Search className="size-4 text-[color:var(--muted-foreground)] shrink-0" />
                <input
                  // autoFocus é intencional: paleta de comando sem foco no input é inútil
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Buscar cliente, nicho, CSM ou página…"
                  aria-label="Buscar cliente, nicho, CSM ou página"
                  className="w-full h-12 bg-transparent text-sm focus:outline-none placeholder:text-[color:var(--muted-foreground)]/60"
                />
              </div>

              <ul
                ref={listRef}
                role="listbox"
                aria-label="Resultados"
                className="max-h-[50vh] overflow-y-auto p-1.5"
              >
                {loadError && (
                  <li
                    role="alert"
                    className="px-3 py-4 text-xs text-rose-500 dark:text-rose-400"
                  >
                    Não consegui carregar a lista de clientes. Feche e abra a
                    busca pra tentar de novo.
                  </li>
                )}
                {!loadError && clients === null && (
                  <li className="px-3 py-2 space-y-2" aria-label="Carregando">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-8 rounded-md bg-[color:var(--muted)]/60 animate-gentle-pulse"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </li>
                )}
                {!loadError && clients !== null && results.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                    Nada encontrado pra{" "}
                    <span className="font-medium text-[color:var(--foreground)]">
                      “{query}”
                    </span>
                  </li>
                )}
                {results.map((r, i) => {
                  const isActive = i === active;
                  const key =
                    r.kind === "page" ? `p-${r.page.href}` : `c-${r.client.id}`;
                  const showHeader =
                    i === 0 ||
                    (results[i - 1] && results[i - 1].kind !== r.kind);
                  return (
                    <li key={key}>
                      {showHeader && (
                        <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[color:var(--muted-foreground)]">
                          {r.kind === "page" ? "Páginas" : "Clientes"}
                        </p>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onClick={() => go(r)}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 h-10 rounded-lg text-left text-sm transition-colors",
                          isActive
                            ? "bg-[color:var(--muted)] text-[color:var(--foreground)]"
                            : "text-[color:var(--muted-foreground)]"
                        )}
                      >
                        {r.kind === "page" ? (
                          <>
                            <r.page.icon className="size-4 shrink-0" />
                            <span className="font-medium">{r.page.label}</span>
                          </>
                        ) : (
                          <>
                            <StatusDot
                              status={r.client.status}
                              className="shrink-0"
                            />
                            <span className="font-medium text-[color:var(--foreground)] truncate">
                              {r.client.name}
                            </span>
                            <span className="ml-auto text-xs truncate max-w-[40%]">
                              {[r.client.niche, r.client.owner]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </>
                        )}
                        {isActive && (
                          <CornerDownLeft className="size-3.5 shrink-0 opacity-50" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center gap-3 px-4 h-9 border-t border-[color:var(--border)] text-[10px] text-[color:var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> navegar
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Enter</Kbd> abrir
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Esc</Kbd> fechar
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1 py-0.5 rounded border border-[color:var(--border)] bg-[color:var(--background)] font-sans">
      {children}
    </kbd>
  );
}
