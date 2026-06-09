import { cn } from "@/lib/utils";

/**
 * Primitivos de skeleton pros loading.tsx de cada rota.
 * Aparecem INSTANTANEAMENTE na troca de aba (App Router) enquanto o
 * servidor busca os dados — feedback <400ms (Doherty threshold).
 */

export function Sk({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[color:var(--muted)] animate-gentle-pulse",
        className
      )}
    />
  );
}

export function SkCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-3",
        className
      )}
    >
      <Sk className="h-3 w-1/3" />
      <Sk className="h-8 w-1/2" />
      <Sk className="h-3 w-2/3" />
    </div>
  );
}

/** Cabeçalho de página: título + subtítulo */
export function SkPageHeader() {
  return (
    <div className="space-y-2">
      <Sk className="h-7 w-48" />
      <Sk className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Grade de KPIs (4 colunas no desktop) */
export function SkKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SkCard key={i} />
      ))}
    </div>
  );
}

/** Grade de cards de cliente */
export function SkClientGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 space-y-3"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <Sk className="h-4 w-2/5" />
            <Sk className="h-5 w-16 rounded-full" />
          </div>
          <Sk className="h-3 w-3/5" />
          <Sk className="h-3 w-4/5" />
          <Sk className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Bloco grande (tabela/seção) */
export function SkSection({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 space-y-3",
        className
      )}
    >
      <Sk className="h-4 w-40" />
      <Sk className="h-3 w-full" />
      <Sk className="h-3 w-11/12" />
      <Sk className="h-3 w-4/5" />
      <Sk className="h-3 w-2/3" />
    </div>
  );
}
