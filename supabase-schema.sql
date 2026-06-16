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

-- Multi-reasons: cliente pode sair por MAIS DE UM motivo simultaneamente
-- (ex: resultado insuficiente + reclamação operacional). `reason` antigo
-- continua existindo pra compat — mas `reasons` é a fonte da verdade.
alter table churn_events
  add column if not exists reasons text[] not null default '{}';

-- Backfill: rows antigas com só `reason` viram array de 1 elemento
update churn_events
  set reasons = array[reason]
  where reasons = '{}' and reason is not null;

create index if not exists idx_churn_events_task on churn_events (task_id);
create index if not exists idx_churn_events_date on churn_events (churned_at desc);

alter table churn_events disable row level security;

-- ============================================================
-- Tabela: contents
-- Calendário de conteúdos por cliente (post / reel / story / ad).
-- Cada conteúdo passa pelo workflow:
--   em_producao → aguardando_aprovacao → agendado → publicado
--                                      ↓
--                          em_producao (cliente pediu alteração)
--
-- share_token: cada conteúdo tem URL pública /aprovacao/<token>
-- onde o cliente final aprova ou solicita alteração SEM login.
-- ============================================================

create table if not exists contents (
  id bigserial primary key,
  task_id text not null,
  title text not null,
  kind text not null check (kind in ('post','reel','story','ad','carousel')),
  status text not null default 'em_producao'
    check (status in ('em_producao','aguardando_aprovacao','agendado','publicado')),
  scheduled_at date,
  image_url text,
  caption text,
  share_token text unique,
  share_expires_at timestamptz,
  client_decision text check (client_decision in ('approved','rejected') or client_decision is null),
  client_comment text,
  client_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contents_task on contents (task_id);
create index if not exists idx_contents_status on contents (status);
create index if not exists idx_contents_token on contents (share_token)
  where share_token is not null;
create index if not exists idx_contents_scheduled on contents (scheduled_at desc nulls last);

drop trigger if exists trg_contents_updated_at on contents;
create trigger trg_contents_updated_at
  before update on contents
  for each row execute function set_updated_at();

alter table contents disable row level security;

-- === Snapshot compartilhado da lista de clientes =====================
-- Cache cross-instância (stale-while-revalidate): toda busca real no
-- ClickUp grava o resultado aqui; instâncias Vercel sem cache em memória
-- leem daqui (~300ms) em vez de refazer o fetch completo (3-8s).
-- 1 linha só (id=1), payload jsonb com o array de clientes.

create table if not exists clients_snapshot (
  id integer primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table clients_snapshot disable row level security;

-- === Notas internas do time (não vão pro cliente) ====================
-- Anotação rápida por cliente ("Paulo liga amanhã") sem abrir o ClickUp.
create table if not exists client_notes (
  id bigserial primary key,
  task_id text not null,
  body text not null,
  author text,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_notes_task on client_notes (task_id, created_at desc);
alter table client_notes disable row level security;

-- === Histórico de mudanças do Farol ==================================
-- Registra quando/de→para o farol mudou + motivo opcional. Alimenta a
-- linha do tempo de saúde do cliente e a tendência.
create table if not exists farol_history (
  id bigserial primary key,
  task_id text not null,
  from_status text,
  to_status text not null,
  reason text,
  changed_at timestamptz not null default now()
);
create index if not exists idx_farol_history_task on farol_history (task_id, changed_at desc);
alter table farol_history disable row level security;

-- === Snapshots diários de métricas (comparação histórica) ============
-- 1 linha por dia, upsert pelo /api/ping. Acumula MRR/contagens ao longo
-- do tempo pra ver tendência mês a mês (churn vem de churn_events).
create table if not exists metric_snapshots (
  snapshot_date date primary key,
  active_clients integer not null default 0,
  active_mrr numeric not null default 0,
  red_count integer not null default 0,
  yellow_count integer not null default 0,
  green_count integer not null default 0,
  churned_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table metric_snapshots disable row level security;

-- === Biblioteca de criativos (swipe file por nicho) ==================
-- Referências de criativos do nicho (Meta Ad Library ou cadastro manual).
-- Ordenada pelos "sinais de ouro": dias no ar + nº de variantes.
-- Ver docs/biblioteca-criativos.md. MVP: thumbnail_url externo (manual);
-- o coletor depois sobe thumbnail pro Storage e grava a URL pública aqui.
create table if not exists creative_refs (
  id            bigserial primary key,
  niche         text not null,
  source        text not null default 'manual',   -- 'manual' | 'meta'
  platform      text default 'meta',
  library_id    text,                              -- null pra cadastro manual
  advertiser    text,
  format        text,                              -- 'video' | 'image' | 'carousel'
  thumbnail_url text,
  original_url  text,
  caption       text,
  landing_url   text,
  first_seen_at date,                              -- início de veiculação (sinal)
  variant_count int default 1,                     -- nº de anúncios usando o criativo (sinal)
  ai_analysis   jsonb,                             -- preenchido na Fase 3
  tags          text[] default '{}',
  starred       boolean default false,
  collected_at  timestamptz not null default now()
);
create index if not exists idx_creative_refs_niche on creative_refs (niche, collected_at desc);
-- dedupe só pra coletas (library_id não-nulo); manual pode repetir
create unique index if not exists uq_creative_refs_library
  on creative_refs (library_id) where library_id is not null;
alter table creative_refs disable row level security;

-- === Multi-usuário + controle de acesso ==============================
-- Usuários do sistema (login estende o cookie atual; senha-mestra do env
-- continua valendo como admin de emergência → sem risco de lockout).
create table if not exists app_users (
  id            bigserial primary key,
  email         text unique not null,
  name          text,
  password_hash text not null,                 -- bcrypt
  role          text not null default 'gestor',-- admin | gestor | leitor
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table app_users disable row level security;

-- Configuração da conta (1 linha). role_access = seções visíveis por papel
-- (admin sempre vê tudo). Mudanças valem no próximo login do usuário.
create table if not exists app_settings (
  id          integer primary key default 1,
  language    text not null default 'pt-BR',
  timezone    text not null default 'America/Sao_Paulo',
  role_access jsonb not null default '{"gestor":["dashboard","estrategico"],"leitor":["dashboard"]}',
  updated_at  timestamptz not null default now()
);
alter table app_settings disable row level security;
insert into app_settings (id) values (1) on conflict (id) do nothing;
