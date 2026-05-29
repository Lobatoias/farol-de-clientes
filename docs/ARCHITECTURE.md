# Arquitetura — Farol de Clientes

Visão técnica do código pra quem vai **contribuir, customizar ou debuggar** o Farol.

> Pré-requisito: leu o **[README.md](../README.md)** e tem o app rodando local via **[SETUP.md](SETUP.md)**.

---

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Front-end | **React 19** + **Next.js 16** (App Router) | RSC simplifica fetch de dados + UI declarativa |
| Estilo | **Tailwind CSS 4** + lucide-react (ícones) | Iteração rápida sem CSS files |
| Animação | CSS keyframes + componente `CountUp` próprio | Sem dependência de Framer Motion |
| Linguagem | **TypeScript 5** (strict) | Pega bugs em build, não em runtime |
| Banco | **Supabase** (Postgres) | Free tier generoso, SQL puro, RLS quando precisar |
| Operação | **ClickUp REST API v2** | Cliente já usa ClickUp, evita migração |
| Hospedagem | **Vercel** | Deploy automático do Git, free tier suficiente |
| Auth | Cookie httpOnly + senha + assinatura HMAC simples | Sem dependência de Auth provider externo no MVP |
| Comunicação | **Chatwoot REST API** | Opcional, dispara alertas WhatsApp |

---

## Estrutura de pastas

```
src/
├── app/                    ← App Router do Next.js (rotas)
│   ├── page.tsx            ← Dashboard `/`
│   ├── financeiro/page.tsx ← `/financeiro`
│   ├── estrategico/page.tsx
│   ├── cliente/[id]/page.tsx
│   ├── setup/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx          ← Layout global (nav, fonte, etc.)
│   ├── globals.css         ← Estilos globais + animações
│   └── api/                ← Endpoints HTTP
│       ├── farol/[id]/route.ts        ← POST muda farol
│       ├── financials/[id]/route.ts   ← POST salva financeiro
│       └── auth/
│           ├── login/route.ts
│           └── logout/route.ts
├── components/             ← Componentes React
│   ├── top-nav.tsx
│   ├── client-card.tsx
│   ├── farol-picker.tsx
│   ├── kpi-cards.tsx
│   ├── nicho-breakdown.tsx
│   ├── donut-chart.tsx
│   ├── ltv-section.tsx
│   ├── strategic-view.tsx
│   ├── action-checklist-dialog.tsx
│   ├── financeiro-editor.tsx
│   └── ...
├── lib/                    ← Lógica de negócio + API clients
│   ├── clients.ts          ← Orquestra dados de cliente (ClickUp + Supabase)
│   ├── clickup.ts          ← Cliente REST do ClickUp
│   ├── supabase.ts         ← Cliente Supabase
│   ├── chatwoot.ts         ← Cliente Chatwoot
│   ├── auth.ts             ← Auth (cookie + senha)
│   ├── strategy.ts         ← Análise estratégica (insights)
│   ├── metrics.ts          ← LTV, retenção, forecast
│   ├── mock-ai.ts          ← Mocks de IA (Estratégica / Cliente)
│   ├── mock-data.ts        ← Mock de 50 clientes (fallback)
│   ├── types.ts            ← Tipos TypeScript compartilhados
│   └── utils.ts            ← Helpers (formatBRL, daysUntil, etc.)
└── middleware.ts           ← Auth middleware (redirect /login se sem cookie)
```

---

## Fluxo de dados — quando o usuário abre o Dashboard

```
Browser GET /
    ↓
Vercel serverless (Node runtime)
    ↓
middleware.ts → verifica cookie de auth
    ↓ se OK
app/page.tsx (RSC) → chama getClients()
    ↓
lib/clients.ts → orquestra:
    ├── listMasterClientTasks() ─→ ClickUp REST (lista mestre)
    ├── listOperationalFolders() ─→ ClickUp REST (folders por cliente)
    └── loadFinancials() ────────→ Supabase (financeiro privado)
    ↓
Une os 3 fontes em Client[] tipado
    ↓
Renderiza KpiCards + DashboardClient (RSC + Client Components)
    ↓
HTML streamado pro browser
```

**Pontos importantes:**

- **Sem cache em memória** entre requests (cada serverless instance é efêmera). Único cache é a deduplicação de promise dentro do MESMO render (`inflightGetClients`).
- **ClickUp custom fields** são extraídos via regex no nome do campo (`/farol/i`, `/^nps$/i`), tolerando renomeações leves.
- **Financial fallback**: se `SUPABASE_*` faltar, lê de `data/financials.local.json` (modo dev).

---

## Fluxo de dados — quando o usuário muda Farol de um cliente

```
Browser: click no badge "OK" → seleciona "Crítico"
    ↓ React onClick
components/farol-picker.tsx → fetch POST /api/farol/[id]
    ↓
app/api/farol/[id]/route.ts:
    ├── busca client atual (lê status anterior)
    ├── setFarol() → ClickUp REST POST (atualiza custom field)
    ├── invalidateClientsCache() → limpa inflight
    ├── revalidatePath("/") + outros
    └── se mudou pra vermelho: notifyCriticalClient() → Chatwoot fire-and-forget
    ↓
Browser: router.refresh() → re-renderiza dashboard
    ↓
Novo getClients() pega farol atualizado do ClickUp
```

