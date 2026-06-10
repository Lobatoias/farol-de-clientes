"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Send, Trash2, Loader2 } from "lucide-react";
import type { ClientNote } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

interface InternalNotesProps {
  clientId: string;
  initialNotes: ClientNote[];
}

/**
 * Notas internas do time — anotação rápida por cliente, NÃO vai pro cliente.
 * Ex.: "Paulo liga amanhã". Persiste no Supabase, visível pra todo o time.
 */
export function InternalNotes({ clientId, initialNotes }: InternalNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/client-notes/${clientId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.note) setNotes((n) => [data.note, ...n]);
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/client-notes/note/${id}?taskId=${clientId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setNotes((n) => n.filter((x) => x.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao apagar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-md bg-amber-50 dark:bg-amber-950/40 grid place-items-center">
          <StickyNote className="size-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Notas internas</h3>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            Só o time vê — não vai pro cliente
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
          }}
          rows={2}
          maxLength={2000}
          placeholder="Anote algo rápido… (ex: Paulo liga amanhã)"
          aria-label="Nova nota interna"
          className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 resize-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || saving}
          aria-label="Adicionar nota"
          className="size-10 shrink-0 rounded-lg bg-blue-600 text-white grid place-items-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          ⚠️ {error}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)] py-2">
          Sem notas ainda. A primeira anotação aparece aqui.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {note.body}
                </p>
                <p className="text-[10px] text-[color:var(--muted-foreground)] mt-1">
                  {formatRelative(note.createdAt)}
                  {note.author ? ` · ${note.author}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(note.id)}
                disabled={deletingId === note.id}
                aria-label="Apagar nota"
                className={cn(
                  "size-7 shrink-0 rounded-md grid place-items-center text-[color:var(--muted-foreground)] transition-colors",
                  "hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400",
                  "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                )}
              >
                {deletingId === note.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
