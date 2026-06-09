# Referência completa de variáveis de ambiente

Todas as env vars que o Farol usa. Coloque tudo em **`.env.local`** na raiz do projeto.

> ⚠️ **NUNCA commita `.env.local`.** Está no `.gitignore` por design. Em produção, configure no painel da Vercel.

---

## Tabela rápida

| Variável | Obrigatória? | Quando preencher |
|---|---|---|
| `CLICKUP_API_TOKEN` | ✅ Sim | Sempre — sem isso, app cai em modo mock |
| `CLICKUP_WORKSPACE_ID` | ✅ Sim | Sempre |
| `CLICKUP_MASTER_LIST_ID` | ✅ Sim | Sempre |
| `CLICKUP_OPERATIONAL_SPACE_ID` | ✅ Sim | Sempre |
| `SUPABASE_URL` | ⚠️ Produção | Em dev pode faltar, app cai pro arquivo local |
| `SUPABASE_KEY` | ⚠️ Produção | Idem |
| `FAROL_PASSWORD` | ⚠️ Recomendado | Sem isso, app fica aberto sem auth |
| `FAROL_SECRET` | ⚠️ Recomendado | Pra assinar o cookie de sessão |
| `CHATWOOT_*` | Opcional | Só pra ativar alerta WhatsApp em vermelhos |
| `ANTHROPIC_API_KEY` | Recomendado | Liga análise de padrões de churn em /saidas |

---

## 1 · ClickUp

### `CLICKUP_API_TOKEN`

Token pessoal de API do ClickUp. Identifica VOCÊ pro ClickUp — todas as leituras/escritas usam esse token.

**Como pegar:**
1. Acesse https://app.clickup.com
2. Clique no seu avatar (canto inferior esquerdo)
3. **Settings** → menu lateral **Apps** → seção **API Token**
4. Clique **Generate** (se não tiver) ou **Copy** (se já tem)
5. Cole no `.env.local`

**Formato:** `pk_67408515_OKOZ43P4I6EI4JE13SQIOK1FER23FCHU` (começa com `pk_`)

**Permissões:** o token herda os acessos do usuário que o criou. Use um usuário que tenha acesso a `Vela Latina | Squad 01` (workspace dos clientes).

---

### `CLICKUP_WORKSPACE_ID`

ID numérico do workspace onde estão os clientes.

**Como pegar:**
1. No ClickUp, abra qualquer página do workspace
2. Olhe a URL — `https://app.clickup.com/{ID}/...`
3. O número entre `app.clickup.com/` e o próximo `/` é o ID

**Valor pra Vela Latina:** `9011315823`

---

### `CLICKUP_MASTER_LIST_ID`

ID da **lista mestre** onde cada task é um cliente. No ClickUp da Vela Latina é a lista `Clientes` dentro de `Empresa → Gestão de Clientes`.

**Como pegar:**
1. ClickUp → navegue até a lista
2. URL: `https://app.clickup.com/{WS}/v/l/li/{ID}` — o número final é o ID
3. Ou: clique nos 3 pontinhos da lista → **Copy link** → tira o ID da URL

**Valor pra Vela Latina:** `901112849675`

---

### `CLICKUP_OPERATIONAL_SPACE_ID`

ID do space onde estão os folders operacionais (cada folder = 1 cliente). Na Vela Latina é `Sprint | Geral (Construção)`.

**Como pegar:** mesmo padrão da master list — pega da URL.

**Valor pra Vela Latina:** `90114158210`

---

## 2 · Supabase

### `SUPABASE_URL`

URL única do seu projeto Supabase.

**Como pegar:**
1. https://supabase.com/dashboard → seleciona o projeto `farol-de-clientes`
2. **Settings** → **API**
3. **Project URL** → copia

**Formato:** `https://pqnsyfiksulznpyalbnu.supabase.co`

---

### `SUPABASE_KEY`

Chave **publishable** (publicável) — segura pra ser exposta em código client-side, mas só funciona com as policies que você definir (no nosso caso, RLS desabilitado na tabela `financials`).

**Como pegar:**
1. Mesma tela de **Settings → API**
2. **Publishable and secret API keys** → **Publishable key (default)** → copia
3. ⚠️ **NÃO use a `Secret key`** — essa nunca deve sair do servidor

**Formato:** `sb_publishable_VTmXEjp__alJ_BGErzxJnQ__tGNeO7t` (começa com `sb_publishable_`)

---

## 3 · Auth

### `FAROL_PASSWORD`

Senha única compartilhada — todo mundo que vai acessar o Farol usa essa mesma.

**Recomendações:**
- Não use senha trivial (ex: `123456`)
- Use algo que você consiga compartilhar fácil mas que não seja óbvio
- Exemplo: `farol-vela-2026`, `agencia-2026-bcd`, etc.

**Quando deixar vazio:** se você não setar essa variável, o **middleware libera tudo sem auth**. Útil em dev, **inseguro em produção**.

---

### `FAROL_SECRET`

Hex aleatório de 64 caracteres usado pra assinar o cookie de sessão. Garante que ninguém forja um cookie sem saber esse secret.

**Como gerar:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Formato:** `a16aac4295ac95d4fda9e457b1e6ea246f686c7691a3ee2c53cd0f8a1f6a2d5c` (64 chars hex)

