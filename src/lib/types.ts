export type Status = "verde" | "amarelo" | "vermelho";

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
  status?: string; // status do ClickUp ("backlog", "complete", "a fazer", etc.)
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
