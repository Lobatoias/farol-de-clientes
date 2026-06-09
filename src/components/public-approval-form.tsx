"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, ThumbsUp, MessageSquare } from "lucide-react";
import type { ClientDecision, ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PublicApprovalFormProps {
  token: string;
  initialDecision: ClientDecision | null;
  initialComment: string | null;
  status: ContentStatus;
}

export function PublicApprovalForm({
  token,
  initialDecision,
  initialComment,
  status,
}: PublicApprovalFormProps) {
  const [decision, setDecision] = useState<ClientDecision | null>(
    initialDecision
  );
  const [comment, setComment] = useState(initialComment ?? "");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<"approved" | "rejected" | null>(null);

  function submit(d: ClientDecision) {
    if (pending) return;
    if (d === "rejected" && !comment.trim()) {
      setError("Por favor escreva qual alteração quer.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/public/approval/${token}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: d,
            comment: d === "rejected" ? comment.trim() : undefined,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setError(null);
        setSuccess(d);
        setDecision(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao enviar");
      }
    });
  }

  // Se já decidiu antes OU acabou de decidir agora — mostra confirmação
  if (success || decision !== null) {
    const final = success ?? decision;
    return (
      <div
        className={cn(
          "rounded-2xl border-2 p-6 text-center space-y-3",
          final === "approved"
            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30"
            : "border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30"
        )}
      >
        <div className="flex justify-center">
          {final === "approved" ? (
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <MessageSquare className="size-10 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <h3
          className={cn(
            "text-lg font-bold",
            final === "approved"
              ? "text-emerald-900 dark:text-emerald-100"
              : "text-amber-900 dark:text-amber-100"
          )}
        >
          {final === "approved"
            ? "Conteúdo aprovado!"
            : "Sugestão enviada"}
        </h3>
        <p
          className={cn(
            "text-sm",
            final === "approved"
              ? "text-emerald-800/80 dark:text-emerald-200/80"
              : "text-amber-800/80 dark:text-amber-200/80"
          )}
        >
          {final === "approved"
            ? "A equipe foi notificada e o conteúdo segue pra agendamento."
            : "A equipe foi notificada da sua sugestão e vai ajustar o conteúdo."}
        </p>
        {final === "rejected" && comment && (
          <div className="rounded-xl bg-white/60 dark:bg-black/30 p-3 mt-3 text-left">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300 mb-1">
              Sua sugestão
            </p>
            <p className="text-sm whitespace-pre-wrap text-amber-900 dark:text-amber-100">
              {comment}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Se o status NÃO é "aguardando_aprovacao", mostra estado informativo
  if (status !== "aguardando_aprovacao") {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Esse conteúdo não está mais aguardando aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-6 space-y-4">
      {!showRejectForm ? (
        <>
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold">Como prefere seguir?</h3>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Você pode aprovar agora ou escrever uma sugestão de alteração.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => submit("approved")}
              disabled={pending}
              className="h-12 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <ThumbsUp className="size-4" />
              {pending ? "Aprovando…" : "Aprovar"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              disabled={pending}
              className="h-12 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-medium hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <MessageSquare className="size-4" />
              Solicitar alteração
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">
              O que precisa ser alterado?
            </h3>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Escreva o que você gostaria de mudar. A equipe ajusta e te envia
              de novo.
            </p>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Ex: Mudar a imagem pra outra do gabinete · Caption muito formal, deixar mais leve · Trocar a data..."
            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 resize-none"
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              disabled={pending}
              className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={() => submit("rejected")}
              disabled={pending || !comment.trim()}
              className="h-10 px-4 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <MessageSquare className="size-4" />
              {pending ? "Enviando…" : "Enviar sugestão"}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-900 dark:text-rose-200">{error}</p>
        </div>
      )}
    </div>
  );
}
