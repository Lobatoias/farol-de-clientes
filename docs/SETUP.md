# Setup local — Farol de Clientes

Guia passo a passo pra rodar o Farol **no seu computador (localhost)** do zero. Tempo total: 20-30 min se for a primeira vez.

> **Cenário:** alguém da equipe Vela Latina (ou outra pessoa autorizada) quer ter o Farol rodando localmente — pra desenvolver, testar mudanças, ou só ter um ambiente próprio independente do https://farol-de-clientes.vercel.app.

---

## Pré-requisitos

Instale antes de começar (cada link abre a página oficial):

| Ferramenta | Versão mínima | Link |
|---|---|---|
| **Node.js** | 20.x ou superior | https://nodejs.org/pt (baixa o LTS) |
| **Git** | qualquer recente | https://git-scm.com/downloads |
| **Editor de código** | recomendo VS Code | https://code.visualstudio.com |

**Como verificar se instalou:** abra o terminal (PowerShell no Windows, Terminal no Mac) e roda:
```bash
node --version
# deve mostrar v20.x.x ou superior

git --version
# deve mostrar git version 2.x.x
```

Se algum falhar, instale e tenta de novo.

---

## Passo 1 · Clonar o repositório

```bash
# Escolhe uma pasta onde quer guardar o projeto. Exemplos:
#   Windows:  D:\projetos
#   Mac/Linux: ~/projetos
cd D:\projetos        # ajusta pro seu caso

# Clona
git clone https://github.com/Lobatoias/farol-de-clientes.git

# Entra na pasta criada
cd farol-de-clientes
```

Se ele pedir login do GitHub, é porque o repositório é privado — fala com o Daniel pra ele te adicionar como colaborador.

---

## Passo 2 · Instalar dependências

```bash
npm install
```

Demora 2-3 minutos na primeira vez. Vai instalar Next.js, React, Tailwind, Supabase client, etc — tudo dentro da pasta `node_modules/` (que é gitignored, não vai pro repo).

---

## Passo 3 · Configurar variáveis de ambiente

O Farol precisa de **8 credenciais** pra funcionar 100%. Você tem **2 caminhos**:

### Caminho A · Reaproveitar as credenciais que já existem (recomendado pra time Vela Latina)

Você vai usar o MESMO ClickUp + MESMO Supabase que o https://farol-de-clientes.vercel.app — então enxerga os mesmos 58 clientes e edita os mesmos dados.

**Como pegar:** peça pro Daniel te mandar o conteúdo do `.env.local` ou os valores das 8 variáveis. Cole tudo num arquivo novo chamado `.env.local` na raiz do projeto.

> ⚠️ **NUNCA** commita o `.env.local`. Ele está no `.gitignore` por design.

### Caminho B · Criar suas próprias credenciais (outro contexto, outra agência)

Você quer um Farol totalmente independente. Veja **[docs/DEPLOY.md](DEPLOY.md)** que tem o passo a passo de criar conta no ClickUp, Supabase e configurar tudo do zero.

---

### Template do `.env.local`

Independente do caminho, o arquivo precisa ter esse formato:

```bash
# === ClickUp ===
CLICKUP_API_TOKEN=pk_XXXX...
CLICKUP_WORKSPACE_ID=9011315823
CLICKUP_MASTER_LIST_ID=901112849675
CLICKUP_OPERATIONAL_SPACE_ID=90114158210

# === Supabase ===
SUPABASE_URL=https://xxxxxxx.supabase.co
SUPABASE_KEY=sb_publishable_XXXX...

# === Auth ===
FAROL_PASSWORD=qualquer-coisa-que-voce-escolher
FAROL_SECRET=hex-aleatorio-de-64-chars

# === Chatwoot (opcional, pode deixar vazio em dev) ===
CHATWOOT_URL=
CHATWOOT_API_TOKEN=
CHATWOOT_ACCOUNT_ID=
CHATWOOT_INBOX_ID=
CHATWOOT_TARGET_PHONE=
CHATWOOT_TARGET_NAME=
```

Detalhes de cada variável (o que é, como pegar, exemplos): **[docs/ENV.md](ENV.md)**.

**Truques rápidos:**

- **FAROL_PASSWORD**: qualquer string. Exemplo: `farol-vela-2026`. Você vai usar essa senha pra logar no Farol.
- **FAROL_SECRET**: hex de 64 caracteres. Gere com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## Passo 4 · Rodar localmente

