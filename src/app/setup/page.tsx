import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Database,
  KeyRound,
  FileJson,
} from "lucide-react";
import { isUsingMockData } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const connected = !isUsingMockData();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors animate-fade-in"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Voltar ao dashboard
      </Link>

      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">Conectar ao ClickUp</h1>
        <p className="text-sm text-[color:var(--muted-foreground)] mt-2 max-w-2xl">
          Em 3 passos você troca os dados mockados pelos seus clientes reais do ClickUp.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-5 flex items-center gap-4 transition-all hover:shadow-md animate-fade-up stagger-1 ${
          connected
            ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20"
            : "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20"
        }`}
      >
        {connected ? (
          <>
            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Conectado ao ClickUp</p>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                O app está lendo dos seus clientes reais.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 grid place-items-center">
              <Circle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Modo demo · dados mockados</p>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                Siga os passos abaixo para conectar seus dados reais.
              </p>
            </div>
          </>
        )}
      </div>

      <Step
        number={1}
        icon={<KeyRound className="size-4" />}
        title="Gere um Personal API Token no ClickUp"
        delay="stagger-2"
      >
        <ol className="list-decimal pl-5 text-sm space-y-1.5 text-[color:var(--muted-foreground)]">
          <li>Abra o ClickUp e clique no seu avatar (canto inferior esquerdo)</li>
          <li>Vá em <strong className="text-[color:var(--foreground)]">Settings → Apps</strong></li>
          <li>
            Em <strong className="text-[color:var(--foreground)]">API Token</strong>, clique{" "}
            <strong className="text-[color:var(--foreground)]">Generate</strong> (ou copie o existente)
          </li>
          <li>
            Copie o valor (começa com{" "}
            <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">pk_...</code>)
          </li>
        </ol>
      </Step>

      <Step
        number={2}
        icon={<FileJson className="size-4" />}
        title="Crie .env.local na raiz do projeto"
        delay="stagger-3"
      >
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Há um arquivo{" "}
          <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">.env.local.example</code> na raiz.
          Copie para{" "}
          <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">.env.local</code> e cole o token:
        </p>
        <pre className="mt-3 p-4 rounded-xl bg-[color:var(--muted)] text-xs overflow-x-auto font-mono">
{`CLICKUP_API_TOKEN=pk_seu_token_aqui
CLICKUP_WORKSPACE_ID=9011315823
CLICKUP_MASTER_LIST_ID=901112849675
CLICKUP_OPERATIONAL_SPACE_ID=90114158210`}
        </pre>
        <p className="text-[11px] text-[color:var(--muted-foreground)] mt-2">
          Os defaults de workspace, master list e operational space já são os da Vela Latina.
        </p>
      </Step>

      <Step
        number={3}
        icon={<Database className="size-4" />}
        title="(Opcional) Preencha dados financeiros locais"
        delay="stagger-4"
      >
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Mensalidade do cliente e datas de contrato ficam fora do ClickUp (dado sensível). Acesse{" "}
          <Link
            href="/financeiro"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            /financeiro
          </Link>{" "}
          pra editar inline — salva em{" "}
          <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">
            data/financials.local.json
          </code>{" "}
          (gitignored).
        </p>
      </Step>

      <Step
        number={4}
        icon={<CheckCircle2 className="size-4" />}
        title="Reinicie o dev/build"
        delay="stagger-5"
      >
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Variáveis de{" "}
          <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">.env.local</code> só
          carregam na inicialização. Em produção:{" "}
          <code className="text-xs bg-[color:var(--muted)] px-1.5 py-0.5 rounded">npm run build && npm start</code>.
        </p>
      </Step>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  delay,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:shadow-md animate-fade-up ${delay}`}
    >
      <header className="flex items-center gap-3 mb-4">
        <span className="size-8 rounded-full bg-[color:var(--muted)] grid place-items-center text-sm font-bold tabular-nums">
          {number}
        </span>
        <div className="flex items-center gap-2 text-[color:var(--muted-foreground)]">
          {icon}
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      <div className="pl-11">{children}</div>
    </section>
  );
}
