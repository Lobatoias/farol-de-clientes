# Biblioteca de Criativos — Plano técnico (3 fases)

> Swipe file por **nicho** alimentado pela Meta Ad Library. Filosofia "Roube como
> um artista": coletar criativos comprovados do nicho, ordenados pelos **sinais de
> ouro** (tempo no ar + nº de anúncios usando o criativo), e usar a IA pra dizer
> *o que roubar* e *como adaptar* pro cliente.

## 0. Princípios que vêm do brief (não rediscutir)

- **Fonte = interface web da Ad Library**, não a API oficial (`ads_archive` só
  retorna anúncio político fora da UE). A UI aceita filtros via URL, incl.
  `media_type=video`, e já ordena por impressões.
- **HTTP puro é bloqueado** por anti-bot → navegador real (Playwright com perfil
  persistente).
- **Parsing**: âncora de texto `Identificação da biblioteca: <id>` + subir no DOM
  até a raiz do card identifica cada anúncio com precisão. Scroll progressivo
  resolve o lazy-load da mídia.
- **Mídia é assinada e expira** → baixar/processar na hora, **nunca** guardar o link.
- **Sinais de ouro são grátis e valem mais que nota de IA**: `dias_no_ar`
  (15 meses rodando = campeão) e `variantes` (N anúncios usam o criativo =
  escalado). **São o sort primário da biblioteca.**
- **Compliance**: zona cinzenta nos ToS → swipe file **interno**, manter link pro
  original, rate-limit humano.

## 1. Arquitetura — 3 runtimes (o ponto crítico)

O scraper **não roda na Vercel** (serverless: timeout 10s, sem navegador headful,
sem perfil persistente). São três peças com o Supabase no meio:

```
┌────────────────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│ COLETOR (local/worker) │ ──▶ │  SUPABASE        │ ◀── │ FAROL (Vercel)         │
│ Playwright + perfil    │     │  creative_refs   │     │ aba "Criativos" do     │
│ persistente            │     │  + Storage       │     │ nicho + análise IA     │
│ scrape → thumb → upsert│     │  (thumbnails)    │     │ (Anthropic)            │
└────────────────────────┘     └──────────────────┘     └────────────────────────┘
```

- **Coletor**: script Node local (MVP). Service-role key do Supabase. Roda sob
  demanda (`npm run coletar -- --niche "Joalheria" --max 20`).
- **Farol**: só **lê** o Supabase + roda a IA (1 chamada Anthropic cabe na Vercel).
- **Estratégia de mídia (decisão fechada)**: guardar **só thumbnail + análise +
  metadados**, não o vídeo pesado. Resolve o link que expira, não enche o Storage,
  e é a postura de compliance certa (mídia é de outras marcas → thumbnail interno
  + link pro original; vídeo completo o gestor reabre no link).

## 2. Modelo de dados (Supabase)

```sql
-- Biblioteca por nicho. 1 linha = 1 criativo único (deduplicado).
create table if not exists creative_refs (
  id            bigserial primary key,
  niche         text not null,              -- chave de organização (= client.niche)
  platform      text default 'meta',
  library_id    text not null,              -- "Identificação da biblioteca" (representativo)
  advertiser    text,                       -- anunciante / marca
  advertiser_page_id text,
  format        text,                       -- 'video' | 'image' | 'carousel'
  thumbnail_path text,                      -- caminho no Supabase Storage (bucket creatives)
  original_url  text not null,              -- link do anúncio na Ad Library (manter!)
  caption       text,                       -- copy/legenda do anúncio
  landing_url   text,
  -- SINAIS DE OURO (sort primário)
  first_seen_at date,                       -- início de veiculação
  days_running  int,                        -- recalculado na leitura (hoje - first_seen_at)
  variant_count int default 1,              -- nº de anúncios usando o criativo (escala)
  -- curadoria
  ai_analysis   jsonb,                      -- preenchido na Fase 3 (null até analisar)
  tags          text[] default '{}',
  starred       boolean default false,
  collected_at  timestamptz not null default now(),
  unique (library_id)                       -- dedupe entre coletas
);
create index if not exists idx_creative_refs_niche
  on creative_refs (niche, days_running desc, variant_count desc);
alter table creative_refs disable row level security;

-- Log de coletas (ops/telemetria; opcional mas barato).
create table if not exists creative_collect_runs (
  id           bigserial primary key,
  niche        text not null,
  query_url    text,
  status       text default 'running',      -- running | done | error
  found_count  int default 0,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
alter table creative_collect_runs disable row level security;
```

- **Storage**: bucket `creatives` (público ou via signed URL curta) só com thumbnails.
- **Dedupe**: `unique(library_id)` + `upsert(onConflict: library_id)` no coletor.
  Recoleta atualiza `days_running`/`variant_count` sem duplicar.

### Contrato da análise de IA (`ai_analysis` jsonb)

```json
{
  "nota": 8,
  "funil": "topo",
  "gancho": "...",
  "corpo": "...",
  "prova": "...",
  "cta": "...",
  "o_que_roubar": "a estrutura de antes/depois com depoimento em vídeo",
  "como_adaptar": "trocar o produto pelo da [cliente], manter o gancho de preço"
}
```

