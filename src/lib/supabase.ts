import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;

export const SUPABASE_CONFIGURED = !!(URL && KEY);

let _client: SupabaseClient | null = null;

/**
 * Cliente Supabase server-side. Retorna null se as env vars não estão setadas
 * (em dev, sem Supabase, o app cai pro JSON local).
 */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;
  if (_client) return _client;
  _client = createClient(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// === Tipos da tabela `financials` ===================================

export interface FinancialRow {
  task_id: string;
  name: string | null;
  monthly_revenue: number | null;
  contract_start_at: string | null; // ISO date
  contract_end_at: string | null;
  client_since: string | null;
  mrr: number | null;
  cost: number | null;
  created_at?: string;
  updated_at?: string;
}

// === Tipos da tabela `churn_events` =================================

// === Tipos da tabela `contents` ====================================

export interface ContentRow {
  id: number;
  task_id: string;
  title: string;
  kind: string;
  status: string;
  scheduled_at: string | null;
  image_url: string | null;
  caption: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  client_decision: string | null;
  client_comment: string | null;
  client_decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeRefRow {
  id: number;
  niche: string;
  source: string; // 'manual' | 'meta'
  platform: string | null;
  library_id: string | null;
  advertiser: string | null;
  format: string | null; // 'video' | 'image' | 'carousel'
  thumbnail_url: string | null;
  original_url: string | null;
  caption: string | null;
  landing_url: string | null;
  first_seen_at: string | null; // ISO date
  variant_count: number;
  ai_analysis: unknown | null;
  tags: string[] | null;
  starred: boolean;
  collected_at: string;
}

export interface ClientNoteRow {
  id: number;
  task_id: string;
  body: string;
  author: string | null;
  created_at: string;
}

export interface FarolHistoryRow {
  id: number;
  task_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_at: string;
}

export interface MetricSnapshotRow {
  snapshot_date: string; // YYYY-MM-DD
  active_clients: number;
  active_mrr: number;
  red_count: number;
  yellow_count: number;
  green_count: number;
  churned_total: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChurnRow {
  id: number;
  task_id: string;
  churned_at: string; // ISO date
  reason: string;
  /** Array Postgres text[] — multi-motivos. Fonte da verdade. */
  reasons: string[] | null;
  reason_details: string | null;
  csm_at_time: string | null;
  monthly_revenue_at_time: number | null;
  niche_at_time: string | null;
  created_at: string;
}