Tem 2 modos:

### Modo desenvolvimento (hot reload)

```bash
npm run dev
```

- Abre em http://localhost:3000
- Recarrega sozinho a cada mudança no código
- **Mais lento** e ocasionalmente instável (Next 16 dev mode tem issues)
- Use quando estiver **editando código** ativamente

### Modo produção local (estável, espelha Vercel)

```bash
npm run build
npm start
```

- Abre em http://localhost:3000
- **Mais rápido** e estável
- Não recarrega sozinho — pra ver mudança, pare (`Ctrl+C`) e rode `npm run build && npm start` de novo
- Use quando **só quiser usar o app** ou validar antes de fazer push

---

## Passo 5 · Logar e usar

1. Abre http://localhost:3000 no navegador
2. Vai redirecionar pra `/login`
3. Digita a senha que você definiu em `FAROL_PASSWORD`
4. Cai no Dashboard com seus 58 clientes do ClickUp

Bem-vindo ao Farol 🎉

---

## Estrutura do que você baixou

```
farol-de-clientes/
├── README.md
├── docs/
│   ├── SETUP.md               (este arquivo)
│   ├── DEPLOY.md              (deploy production)
│   ├── ENV.md                 (referência de env vars)
│   └── ARCHITECTURE.md        (overview do código)
├── package.json               (dependências)
├── supabase-schema.sql        (SQL inicial)
├── .env.local.example         (template das credenciais)
├── .env.local                 (suas credenciais — NÃO commita)
├── src/                       (todo o código TypeScript)
│   ├── app/                   (rotas Next.js)
│   ├── components/            (componentes React)
│   └── lib/                   (lógica)
├── public/                    (imagens estáticas)
└── node_modules/              (deps — gitignored)
```

---

## Comandos úteis durante o desenvolvimento

```bash
# Verificar typecheck (sem rodar build completo)
npx tsc --noEmit

# Ver erros de lint
npm run lint

# Limpar cache do Next (se algo estranho começar a acontecer)
rm -rf .next       # Mac/Linux
rmdir /s /q .next  # Windows PowerShell

# Atualizar deps depois de pull
git pull
npm install
```

---

## Atualizar a partir do repositório remoto

```bash
# Verificar se você tem mudanças locais
git status

# Se tudo limpo, pega as últimas mudanças
git pull

# Reinstalar deps se package.json mudou
npm install

# Rebuildar
npm run build
npm start
```

---

## Problemas comuns

### "Module not found" ao rodar
Você esqueceu de fazer `npm install`. Rode e tente de novo.

### "EADDRINUSE: address already in use :::3000"
Já tem alguma coisa rodando na porta 3000. Mate:
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Login não funciona, sempre dá "Senha incorreta"
Confirme que `FAROL_PASSWORD` no `.env.local` é exatamente o que você está digitando. Sem espaço. Sem aspas.

### Dashboard mostra "Modo demo" ou apenas dados mockados
Significa que `CLICKUP_API_TOKEN` não está sendo lido. Verifique:
1. Arquivo se chama exatamente `.env.local` (não `.env`, não `.env.development`)
2. Está na raiz do projeto (mesma pasta de `package.json`)
3. Você reiniciou o servidor depois de criar/editar (`Ctrl+C` e rodar de novo)

### Dashboard fica travado ou muito lento
Em **dev mode** (`npm run dev`) o Next 16 às vezes consome muita memória. Pare (`Ctrl+C`), limpe cache e use produção:
```bash
rm -rf .next   # ou rmdir /s /q .next no Windows
npm run build
npm start
```

### "Supabase não está configurado" ou financeiro não persiste
Verifique:
1. `SUPABASE_URL` está com `https://` no início
2. `SUPABASE_KEY` é a **publishable** (começa com `sb_publishable_`), não a secret
3. A tabela `financials` existe no Supabase (rodou o `supabase-schema.sql`?)

---

## Próximos passos

- Familiarize-se com a UI navegando entre Dashboard, Estratégico, Financeiro, Cliente detalhe
- Edite alguma coisa em `/financeiro` pra ver salvando no Supabase
- Mude o Farol de algum cliente clicando no badge dele no Dashboard
- Quando quiser entender o código: **[docs/ARCHITECTURE.md](ARCHITECTURE.md)**
- Quando quiser hospedar próprio: **[docs/DEPLOY.md](DEPLOY.md)**