Rubrica fixa **GANCHO / CORPO / PROVA / CTA** + nota (0-10) + estágio de funil +
`o_que_roubar` + `como_adaptar` (usa o contexto do cliente: nicho, serviços, MRR).

## 3. Fase 1 — Coletor + tabela + aba que lista

**Objetivo**: dado um nicho, encher a biblioteca e ver os cards no Farol. Sem IA.

Coletor (`scripts/coletor-criativos/` — projeto Node separado, fora do `src`):
1. Playwright `chromium.launchPersistentContext(userDataDir)` (perfil logado/estável).
2. Navega pra URL da Ad Library com filtros (país, termo/anunciante, `media_type`).
3. Loop de scroll progressivo até atingir `--max` ou fim.
4. Pra cada card: localiza `text=Identificação da biblioteca:` → sobe ao card root
   → extrai `library_id`, `advertiser`, `format`, `caption`, `original_url`,
   `first_seen_at`, `variant_count`.
5. Baixa a mídia (poster do vídeo ou a imagem) → gera **thumbnail** → sobe pro
   Storage → guarda `thumbnail_path`. **Não guarda o link assinado.**
6. `upsert` em `creative_refs` (onConflict `library_id`).
7. Rate-limit humano: delays aleatórios (2-6s), lotes pequenos, 1 nicho por vez.

Farol:
- Seção/aba **"Criativos"** em `/cliente/[id]` lendo `creative_refs where niche = client.niche`.
- `GET /api/creatives?niche=...` (lê + recalcula `days_running`).
- Grid de cards (reusa o visual do `content-card`): thumbnail, anunciante, badges
  de sinais ("no ar há 14 meses", "8 variantes"), link "ver original".
- Empty state: "Nenhum criativo coletado pra [nicho] ainda."

**Entrega da Fase 1**: rodar o coletor local → cards aparecem no cliente do nicho.

## 4. Fase 2 — Sinais de ouro (sort) + filtros

- **Sort primário**: `days_running desc, variant_count desc` (campeões no topo).
  Toggle alternativo: "mais recentes" (`collected_at`).
- **Filtros**: formato (vídeo/estático/carrossel), "só campeões" (≥ N meses no ar),
  "só escalados" (≥ N variantes), por anunciante, por tag.
- **Badges visuais** que comunicam o sinal num relance (verde = campeão comprovado).
- **Favoritar** (`starred`) pra o time marcar os que viraram referência.

## 5. Fase 3 — Análise de IA + "transformar em conteúdo"

- `POST /api/creatives/[id]/analyze` → monta prompt (caption + metadados + contexto
  do cliente + rubrica) → Anthropic → grava `ai_analysis` (jsonb) → cache (não
  reanalisa salvo `?force`). Depende da `ANTHROPIC_API_KEY` (já aguardada).
- Card expande mostrando GANCHO/CORPO/PROVA/CTA + nota + funil + **"o que roubar"**.
- Botão **"Transformar em conteúdo"**: pré-preenche o ContentDialog do Calendário
  com `o_que_roubar`/`como_adaptar` como ponto de partida (fecha o loop: referência
  → conteúdo do cliente).

## 6. Compliance & operação

- Posicionar como **swipe file interno**; nunca expor publicamente.
- **Manter `original_url`** sempre (atribuição + o gestor reabre o vídeo lá).
- Guardar **thumbnail**, não a mídia completa (copyright de terceiros + custo).
- **Rate-limit humano** no coletor; nada de rajada. 1 nicho/execução.
- Coletor roda **fora da Vercel**, com credencial service-role só local.

## 7. Critério de aceite (do brief)

> Dado um cliente "ótica em Bauru", **1 clique → 10 vídeos + 10 estáticos
> analisados em < 10 min**.

- O "< 10 min" é responsabilidade do **coletor** (scroll + download + thumbnail).
- O Farol entrega a leitura + análise em ms depois que os dados estão no Supabase.
- A Fase 3 (análise) roda em lote/sob demanda; 20 criativos ≈ 20 chamadas Anthropic
  (paralelizáveis) → cabe nos 10 min com folga.

## 8. Decisões em aberto (pra confirmar antes do build)

1. **Onde o coletor roda no dia a dia?** MVP = local na sua máquina. Depois: VPS
   pequeno / container agendado, se quiser coleta recorrente.
2. **Biblioteca por nicho (recomendado) ou também por cliente?** Padrão: nicho
   compartilhado; opção de "fixar" criativos específicos num cliente vem depois.
3. **Bucket de thumbnail público vs signed URL?** Público simplifica o MVP; signed
   se quiser fechar acesso.
4. **Gatilho do coletor**: você roda o comando, ou um botão no Farol enfileira um
   job pra um worker? (MVP = comando manual.)

---

*Quando der o ok, a ordem de build é: SQL (tabelas + bucket) → Coletor Fase 1 →
aba Criativos (leitura) → sinais/filtros → análise IA. Cada fase é deployável e
testável isolada.*
