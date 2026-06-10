"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ImagePlus, Save } from "lucide-react";
import type { CreativeFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreativeDialogProps {
  open: boolean;
  onClose: () => void;
  niche: string;
}

const FORMAT_LABEL: Record<CreativeFormat, string> = {
  video: "Vídeo",
  image: "Estático",
  carousel: "Carrossel",
};

/** Cadastro manual de uma referência na biblioteca do nicho. */
export function CreativeDialog({ open, onClose, niche }: CreativeDialogProps) {
  const router = useRouter();
  const [advertiser, setAdvertiser] = useState("");
  const [format, setFormat] = useState<CreativeFormat>("video");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [firstSeenAt, setFirstSeenAt] = useState("");
  const [variantCount, setVariantCount] = useState("1");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setAdvertiser("");
    setFormat("video");
    setThumbnailUrl("");
    setOriginalUrl("");
    setFirstSeenAt("");
    setVariantCount("1");
    setCaption("");
    setError(null);
  }, [open]);

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
    if (!thumbnailUrl.trim() && !originalUrl.trim()) {
      setError("Informe ao menos a imagem ou o link do anúncio");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (firstSeenAt && firstSeenAt > today) {
      setError("Início de veiculação não pode ser no futuro");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/creatives", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            niche,
            advertiser: advertiser.trim() || undefined,
            format,
            thumbnailUrl: thumbnailUrl.trim() || undefined,
            originalUrl: originalUrl.trim() || undefined,
            firstSeenAt: firstSeenAt || undefined,
            variantCount: Number(variantCount) || 1,
            caption: caption.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
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
        className="relative bg-[color:var(--card-elevated)] border border-[color:var(--border)] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fade-up max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="creative-dialog-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold">
              Biblioteca · {niche}
            </p>
            <h2 id="creative-dialog-title" className="text-lg font-bold tracking-tight">
              Adicionar referência
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

        <div className="space-y-4">
          <Field label="Imagem / thumbnail (URL)" hint="Cole o link de uma imagem ou print do criativo.">
            <div className="relative">
              <ImagePlus className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </div>
            {thumbnailUrl && (
              <div className="mt-2 rounded-lg border border-[color:var(--border)] overflow-hidden aspect-[16/10] bg-[color:var(--muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
          </Field>

          <Field label="Link do anúncio (Ad Library)" hint="Mantém a referência ao original.">
            <input
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://www.facebook.com/ads/library/..."
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Anunciante">
              <input
                type="text"
                value={advertiser}
                onChange={(e) => setAdvertiser(e.target.value)}
                placeholder="Marca / concorrente"
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </Field>
            <Field label="Formato">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CreativeFormat)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              >
                {(Object.keys(FORMAT_LABEL) as CreativeFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="No ar desde" hint="Vira o sinal 'dias no ar'.">
              <input
                type="date"
                value={firstSeenAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFirstSeenAt(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </Field>
            <Field label="Nº de variantes" hint="Anúncios usando o criativo.">
              <input
                type="number"
                min={1}
                value={variantCount}
                onChange={(e) => setVariantCount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60"
              />
            </Field>
          </div>

          <Field label="Legenda / copy do anúncio">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="O texto que acompanha o criativo…"
              className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 resize-none"
            />
          </Field>

          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              ⚠️ {error}
            </p>
          )}
        </div>

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
            disabled={pending}
            className={cn(
              "text-xs font-medium px-4 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            )}
          >
            <Save className="size-3" />
            {pending ? "Salvando…" : "Adicionar"}
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
