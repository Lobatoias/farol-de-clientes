"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Altura colapsada (~11 linhas). Acima disso, mostra "Ler reunião completa". */
const COLLAPSED_MAX_PX = 240;

/**
 * Corpo das notas da reunião com colapso. Reuniões longas (40+ linhas)
 * não estouram a página: mostra um trecho com fade e um botão pra expandir.
 * Notas curtas aparecem inteiras, sem botão.
 */
export function MeetingNotesContent({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Mede a altura real do conteúdo (recalcula em resize — texto reflui).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      setFullHeight(h);
      setNeedsClamp(h > COLLAPSED_MAX_PX + 24);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes]);

  const clamp = needsClamp && !expanded;
  const maxHeight = !needsClamp
    ? undefined
    : expanded
    ? `${fullHeight}px`
    : `${COLLAPSED_MAX_PX}px`;

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          className="text-sm whitespace-pre-wrap leading-relaxed text-[color:var(--foreground)] overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight }}
        >
          {notes}
        </div>
        {clamp && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[color:var(--card)] via-[color:var(--card)]/80 to-transparent pointer-events-none"
          />
        )}
      </div>
      {needsClamp && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
        >
          {expanded ? "Ler menos" : "Ler reunião completa"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      )}
    </div>
  );
}
