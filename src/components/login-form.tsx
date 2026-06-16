"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  from?: string;
}

export function LoginForm({ from }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Senha incorreta");
      }
      router.push(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 space-y-3 shadow-sm"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@agencia.com"
          className="w-full h-11 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <p className="text-[10px] text-[color:var(--muted-foreground)] leading-relaxed">
          Deixe em branco e use a senha mestra pra entrar como admin.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={cn(
            "w-full h-11 px-3 rounded-lg border bg-[color:var(--background)] text-sm focus:outline-none transition-all",
            error
              ? "border-rose-500 ring-1 ring-rose-500/30"
              : "border-[color:var(--border)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          )}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className={cn(
          "w-full h-11 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
          "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <LogIn className="size-4" />
            Entrar
          </>
        )}
      </button>
    </form>
  );
}
