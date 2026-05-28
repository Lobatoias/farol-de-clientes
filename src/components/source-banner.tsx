import Link from "next/link";
import { Database, FlaskConical, Lightbulb } from "lucide-react";

interface SourceBannerProps {
  source: "clickup" | "mock";
  count: number;
}

export function SourceBanner({ source, count }: SourceBannerProps) {
  if (source === "clickup") {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 w-fit">
        <Database className="size-3.5" />
        <span>
          Lendo do ClickUp · <strong>{count}</strong> clientes
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 text-xs px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
      <FlaskConical className="size-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Modo demo · dados mockados ({count} clientes fictícios)</p>
        <p className="opacity-80 mt-0.5">
          Para conectar seu ClickUp real, configure <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">CLICKUP_API_TOKEN</code> em <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.env.local</code> e reinicie o servidor.{" "}
          <Link href="/setup" className="underline font-medium hover:no-underline">
            Ver instruções
          </Link>
        </p>
      </div>
    </div>
  );
}
