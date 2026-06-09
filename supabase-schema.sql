-- ============================================================
-- Farol de Clientes — Supabase schema
-- Cole isso inteiro no SQL Editor do Supabase e rode (Run).
-- Idempotente: pode rodar várias vezes sem quebrar nada.
-- ============================================================

-- Tabela principal: financeiro privado por cliente.
-- A chave (task_id) é o ID da task mestre no ClickUp.
create table if not exists financials (
  task_id text primary key,
  name text,
  monthly_revenue numeric default 0,
  contract_start_at date,
  contract_end_at date,
  client_since date,
  -- mrr/cost legados (mock) — mantidos pra compatibilidade
  mrr numeric default 0,
  cost numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger pra atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_financials_updated_at on financials;
create trigger trg_financials_updated_at
  before update on financials
  for each row execute function set_updated_at();

-- RLS (Row Level Security): por enquanto desabilitado porque a auth do
-- Farol é via senha única na app (não auth do Supabase). Toda escrita
-- passa pela API route do Next, que valida o cookie de auth.
-- Quando migrar pra Supabase Auth (multi-user), habilitar:
--   alter table financials enable row level security;
--   create policy "auth users can read" on financials for select to authenticated using (true);
--   create policy "auth users can write" on financials for all to authenticated using (true);
alter table financials disable row level security;

-- ============================================================
-- Tabela: checklist_progress
-- Guarda quais itens de cada "Plano de otimização" foram concluídos.
-- scope_id   = ID do cliente (ClickUp task ID) OU pseudo-id pra signals
--              que não são por cliente. Ex.:
--                "critical-account" → scope_id = client_id
--                "contract-expiring" → scope_id = client_id
--                "niche-concentration" → scope_id = "niche:Imobiliária"
--                "csm-load" → scope_id = "csm:Leonardo Potiens"
--                "missing-niche" / "orphan-folder" / etc → scope_id = "global"
-- checklist_key = qual checklist (corresponde às chaves de ACTION_CHECKLISTS).
-- checked_indices = índices (0-based) dos itens concluídos.
-- ============================================================

create table if not exists checklist_progress (
  scope_id text not null,
  checklist_key text not null,
  checked_indices integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (scope_id, checklist_key)
);

create index if not exists idx_checklist_progress_key on checklist_progress (checklist_key);

drop trigger if exists trg_checklist_progress_updated_at on checklist_progress;
create trigger trg_checklist_progress_updated_at
  before update on checklist_progress
  for each row execute function set_updated_at();

alter table checklist_progress disable row level security;

-- ============================================================
-- Tabela: churn_events
-- Registra cada saída de cliente. Um cliente pode ter VÁRIOS
-- eventos (se voltou e saiu de novo, raro). Pra saber se está
-- atualmente fora: existir ao menos um evento.
-- Pra desfazer marcação acidental: deletar o evento mais recente.
--
-- monthly_revenue_at_time / csm_at_time / niche_at_time são
-- snapshots no momento da saída — não mudam se o cliente for
-- editado depois. Crítico pra relatórios históricos.
-- ============================================================

create table if not exists churn_events (
  id bigserial primary key,
  task_id text not null,
  churned_at date not null,
  reason text not null,
  reason_details text,
  csm_at_time text,
  monthly_revenue_at_time numeric,
  niche_at_time text,
  created_at timestamptz not null default now()
);

create index if not exists idx_churn_events_task on churn_events (task_id);
create index if not exists idx_churn_events_date on churn_events (churned_at desc);

alter table churn_events disable row level security;