---

## Fluxo de dados — quando o usuário edita Financeiro

```
Browser: digita valor em input → onBlur
    ↓
components/financeiro-editor.tsx → fetch POST /api/financials/[id]
    ↓
app/api/financials/[id]/route.ts:
    ├── valida payload
    └── saveFinancialEntry()
        ├── tenta saveFinancialEntryToSupabase()
        │   ├── lê row existente
        │   ├── merge: copia tudo, sobrescreve só campos que vieram no entry
        │   └── UPSERT no Supabase
        └── se Supabase falhar OU não configurado:
            └── saveFinancialEntryToFile() → escreve data/financials.local.json
    ↓
revalidatePath de /financeiro, /, /estrategico
    ↓
Browser: router.refresh() → leitura nova
```

---

## Auth — como funciona

Auth é **simples por design** (MVP, 3 pessoas).

### Login

1. User digita senha em `/login`
2. POST `/api/auth/login` com `{ password }`
3. `checkPassword()` compara com `FAROL_PASSWORD` env
4. Se OK: `login()` seta cookie `farol_auth=<ts>.<sig>` (httpOnly, 30 dias)
5. `<sig>` = hash FNV-1a do `<ts>` + `FAROL_SECRET`

### Middleware

A cada request, `src/middleware.ts`:
1. Se `FAROL_PASSWORD` não está setado → libera tudo (modo dev)
2. Se rota é `/login`, `/api/auth/*` ou estático → libera
3. Pega cookie `farol_auth`, valida formato (sem precisar revalidar hash — middleware roda na edge runtime, cripto limitado)
4. Se inválido → redireciona pra `/login?from=...`

> **Por que validar formato no middleware mas hash no server?** Edge runtime do Next 16 tem APIs cripto limitadas. Validação leve no middleware previne 99% dos casos, e a validação real do hash acontece na rota da API (`lib/auth.ts isAuthenticated()`).

### Limitações conhecidas

- **Senha única**: sem identidade individual. Pra multi-user proper, migrar pra Supabase Auth (Magic Link / Google OAuth) com tabela `users` e RLS.
- **Sem rate limit** na rota de login: brute force é teoricamente possível. Pra mitigar, use senha forte e/ou adicione middleware de rate limit (futuro).

---

## Tipos centrais

### `Client` (de `lib/types.ts`)

O tipo principal que orienta toda a aplicação:

```ts
interface Client {
  id: string;
  name: string;
  segment: "Mid-Market" | ...;
  owner: string;             // CSM responsável (do ClickUp)
  status: "verde" | "amarelo" | "vermelho";  // Farol

  // Dados de agência (do ClickUp)
  niche?: string;
  services?: string[];
  investmentMeta?: number;
  investmentGoogle?: number;

  // Financeiro privado (do Supabase)
  monthlyRevenue?: number;
  contractStartAt?: string;
  contractEndAt?: string;
  clientSince?: string;

  // Saúde (do ClickUp)
  nps?: number;
  lastMeetingAt?: string;
  nextMeetingAt?: string;
  meetingNotes?: string;
  openTickets: number;
  riskTags: string[];
  summary: string;
  events: ClientEvent[];

  // Links ClickUp
  clickupMasterTaskId?: string;
  clickupMasterUrl?: string;
  clickupFolderId?: string;
  clickupUrl?: string;

  // Flags de integridade
  hasMasterRecord?: boolean;
  hasOperationalFolder?: boolean;

  // Legados (mock, mantidos pra compat)
  mrr: number;
  cost: number;
  margin: number;
}
```

Todo componente que mostra dados de cliente usa esse tipo. Quando adicionar novo campo, comece aqui.

---

## ClickUp — quais campos custom o Farol espera

A lista mestre `Clientes` (Empresa → Gestão de Clientes) precisa ter esses custom fields:

| Campo | Tipo | Como o Farol identifica |
|---|---|---|
| Farol (ou "?? Farol") | Dropdown | regex `/farol/i` |
| NPS | Number | regex `/^nps$/i` |
| Ultima reuniao | Date | regex `/^[uú]ltima\s+reuni/i` |
| Proxima reuniao | Date | regex `/^pr[oó]xima\s+reuni/i` |
| Resumo executivo | Text | regex `/resumo.*executivo/i` |
| Sinais de risco | Labels | regex `/sinais.*risco/i` |
| Notas da ultima reuniao | Text | regex `/notas.*(reuni\|última)/i` |
| Nicho | Dropdown | regex `/^nicho$/i` |
| Investimento Meta | Currency | regex `/investimento.*meta/i` |
| Investimento Google | Currency | regex `/investimento.*google/i` |
| Serviço(s) | Dropdown (pode ser múltiplo) | regex `/^servi[çc]o/i` |
| Responsável pela Revisão | Users | regex `/respons[áa]vel.*revis/i` |

