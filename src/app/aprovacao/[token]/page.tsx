import { notFound } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { getContentByToken } from "@/lib/contents";
import { CONTENT_KIND_LABEL, CONTENT_STATUS_LABEL } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { PublicApprovalForm } from "@/components/public-approval-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicApprovalPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || !/^[0-9a-f]{32}$/.test(token)) notFound();

  const content = await getContentByToken(token);
  if (!content) notFound();

  const expired = content.shareExpiresAt
    ? new Date(content.shareExpiresAt).getTime() < Date.now()
    : false;

  if (expired) {
    return (
      <CenteredPanel>
        <h1 className="text-2xl font-bold tracking-tight">Link expirado</h1>
        <p className="text-sm text-[color:var(--muted-foreground)] mt-2">
          Esse link de aprovação não está mais ativo. Peça à equipe pra te
          enviar um novo.
        </p>
      </CenteredPanel>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 animate-fade-up">
          <div className="inline-flex items-center gap-2 mx-auto">
            <span className="size-8 rounded-lg bg-gradient-to-br from-emerald-400 via-amber-400 to-rose-500 grid place-items-center shadow-sm">
              <Lightbulb className="size-4 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Farol de Clientes
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight pt-2">
            Aprove ou peça alteração
          </h1>
          <p className="text-sm text-[color:var(--muted-foreground)] max-w-lg mx-auto leading-relaxed">
            A equipe preparou esse conteúdo pra você revisar. Confira abaixo e
            escolha aprovar ou solicitar alteração.
          </p>
        </header>

        {/* Card de conteúdo */}
        <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] overflow-hidden shadow-md animate-fade-up stagger-1">
          {/* Preview */}
          {content.imageUrl ? (
            <div className="relative aspect-[16/10] bg-[color:var(--muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.imageUrl}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-[color:var(--muted)] grid place-items-center text-[color:var(--muted-foreground)]">
              Sem imagem
            </div>
          )}

          {/* Conteúdo */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wide font-medium">
              <span className="px-2.5 py-0.5 rounded-full bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
                {CONTENT_KIND_LABEL[content.kind]}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                {CONTENT_STATUS_LABEL[content.status]}
              </span>
              {content.scheduledAt && (
                <span className="text-[color:var(--muted-foreground)] normal-case">
                  Previsão: {formatDate(content.scheduledAt)}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight">{content.title}</h2>

            {content.caption && (
              <div className="rounded-xl bg-[color:var(--background)] border border-[color:var(--border)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted-foreground)] font-semibold mb-2">
                  Legenda do post
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {content.caption}
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Ações de decisão (client component) */}
        <div className="animate-fade-up stagger-2">
          <PublicApprovalForm
            token={token}
            initialDecision={content.clientDecision ?? null}
            initialComment={content.clientComment ?? null}
            status={content.status}
          />
        </div>

        {/* Rodapé */}
        <p className="text-center text-[10px] text-[color:var(--muted-foreground)] pt-4">
          Esse link é privado e expira após 30 dias.
        </p>
      </div>
    </div>
  );
}

function CenteredPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-elevated)] p-8 max-w-md text-center">
        {children}
      </div>
    </div>
  );
}
