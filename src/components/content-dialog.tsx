"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Image as ImageIcon, Save } from "lucide-react";
import {
  CONTENT_KINDS,
  CONTENT_KIND_LABEL,
  type Content,
  type ContentKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface ContentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Cliente dono do conteúdo (ClickUp task_id) */
  taskId: string;
  /** Quando editando: existing content. Quando criando: undefined. */
  editing?: Content;
}

export function ContentDialog({
  open,
  onClose,
  taskId,
  editing,
}: ContentDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContentKind>("post");
  const [scheduledAt, setScheduledAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Resetar/pré-popular ao abrir
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setKind(editing.kind);
      setScheduledAt(editing.scheduledAt ?? "");
      setImageUrl(editing.imageUrl ?? "");
      setCaption(editing.caption ?? "");
    } else {
      setTitle("");
      setKind("post");
      setScheduledAt("");
      setImageUrl("");
      setCaption("");
    }
    setError(null);
  }, [open, editing]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function submit() {
    if (pending) return;
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          taskId,
          title: title.trim(),
          kind,
          scheduledAt: scheduledAt || undefined,
          imageUrl: imageUrl.trim() || undefined,
          caption: caption.trim() || undefined,
        };

        const url = editing
          ? `/api/contents/${editing.id}`
          : `/api/contents`;
        const method = editing ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar");
      }
    });
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 animate-fade-in"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar"
      />
      <div
        className={cn(
          "relative bg-[color:var(--card-elevated)] border border-[color:var(--border)] rounded-2xl shadow-2xl",
          "w-full max-w-2xl p-6 space-y-5 animate-fade-up max-h-[92vh] overflow-y-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              {editing ? "Editar conteúdo" : "Novo conteúdo"}
            </p>
            <h2
              id="content-dialog-title"
              className="text-lg font-bold tracking-tight"
            >
              {editing ? editing.title : "Criar publicação"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-md hover:bg-[color:var(--muted)] grid place-items-center text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Título */}
          <Field label="Título *">
            <input
              // Foco inicial no primeiro campo do form (a11y)
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ex: Cuidando da sua coluna no dia a dia"
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
            />
          </Field>

          {/* Tipo + Data lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Tipo *">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ContentKind)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              >
                {CONTENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CONTENT_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data prevista">
              <input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </Field>
          </div>

          {/* URL da imagem */}
          <Field
            label="URL da imagem / vídeo"
            hint="Cole o link público (Drive, Dropbox, S3, CDN). O cliente vê esse preview na hora de aprovar."
          >
            <div className="space-y-2">
              <div className="relative">
                <ImageIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={1000}
                  placeholder="https://drive.google.com/..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
                />
              </div>
              {imageUrl && (
                <div className="rounded-lg border border-[color:var(--border)] overflow-hidden aspect-[16/10] bg-[color:var(--muted)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </Field>

          {/* Caption */}
          <Field label="Legenda / Texto do post">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="O texto que vai com o post…"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 resize-none"
            />
            <p className="text-[10px] text-[color:var(--muted-foreground)] text-right mt-1">
              {caption.length}/5000
            </p>
          </Field>

          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-xs font-medium px-3 h-9 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !title.trim()}
            className="text-xs font-medium px-4 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Save className="size-3" />
            {pending ? "Salvando…" : editing ? "Salvar alterações" : "Criar conteúdo"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold block">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-[color:var(--muted-foreground)] leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
