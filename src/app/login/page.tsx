import { Lightbulb } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { AUTH_ENABLED } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const authOn = AUTH_ENABLED;

  return (
    <div className="min-h-[80vh] grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 animate-fade-up">
        <div className="text-center space-y-3">
          <div className="size-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 via-amber-400 to-rose-500 grid place-items-center shadow-lg">
            <Lightbulb className="size-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Farol de Clientes</h1>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {authOn
              ? "Acesso restrito · entre com a senha compartilhada"
              : "Modo aberto (sem auth)"}
          </p>
        </div>

        {authOn ? (
          <LoginForm from={from} />
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-5 text-sm text-center space-y-3">
            <p>Não há senha configurada.</p>
            <a
              href={from || "/"}
              className="inline-block text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Continuar →
            </a>
          </div>
        )}

        <p className="text-[11px] text-center text-[color:var(--muted-foreground)] leading-relaxed">
          O acesso fica salvo por 30 dias. Pra sair, abra qualquer página e use o
          link de logout no canto.
        </p>
      </div>
    </div>
  );
}
