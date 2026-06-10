export type Status = "verde" | "amarelo" | "vermelho";

// ============================================================
// Conteúdos — calendário editorial por cliente
// ============================================================

export const CONTENT_KINDS = [
  "post",
  "reel",
  "story",
  "ad",
  "carousel",
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_STATUSES = [
  "em_producao",
  "aguardando_aprovacao",
  "agendado",
  "publicado",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ClientDecision = "approved" | "rejected";

export interface Content {
  id: number;
  taskId: string;
  title: string;
  kind: ContentKind;
  status: ContentStatus;
  scheduledAt?: string; // ISO date YYYY-MM-DD
  imageUrl?: string;
  caption?: string;
  shareToken?: string;
  shareExpiresAt?: string; // ISO timestamptz
  clientDecision?: ClientDecision;
  clientComment?: string;
  clientDecidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Labels em pt-BR pros kinds. */
export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  post: "Post",
  reel: "Reel",
  story: "Story",
  ad: "Anúncio",
  carousel: "Carrossel",
};

/** Labels em pt-BR pros status. */
export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  em_producao: "Em produção",
  aguardando_aprovacao: "Aguardando aprovação",
  agendado: "Agendado",
  publicado: "Publicado",
};

export const CHURN_REASONS = [
  "Resultado insuficiente / ROI baixo",
  "Reclamação operacional (atendimento, prazo, qualidade)",
  "Cortou orçamento",
  "Mudou de estratégia interna",
  "Fechou ou pausou empresa",
  "Foi pra concorrente",
  "Trouxe pra in-house",
  "Outro",
] as const;

export type ChurnReason = (typeof CHURN_REASONS)[number];

export interface ChurnEvent {
  id: number;
  taskId: string;
  churnedAt: string; // ISO YYYY-MM-DD
  /**
   * Lista de motivos da saída (1 ou mais). Cliente pode sair por
   * vários motivos simultaneamente. Sempre tem ao menos 1 elemento.
   */
  reasons: ChurnReason[];
  /** Atalho pro primeiro motivo — mantido por compat com chamadas legadas. */
  reason: ChurnReason;
  reasonDetails?: string;
  csmAtTime?: string;
  monthlyRevenueAtTime?: number;
  nicheAtTime?: string;
  createdAt: string; // ISO timestamptz
}

export type ClientSegment =
  | "Enterprise"
  | "Mid-Market"
  | "SMB"
  | "Startup";

export type EventType =
  | "reuniao"
  | "mudanca-status"
  | "entrega"
  | "incidente"
  | "tarefa"
  | "ia-resumo";

export interface ClientEvent {
  id: string;
  type: EventType;
  date: string; // ISO
  title: string;
  description?: string; // texto completo da descrição da task
  author?: string;
  status?: string; // status do ClickUp ("backlog", "concluído", "a fazer", etc.)
  /** Type do status no ClickUp: "open" | "custom" | "done" | "closed" */
  statusType?: string;
  url?: string; // link direto pra abrir no ClickUp
  commentCount?: number;
}

export interface Client {
  id: string;
  name: string;
  segment: ClientSegment;
  owner: string; // CSM/responsável (mapeado de "Responsável pela Revisão")
  status: Status;
  previousStatus?: Status; // pra detectar degradação
  statusChangedAt: string; // ISO

  // === Dados específicos de agência (de Vela Latina) ===
  niche?: string; // "Negócio Local" etc.
  services?: string[]; // ["Gestão de Tráfego", "E-commerce", ...]
  investmentMeta?: number; // R$ — budget Meta sob gestão
  investmentGoogle?: number; // R$ — budget Google sob gestão

  // === Financeiro privado (vive em data/financials.local.json) ===
  /** Mensalidade que o cliente paga pra agência. R$/mês. */
  monthlyRevenue?: number;
  /** Data de início do contrato atual (ISO YYYY-MM-DD). */
  contractStartAt?: string;
  /** Data de fim do contrato atual (ISO YYYY-MM-DD). */
  contractEndAt?: string;
  /** Data desde quando o cliente trabalha com a agência (ISO YYYY-MM-DD). */
  clientSince?: string;

  // === Legados / fallback (mock data ainda usa) ===
  mrr: number; // 0 em modo real (não temos MRR)
  cost: number; // 0 em modo real
  margin: number;

  // === Saúde do cliente (vem do Farol custom field) ===
  nps?: number;
  lastMeetingAt?: string;
  nextMeetingAt?: string;
  /** Texto completo da última reunião (notas/resumo colado do WhatsApp ou digitado). */
  meetingNotes?: string;
  openTickets: number;
  riskTags: string[];
  summary: string;
  events: ClientEvent[];

  // === Links ClickUp ===
  clickupMasterTaskId?: string; // task na lista mestre
  clickupMasterUrl?: string;
  clickupFolderId?: string; // folder operacional (se houver)
  clickupUrl?: string; // alias = folder url ou master url

  // === Flags de integridade ===
  hasMasterRecord?: boolean; // true se existe no cadastro mestre
  hasOperationalFolder?: boolean; // true se tem folder operacional

  // === Saída do cliente (churn) ===
  /** True se há ao menos 1 churn_event registrado. Cliente está fora da base. */
  isChurned?: boolean;
  /** Última saída registrada (snapshot do momento). */
  lastChurnEvent?: ChurnEvent;
}

export interface AIInsight {
  id: string;
  type: "padrao" | "prioridade" | "alerta-degradacao";
  title: string;
  body: string;
  affectedClientIds: string[];
  confidence: "alta" | "media" | "baixa";
  generatedAt: string; // ISO
}

export interface AIClientAnalysis {
  clientId: string;
  briefing: string; // resumo executivo
  whyStatus: string; // por que está verde/amarelo/vermelho
  suggestedActions: Array<{
    title: string;
    rationale: string;
    impact: "alto" | "medio" | "baixo";
  }>;
  generatedAt: string;
}