Se você renomear no ClickUp (ex: tirar emoji, mudar caixa), os regex continuam pegando.

---

## Padrões de UI

- **Cards 2xl rounded** com `border-l-4` colorido pra hierarquia (rose, amber, violet, blue, emerald)
- **Hover lift**: `hover:shadow-md hover:-translate-y-0.5 transition-all`
- **Stagger entrance**: `animate-fade-up stagger-{1,2,3,4,5,6}` (delays 40ms-240ms)
- **CountUp** anima números mudando: import `<CountUp to={value} format={formatBRL} />`
- **Tons semânticos**: `tone="primary"` (azul), `tone="good"` (verde), `tone="warn"` (âmbar), `tone="danger"` (rose), `tone="neutral"` (cinza)
- **Animações respeitam** `prefers-reduced-motion` via CSS global

---

## Como adicionar uma nova feature

### Tutorial: adicionar um KPI novo no Dashboard

1. Verifique se o dado já existe em `Client`. Senão, adicione campo:
   ```ts
   // lib/types.ts
   interface Client {
     ...
     myNewField?: number;
   }
   ```

2. Popule no `lib/clients.ts buildClientFromMasterTask()`:
   ```ts
   const myValue = extractCustomField(task, /meu.*campo/i) as number | null;
   return { ..., myNewField: myValue ?? undefined };
   ```

3. Adicione o KPI em `components/kpi-cards.tsx`:
   ```tsx
   <Kpi
     label="Meu KPI"
     icon={<Sparkles className="size-4" />}
     iconTone="primary"
     numericValue={clients.reduce((s, c) => s + (c.myNewField ?? 0), 0)}
     formatValue={(n) => n.toString()}
   />
   ```

4. Typecheck:
   ```bash
   npx tsc --noEmit
   ```

5. Build + roda:
   ```bash
   npm run build && npm start
   ```

6. Commit + push → Vercel rebuilda automático.

### Tutorial: adicionar uma nova seção em /estrategico

1. Adicione a função de cálculo em `lib/strategy.ts`:
   ```ts
   function buildMinhaSecao(clients: Client[]): MinhaSecaoData[] {
     return clients.filter(...).map(c => ...);
   }
   ```

2. Adicione ao `StrategicView`:
   ```ts
   export interface StrategicView {
     ...
     minhaSecao: MinhaSecaoData[];
   }

   export function buildStrategicView(clients): StrategicView {
     return {
       ...
       minhaSecao: buildMinhaSecao(clients),
     };
   }
   ```

3. Crie componente em `components/strategic-view.tsx` ou separe num arquivo próprio.

4. Adicione checklist em `ACTION_CHECKLISTS`:
   ```ts
   "minha-secao": [
     "Passo 1...",
     "Passo 2...",
   ],
   ```

---

## Performance

### Onde o Farol pode ficar lento

1. **Primeiro carregamento do Dashboard**: ~3 chamadas pra ClickUp (master tasks + folders + financials Supabase). Total ~2s.
2. **Cliente detalhe**: chamada extra pra tasks do folder operacional. Total ~3s.
3. **Estratégico**: cálculos puros em JavaScript, < 100ms mesmo com 1000 clientes.

### Otimizações futuras possíveis

- **Vercel KV** ou **Supabase realtime** pra cache cross-instance compartilhado
- **Webhook do ClickUp** pra invalidar quando algo muda lá (em vez de refetch)
- **Edge runtime** pra rotas read-only
- **React Server Components com revalidate** estratégica (5s pra dashboard, 60s pro estratégico)

---

## Debugando em produção

### Ver logs do Vercel
1. https://vercel.com/lobato-s-projects/farol-de-clientes
2. **Deployments** → último deploy → **Functions**
3. Logs em tempo real ou histórico das chamadas

### Ver dados direto no Supabase
1. https://supabase.com/dashboard
2. Projeto `farol-de-clientes` → **Table Editor** → `financials`

### Testar API REST do Farol direto
```bash
# Login
curl -X POST https://farol-de-clientes.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"SUA_SENHA"}' \
  -c cookies.txt

# Mudar farol
curl -X POST https://farol-de-clientes.vercel.app/api/farol/{TASK_ID} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status":"amarelo"}'

# Salvar financeiro
curl -X POST https://farol-de-clientes.vercel.app/api/financials/{TASK_ID} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Cliente X","monthlyRevenue":1000}'
```

---

## Roadmap técnico

- [ ] Migrar auth pra Supabase Auth (Magic Link)
- [ ] Adicionar tabela `audit_log` pra rastrear mudanças de Farol
- [ ] Webhook ClickUp → Vercel pra invalidação em real-time
- [ ] Cache compartilhado via Vercel KV
- [ ] Plugar Claude API (substituir `lib/mock-ai.ts`)
- [ ] Testes E2E com Playwright
- [ ] CI no GitHub Actions (typecheck + lint em PRs)
