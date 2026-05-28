import type { AIClientAnalysis, AIInsight, Client } from "./types";
import { daysAgo, formatBRL } from "./utils";

// Mock de respostas de IA — em produção isso chama a API da Anthropic.
// Mantemos os mocks plausíveis para validar UX antes de plugar a API.

export function getStrategicInsights(clients: Client[]): AIInsight[] {
  const reds = clients.filter((c) => c.status === "vermelho");
  const yellows = clients.filter((c) => c.status === "amarelo");

  const insights: AIInsight[] = [];

  // Padrão: clientes com custo em alta + margem apertada
  const marginPressure = clients.filter((c) => c.margin < 0.2 && c.status !== "verde");
  if (marginPressure.length >= 3) {
    insights.push({
      id: "insight-margin",
      type: "padrao",
      title: `${marginPressure.length} clientes com margem abaixo de 20%`,
      body: `Identifiquei um padrão de margem comprimida em ${marginPressure.length} contas — todas com custo de servir crescendo mais rápido que MRR. Concentre revisão de escopo nesses contratos antes da próxima renovação.`,
      affectedClientIds: marginPressure.map((c) => c.id),
      confidence: "alta",
      generatedAt: new Date().toISOString(),
    });
  }

  // Padrão: vermelhos sem contato recente
  const stale = reds.filter((c) => c.lastMeetingAt && daysAgo(c.lastMeetingAt) > 14);
  if (stale.length >= 2) {
    insights.push({
      id: "insight-stale-reds",
      type: "alerta-degradacao",
      title: `${stale.length} clientes críticos sem contato há +14 dias`,
      body: `Clientes em status vermelho sem reunião recente têm 3x mais chance de churn no trimestre. Sugiro priorizar contato direto com ${stale.slice(0, 2).map((c) => c.name).join(" e ")} ainda esta semana.`,
      affectedClientIds: stale.map((c) => c.id),
      confidence: "alta",
      generatedAt: new Date().toISOString(),
    });
  }

  // Prioridade: top 3 contas em risco por MRR
  const topRisk = [...reds, ...yellows]
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 3);
  if (topRisk.length > 0) {
    insights.push({
      id: "insight-top-risk",
      type: "prioridade",
      title: "Top 3 contas em risco por receita",
      body: `Por impacto financeiro, priorize esta semana: ${topRisk.map((c) => `${c.name} (${formatBRL(c.mrr)} MRR, ${c.status})`).join(", ")}. Juntas representam ${formatBRL(topRisk.reduce((s, c) => s + c.mrr, 0))} em MRR exposto.`,
      affectedClientIds: topRisk.map((c) => c.id),
      confidence: "alta",
      generatedAt: new Date().toISOString(),
    });
  }

  // Alerta de degradação recente
  const recentlyDegraded = clients.filter(
    (c) => c.previousStatus && c.previousStatus !== c.status && daysAgo(c.statusChangedAt) <= 14
  );
  if (recentlyDegraded.length >= 2) {
    insights.push({
      id: "insight-degradation",
      type: "alerta-degradacao",
      title: `${recentlyDegraded.length} clientes degradaram nos últimos 14 dias`,
      body: `Vejo aceleração de degradação: ${recentlyDegraded.length} mudanças de status para pior em 2 semanas. Pode indicar problema sistêmico — vale investigar se há causa comum (release recente, mudança de processo, etc.).`,
      affectedClientIds: recentlyDegraded.map((c) => c.id),
      confidence: "media",
      generatedAt: new Date().toISOString(),
    });
  }

  return insights;
}

export function getClientAnalysis(client: Client): AIClientAnalysis {
  const lastMeetingDaysAgo = client.lastMeetingAt ? daysAgo(client.lastMeetingAt) : null;

  const briefing =
    client.status === "verde"
      ? `${client.name} (${client.segment}) está saudável. MRR de ${formatBRL(client.mrr)}, margem de ${Math.round(client.margin * 100)}%. Sob gestão de ${client.owner}, com ritmo regular de acompanhamento. NPS ${client.nps}.`
      : client.status === "amarelo"
      ? `${client.name} (${client.segment}) entrou em atenção há ${daysAgo(client.statusChangedAt)} dias. MRR de ${formatBRL(client.mrr)} com margem de ${Math.round(client.margin * 100)}% (pressão de custo). ${client.openTickets} ticket(s) aberto(s). Última reunião há ${lastMeetingDaysAgo} dias.`
      : `${client.name} (${client.segment}) está em situação crítica. MRR exposto: ${formatBRL(client.mrr)}. Margem em ${Math.round(client.margin * 100)}% — operação no vermelho. ${client.openTickets} ticket(s) ativos. Última reunião há ${lastMeetingDaysAgo} dias. Risco de churn real.`;

  const whyStatus =
    client.status === "verde"
      ? `Indicadores positivos: NPS ${client.nps}, margem ${Math.round(client.margin * 100)}%, último contato recente. Nenhum sinal de risco material.`
      : client.status === "amarelo"
      ? `Sinais detectados: ${client.riskTags.map((t) => `\`${t}\``).join(", ")}. Combinação sugere desengajamento inicial — ainda recuperável com ação rápida.`
      : `Risco crítico por: ${client.riskTags.map((t) => `\`${t}\``).join(", ")}. Padrão consistente com clientes que churnaram nos últimos 6 meses.`;

  const suggestedActions =
    client.status === "verde"
      ? [
          {
            title: "Manter cadência atual",
            rationale: "Cliente saudável. Não interromper ritmo que está funcionando.",
            impact: "baixo" as const,
          },
          {
            title: "Avaliar oportunidade de expansão",
            rationale: `Com margem em ${Math.round(client.margin * 100)}% e NPS ${client.nps}, há espaço para upsell. Trazer cases similares.`,
            impact: "medio" as const,
          },
        ]
      : client.status === "amarelo"
      ? [
          {
            title: "Reunião extraordinária em até 7 dias",
            rationale: `Última reunião há ${lastMeetingDaysAgo} dias e sinais de queda. Ouvir antes que vire vermelho.`,
            impact: "alto" as const,
          },
          {
            title: "Revisar escopo e plano de adoção",
            rationale: "Risco principal é adoção/uso. Plano claro de 30 dias com marcos semanais.",
            impact: "alto" as const,
          },
          {
            title: "Atualizar resumo executivo do cliente",
            rationale: "Garantir que toda a equipe tem o mesmo contexto antes da próxima interação.",
            impact: "baixo" as const,
          },
        ]
      : [
          {
            title: "Escalada para Head (você) imediata",
            rationale: `MRR exposto de ${formatBRL(client.mrr)} e padrão de churn detectado. Contato pessoal melhora retenção em 40%.`,
            impact: "alto" as const,
          },
          {
            title: "Plano de recuperação formal em 48h",
            rationale: "Documento com compromissos mútuos: o que o cliente precisa, o que vamos entregar, prazos.",
            impact: "alto" as const,
          },
          {
            title: "Resolver tickets abertos como prioridade absoluta",
            rationale: `${client.openTickets} ticket(s) aberto(s) — cada dia adicional aumenta risco. Mobilizar suporte hoje.`,
            impact: "alto" as const,
          },
          {
            title: "Avaliar save offer (desconto ou pause)",
            rationale: "Se conversa não avançar, oferta de retenção pode ganhar tempo pra reverter a relação.",
            impact: "medio" as const,
          },
        ];

  return {
    clientId: client.id,
    briefing,
    whyStatus,
    suggestedActions,
    generatedAt: new Date().toISOString(),
  };
}
