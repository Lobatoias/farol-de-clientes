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
