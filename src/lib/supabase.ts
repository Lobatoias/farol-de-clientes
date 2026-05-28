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
