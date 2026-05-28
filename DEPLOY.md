# Deploy do Farol de Clientes — passo-a-passo

Tudo já está preparado no código. Você só precisa criar 3 contas e configurar 3 env vars. **Tempo estimado: 15-20 min.**

## Checklist rápido

- [ ] Conta Supabase + projeto + rodar SQL
- [ ] Conta GitHub + criar repo + push
- [ ] Conta Vercel + conectar repo + configurar env vars
- [ ] Primeiro deploy
- [ ] Validar URL pública

---

## 1. Supabase (DB do financeiro)

### 1.1 Criar conta + projeto

1. Vai em **https://supabase.com/dashboard/sign-up** — entra com Google ou GitHub
2. Cria um projeto:
   - Nome: `farol-de-clientes`
   - DB password: clica em **Generate a password** e **anota** (não vamos usar diretamente, mas é bom guardar)
   - Region: **South America (São Paulo)**
   - Pricing plan: **Free**
3. Espera ~2 min o projeto provisionar

### 1.2 Rodar o schema

1. No menu lateral, clica em **SQL Editor**
2. Clica em **+ New query**
3. Abre o arquivo `supabase-schema.sql` deste projeto, copia o conteúdo todo
4. Cola no editor e clica **Run** (ou Ctrl+Enter)
5. Deve aparecer "Success. No rows returned"

### 1.3 Pegar as credenciais

1. No menu lateral, clica em **Settings** (engrenagem) → **API**
2. Copia 2 coisas:
   - **Project URL** (algo como `https://xxxxxxxxx.supabase.co`)
   - **anon public** key (longa, começa com `eyJ...`)
3. Guarda essas 2 strings — vai usar daqui a pouco

---

## 2. GitHub (versionar e dar pro Vercel)

### 2.1 Criar conta (se não tiver)

1. **https://github.com/signup**
2. Confirma email

### 2.2 Criar repo

1. Acessa **https://github.com/new**
2. Repository name: `farol-de-clientes`
3. Marca como **Private** (importante — código tem referência a IDs do ClickUp)
4. **NÃO** marca "Initialize with README" (já temos)
5. Clica **Create repository**

### 2.3 Subir o código

No GitHub mostra os comandos. Abre PowerShell em `D:\farol-de-clientes` e roda:

```powershell
cd D:\farol-de-clientes
git remote add origin https://github.com/SEU_USUARIO/farol-de-clientes.git
git branch -M main
git push -u origin main
```

Vai pedir login (use **Personal Access Token** se a senha não funcionar — GitHub não aceita mais senha simples).

Pra criar token: https://github.com/settings/tokens → Generate new token (classic) → scope `repo`.

---

## 3. Vercel (hospedar a app)

### 3.1 Criar conta

1. **https://vercel.com/signup** — entra com GitHub (mais rápido)
2. Autoriza o GitHub a falar com Vercel

### 3.2 Importar o projeto

1. Em **https://vercel.com/new** procura `farol-de-clientes`
2. Clica **Import**
3. Em **Configure Project**:
   - Framework Preset: Next.js (detecta automaticamente)
   - Root Directory: deixa `./`
   - Build/Output: defaults (não muda nada)
4. Em **Environment Variables**, cola tudo de uma vez (vai uma por uma):

| Nome | Valor |
|---|---|
| `CLICKUP_API_TOKEN` | seu token do ClickUp (do `.env.local`) |
| `CLICKUP_WORKSPACE_ID` | `9011315823` |
| `CLICKUP_MASTER_LIST_ID` | `901112849675` |
| `CLICKUP_OPERATIONAL_SPACE_ID` | `90114158210` |
| `SUPABASE_URL` | Project URL do Supabase (passo 1.3) |
| `SUPABASE_KEY` | anon public key do Supabase (passo 1.3) |
| `FAROL_PASSWORD` | escolha uma senha forte — vai compartilhar com 3 pessoas |
| `FAROL_SECRET` | gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

5. Clica **Deploy**
6. Aguarda ~2-3 min

### 3.3 Validar

Quando terminar, a Vercel te dá uma URL tipo `https://farol-de-clientes-xxxx.vercel.app`.

1. Abre essa URL no navegador
2. Vai redirecionar pra `/login` automaticamente
3. Digita a senha que você definiu em `FAROL_PASSWORD`
4. Deve cair no Dashboard com seus 57 clientes reais ✅

---

## 4. Opcional: domínio próprio

Se quiser `farol.netzach.com.br` em vez de `xxx.vercel.app`:

1. Compra o domínio (Registro.br, Namecheap, etc.)
2. Na Vercel: Project → Settings → Domains → Add
3. Cola o domínio
4. Segue as instruções de DNS (CNAME ou A record)
5. Espera propagação (~30 min)

---

## 5. Migrar dados existentes do JSON local

Se você já preencheu algum cliente em `/financeiro` localmente e quer levar pro Supabase:

1. Abre `data/financials.local.json`
2. Pra cada entrada, vai em Supabase → Table Editor → financials → Insert row
3. Ou usa o SQL Editor pra fazer um INSERT em batch

Se você está começando do zero, ignora — basta preencher direto pela URL pública depois do deploy.

---

## Troubleshooting

### "Module not found" no build da Vercel
Roda `npm install` localmente, commita o `package-lock.json` atualizado, push de novo.

### Login não funciona em produção
Confirma que `FAROL_PASSWORD` está setada na Vercel (Project → Settings → Environment Variables). Reimplanta depois de mudar (Vercel re-deploy automático).

### "Faturamento não salva" em produção
Confirma `SUPABASE_URL` e `SUPABASE_KEY` na Vercel. Verifica se o SQL rodou (Supabase → Table Editor → deve ter a tabela `financials`).

### Ver logs
Vercel → Project → Deployments → último deploy → Functions → ver runtime logs.

---

## Status do código

Tudo já está pronto pra deploy:
- ✅ Git inicializado
- ✅ Supabase client instalado
- ✅ `lib/clients.ts` lê/escreve do Supabase com fallback pro arquivo
- ✅ Auth com senha implementado (middleware + login page + cookie)
- ✅ `.env.local.example` documentado
- ✅ `supabase-schema.sql` pronto pra colar

**Custo total estimado por mês:** R$ 0 (free tier de Supabase + Vercel suporta o volume da agência tranquilamente).
