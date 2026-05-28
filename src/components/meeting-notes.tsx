import { FileText, ExternalLink, CalendarClock } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/utils";

interface MeetingNotesProps {
  notes?: string;
  lastMeetingAt?: string;
  clickupMasterUrl?: string;
}

export function MeetingNotes({ notes, lastMeetingAt, clickupMasterUrl }: MeetingNotesProps) {
  const hasNotes = !!notes && notes.trim().length > 0;

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[color:var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-blue-50 dark:bg-blue-950/40 grid place-items-center">
            <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Notas da última reunião</h3>
            <p className="text-[11px] text-[color:var(--muted-foreground)] flex items-center gap-1">
              {lastMeetingAt ? (
                <>
                  <CalendarClock className="size-3" />
                  {formatRelative(lastMeetingAt)}
                </>
              ) : (
                "Sem data registrada"
              )}
            </p>
          </div>
        </div>
        {clickupMasterUrl && (
          <Link
            href={clickupMasterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] inline-flex items-center gap-1"
          >
            Editar no ClickUp
            <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
      <div className="p-5">
        {hasNotes ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-[color:var(--foreground)]">
            {notes}
          </div>
        ) : (
          <div className="text-sm text-[color:var(--muted-foreground)] space-y-2">
            <p>Nenhuma nota registrada.</p>
            <p className="text-xs">
              Preencha o campo <strong>&quot;Notas da ultima reuniao&quot;</strong> na task mestre deste cliente no ClickUp.
              Cole o resumo do WhatsApp ou escreva direto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
