"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Flame,
  Layers,
  Star,
  Trash2,
  ExternalLink,
  Video,
  Image as ImageIcon,
  GalleryHorizontalEnd,
  Loader2,
} from "lucide-react";
import type { CreativeRef, CreativeFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreativeDialog } from "@/components/creative-dialog";

interface CreativesSectionProps {
  clientName: string;
  niche?: string;
  initialCreatives: CreativeRef[];
}

const FORMAT_ICON: Record<CreativeFormat, typeof Video> = {
  video: Video,
  image: ImageIcon,
  carousel: GalleryHorizontalEnd,
};

const FORMAT_LABEL: Record<CreativeFormat, string> = {
  video: "Vídeo",
  image: "Estático",
  carousel: "Carrossel",
};

/** Quanto tempo no ar comunica em texto curto. */
function runningLabel(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}a no ar`;
  if (days >= 60) return `${Math.floor(days / 30)} meses no ar`;
  if (days >= 30) return "1 mês no ar";
  return `${days}d no ar`;
}

export function CreativesSection({
  clientName,
  niche,
  initialCreatives,
}: CreativesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function star(c: CreativeRef) {
    if (busyId) return;
    setBusyId(c.id);
    try {
      await fetch(`/api/creatives/${c.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starred: !c.starred }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: CreativeRef) {
    if (busyId) return;
    if (!confirm("Remover esta referência da biblioteca?")) return;
    setBusyId(c.id);
    try {
      await fetch(`/api/creatives/${c.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 grid place-items-center">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Biblioteca de criativos
            </h2>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Swipe file do nicho{" "}
              {niche ? (
                <span className="font-medium text-[color:var(--foreground)]">
                  {niche}
                </span>
              ) : (
                "deste cliente"
              )}{" "}
              · roube como um artista
            </p>
          </div>
        </div>
        {niche && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 h-9 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
            Adicionar referência
          </button>
        )}
      </div>

      {!niche ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center space-y-2">
          <p className="text-sm font-medium">Cliente sem nicho definido</p>
          <p className="text-xs text-[color:var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
            Defina o nicho de {clientName} no ClickUp pra organizar a biblioteca
            de criativos por nicho.
          </p>
        </div>
      ) : initialCreatives.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-[color:var(--muted)] grid place-items-center mx-auto">
            <Sparkles className="size-5 text-[color:var(--muted-foreground)]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Biblioteca vazia</p>
            <p className="text-xs text-[color:var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
              Adicione referências de criativos campeões do nicho {niche} —
              quanto mais tempo no ar e mais variantes, mais comprovado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
          >
            <Plus className="size-3.5" />
            Adicionar a primeira
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialCreatives.map((c) => {
            const Fmt = c.format ? FORMAT_ICON[c.format] : ImageIcon;
            const busy = busyId === c.id;
            return (
              <article
                key={c.id}
                className={cn(
                  "rounded-2xl border bg-[color:var(--card-elevated)] overflow-hidden flex flex-col transition-all hover:shadow-md",
                  c.starred
                    ? "border-amber-300 dark:border-amber-800"
                    : "border-[color:var(--border)]"
                )}
              >
                <div className="relative aspect-[16/10] bg-[color:var(--muted)] overflow-hidden">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt={c.advertiser ?? "Criativo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <Fmt className="size-7 text-[color:var(--muted-foreground)]/40" />
                    </div>
                  )}
                  {c.format && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-black/60 text-white">
                      <Fmt className="size-3" />
                      {FORMAT_LABEL[c.format]}
                    </span>
                  )}
                  {/* Sinais de ouro */}
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                    {typeof c.daysRunning === "number" && c.daysRunning >= 30 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-600 text-white"
                        title="Tempo no ar — quanto mais, mais comprovado"
                      >
                        <Flame className="size-3" />
                        {runningLabel(c.daysRunning)}
                      </span>
                    )}
                    {c.variantCount > 1 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-600 text-white"
                        title="Nº de anúncios usando o criativo — sinal de escala"
                      >
                        <Layers className="size-3" />
                        {c.variantCount} variantes
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  {c.advertiser && (
                    <p className="text-sm font-semibold leading-tight truncate">
                      {c.advertiser}
                    </p>
                  )}
                  {c.caption && (
                    <p className="text-xs text-[color:var(--muted-foreground)] leading-relaxed line-clamp-2">
                      {c.caption}
                    </p>
                  )}
                  <div className="pt-2 mt-auto border-t border-[color:var(--border)] flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => star(c)}
                      disabled={busy}
                      aria-label={c.starred ? "Desfavoritar" : "Favoritar"}
                      title={c.starred ? "Desfavoritar" : "Favoritar"}
                      className={cn(
                        "size-7 rounded-md grid place-items-center transition-colors",
                        c.starred
                          ? "text-amber-500"
                          : "text-[color:var(--muted-foreground)] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      )}
                    >
                      <Star className={cn("size-3.5", c.starred && "fill-current")} />
                    </button>
                    {c.originalUrl && (
                      <a
                        href={c.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
                      >
                        <ExternalLink className="size-3" />
                        Original
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={busy}
                      aria-label="Remover referência"
                      title="Remover"
                      className="size-7 rounded-md grid place-items-center text-[color:var(--muted-foreground)] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-auto"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {niche && (
        <CreativeDialog open={open} onClose={() => setOpen(false)} niche={niche} />
      )}
    </section>
  );
}
