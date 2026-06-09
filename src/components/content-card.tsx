"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Pencil,
  Send,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Trash2,
  Copy,
  MessageSquareWarning,
  RotateCcw,
  Megaphone,
  Film,
  Layers,
  Newspaper,
  Camera,
  Sparkles,
} from "lucide-react";
import {
  CONTENT_KIND_LABEL,
  CONTENT_STATUS_LABEL,
  type Content,
  type ContentKind,
  type ContentStatus,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface ContentCardProps {
  content: Content;
  onEdit: () => void;
}

const KIND_ICON: Record<ContentKind, React.ComponentType<{ className?: string }>> = {
  post: Newspaper,
  reel: Film,
  story: Camera,
  ad: Megaphone,
  carousel: Layers,
};

const STATUS_STYLE: Record<
  ContentStatus,
  {
    badge: string;
    accent: string;
  }
> = {
  em_producao: {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-amber-200 dark:ring-amber-900",
    accent: "border-l-amber-500",
  },
  aguardando_aprovacao: {
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-blue-200 dark:ring-blue-900",
    accent: "border-l-blue-500",
  },
  agendado: {
    badge:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 ring-violet-200 dark:ring-violet-900",
    accent: "border-l-violet-500",
  },
  publicado: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900",
    accent: "border-l-emerald-500",
  },
};

export function ContentCard({ content, onEdit }: ContentCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copyOK, setCopyOK] = useState(false);
  const KindIcon = KIND_ICON[content.kind] ?? Newspaper;
  const style = STATUS_STYLE[content.status];

  function call(url: string, method = "POST") {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch(url, { method });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setError(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha");
      }
    });
  }

  function destroy() {
    if (pending) return;
    if (!confirm(`Apagar "${content.title}"? Esta ação não pode ser desfeita.`))
      return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/contents/${content.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha");
      }
    });
  }

  async function copyApprovalLink() {
    if (!content.shareToken) return;
    const url = `${window.location.origin}/aprovacao/${content.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyOK(true);
      setTimeout(() => setCopyOK(false), 2000);
    } catch {
      // Fallback quando a Clipboard API está bloqueada (http, permissões)
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
        setCopyOK(true);
        setTimeout(() => setCopyOK(false), 2000);
      } finally {
        el.remove();
      }
    }
  }

  const hasClientComment =
    content.clientDecision === "rejected" && !!content.clientComment;

  return (
    <article
      className={cn(
        "rounded-2xl border border-[color:var(--border)] border-l-4 bg-[color:var(--card-elevated)] overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col",
        style.accent
      )}
    >
      {/* Preview da imagem */}
      <div className="relative aspect-[16/10] bg-[color:var(--muted)] overflow-hidden">
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.imageUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <ImageIcon className="size-8 text-[color:var(--muted-foreground)]/40" />
          </div>
        )}
        {/* Badge de status */}
        <span
          className={cn(
            "absolute top-3 left-3 text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full ring-1 ring-inset font-medium",
            style.badge
          )}
        >
          {CONTENT_STATUS_LABEL[content.status]}
        </span>
        {/* Badge do tipo */}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-black/60 text-white">
          <KindIcon className="size-3" />
          {CONTENT_KIND_LABEL[content.kind]}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
          {content.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
          <Calendar className="size-3" />
          {content.scheduledAt ? (
            <span>{formatDate(content.scheduledAt)}</span>
          ) : (
            <span>Sem data</span>
          )}
        </div>

        {/* Comentário do cliente quando há rejeição */}
        {hasClientComment && (
          <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold mb-1">
              <MessageSquareWarning className="size-3" />
              Cliente solicitou alteração
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
              {content.clientComment}
            </p>
          </div>
        )}

        {/* Ações por status */}
        <div className="pt-3 mt-auto border-t border-[color:var(--border)] flex flex-wrap gap-1.5">
          {content.status === "em_producao" && (
            <>
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
              >
                <Pencil className="size-3" />
                Editar
              </button>
              <button
                type="button"
                onClick={() =>
                  call(`/api/contents/${content.id}/request-approval`)
                }
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Send className="size-3" />
                Solicitar aprovação
              </button>
            </>
          )}

          {content.status === "aguardando_aprovacao" && (
            <>
              <button
                type="button"
                onClick={copyApprovalLink}
                disabled={pending}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md transition-colors",
                  copyOK
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {copyOK ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    Copiar link
                  </>
                )}
              </button>
              {content.shareToken && (
                <a
                  href={`/aprovacao/${content.shareToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Preview
                </a>
              )}
              <button
                type="button"
                onClick={() =>
                  call(`/api/contents/${content.id}/return-to-production`)
                }
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors text-[color:var(--muted-foreground)]"
                title="Voltar pra produção"
                aria-label="Voltar pra produção"
              >
                <RotateCcw className="size-3" />
              </button>
            </>
          )}

          {content.status === "agendado" && (
            <>
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
              >
                <Pencil className="size-3" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => call(`/api/contents/${content.id}/publish`)}
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Sparkles className="size-3" />
                Marcar publicado
              </button>
            </>
          )}

          {content.status === "publicado" && (
            <span className="text-[11px] text-[color:var(--muted-foreground)] inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              Conteúdo publicado
            </span>
          )}

          <button
            type="button"
            onClick={destroy}
            disabled={pending}
            className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 text-[color:var(--muted-foreground)] transition-colors ml-auto"
            title="Apagar"
            aria-label="Apagar conteúdo"
          >
            <Trash2 className="size-3" />
          </button>
        </div>

        {error && (
          <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
            ⚠️ {error}
          </p>
        )}
      </div>
    </article>
  );
}