**Quando deixar vazio:** se faltar, o código usa o próprio `FAROL_PASSWORD` como secret. Funciona mas é menos seguro — recomendo setar.

---

## 4 · Chatwoot (opcional)

Só configure se quiser ativar a **notificação WhatsApp quando cliente vira vermelho**. Sem essas, o save do Farol funciona normal — só não dispara alerta.

### `CHATWOOT_URL`
URL da sua instância Chatwoot. Cloud do chatwoot.com: `https://app.chatwoot.com`.

### `CHATWOOT_API_TOKEN`
Token pessoal de API. **Chatwoot → avatar → Profile Settings → Access Token**.

### `CHATWOOT_ACCOUNT_ID`
ID da conta. Visível na URL: `app.chatwoot.com/app/accounts/{ID}/...`.

### `CHATWOOT_INBOX_ID`
ID do canal WhatsApp. **Settings → Inboxes → seleciona o WhatsApp → ID na URL**.

### `CHATWOOT_TARGET_CONTACT_ID` *(uma das duas)*
ID do contato (gestor) que recebe os alertas. **Settings → Contacts → busca → ID na URL**.

### `CHATWOOT_TARGET_PHONE` *(uma das duas)*
Alternativa ao Contact ID. Telefone do gestor em **formato E.164**: `+5511999999999` (com + e código do país).

### `CHATWOOT_TARGET_NAME`
Nome do gestor — usado se for criar contato automaticamente via `TARGET_PHONE`. Default: `"Gestor"`.

---

## 5 · Anthropic — IA real

### `ANTHROPIC_API_KEY`

Chave da API da Anthropic — sem ela, a **análise de padrões de churn** em `/saidas` aparece com botão "Gerar análise" que retorna erro `503` explicando que falta a key. O resto do app funciona normal (sem essa feature).

**Como pegar:**
1. https://console.anthropic.com/settings/keys
2. **Create Key** → dá um nome (ex: "Farol Vela Latina")
3. Copia (a key só aparece UMA vez)

**Formato:** `sk-ant-XXXX...`

**Onde colocar:**
- Local: no `.env.local`
- Produção: https://vercel.com → projeto `farol-de-clientes` → Settings → Environment Variables → adicionar `ANTHROPIC_API_KEY` (marca Production + Preview + Development) → salvar → Vercel redeploya sozinho

**O que ela faz:**

Quando você clica "Gerar análise" em `/saidas`, o Farol monta um prompt com:
- Todos os eventos de saída (motivos, detalhes, CSM da época, MRR perdido)
- Notas das últimas reuniões dos clientes que saíram (truncadas a 2.5k chars cada)
- Clientes ATIVOS em risco (status amarelo/vermelho) com notas (1.5k chars cada)

E pede pro Claude Sonnet 4.5 devolver JSON com: resumo executivo · padrões sistêmicos · frases recorrentes pré-saída · sinais antecipados em ativos · ações preventivas operacionais (nunca desconto, política da casa).

**Custo:** ~ R$ 0,05 a R$ 0,30 por análise dependendo do volume de notas. Cache de 1h evita rodar de novo se nada mudou.

**Modelo usado:** `claude-sonnet-4-5` (definido em `src/lib/anthropic.ts`)

---

## Resumo: arquivo `.env.local` completo de exemplo

```bash
# === ClickUp ===
CLICKUP_API_TOKEN=pk_67408515_OKOZ43P4I6EI4JE13SQIOK1FER23FCHU
CLICKUP_WORKSPACE_ID=9011315823
CLICKUP_MASTER_LIST_ID=901112849675
CLICKUP_OPERATIONAL_SPACE_ID=90114158210

# === Supabase ===
SUPABASE_URL=https://pqnsyfiksulznpyalbnu.supabase.co
SUPABASE_KEY=sb_publishable_VTmXEjp__alJ_BGErzxJnQ__tGNeO7t

# === Auth ===
FAROL_PASSWORD=farol-vela-2026
FAROL_SECRET=a16aac4295ac95d4fda9e457b1e6ea246f686c7691a3ee2c53cd0f8a1f6a2d5c

# === Chatwoot (deixe vazio se não for usar) ===
CHATWOOT_URL=
CHATWOOT_API_TOKEN=
CHATWOOT_ACCOUNT_ID=
CHATWOOT_INBOX_ID=
CHATWOOT_TARGET_CONTACT_ID=
CHATWOOT_TARGET_PHONE=
CHATWOOT_TARGET_NAME=

# === IA (futuro) ===
ANTHROPIC_API_KEY=
```

---

## Como o Farol descobre se uma var existe

Internamente o código tem flags como:
- `CLICKUP_CONFIGURED` — true se `CLICKUP_API_TOKEN` existe
- `SUPABASE_CONFIGURED` — true se ambos `SUPABASE_URL` e `SUPABASE_KEY` existem
- `AUTH_ENABLED` — true se `FAROL_PASSWORD` existe
- `CHATWOOT_CONFIGURED` — true se token + account + inbox existem

Quando uma flag é `false`, o Farol **degrada graciosamente**:
- Sem ClickUp → mostra 50 clientes mock
- Sem Supabase → financeiro lê/escreve em `data/financials.local.json` local
- Sem Auth → libera todas as rotas sem login
- Sem Chatwoot → silencioso (não tenta enviar)
