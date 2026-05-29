# Farol de Clientes

Hub interno de gestão de clientes para agências. Cada cliente tem um status visual (🟢 verde / 🟡 amarelo / 🔴 vermelho) que reflete a saúde da conta. O Farol cruza dados do **ClickUp** (operação) com um **Supabase** (financeiro privado) e gera análises estratégicas pro Head: priorização semanal, sinais sistêmicos por nicho/CSM, LTV, retenção, e checklists de otimização baseados em reclamações reais (nunca desconto).

**Live demo (Vela Latina):** https://farol-de-clientes.vercel.app

---

## 📦 O que é isso

- **Projeto Next.js 16 + TypeScript + Tailwind 4** versionado neste repositório
- **Não é um "exportado"** — é o código-fonte. Pra replicar, clone via Git
- **Stack**:
  - Front-end + back-end: Next.js (App Router, RSC)
  - Banco: Supabase (Postgres gerenciado)
  - Operação: ClickUp REST API (leitura + escrita de custom fields)
  - Hospedagem: Vercel (free tier suficiente)
  - Auth: senha única compartilhada via cookie httpOnly
  - Notificação: Chatwoot (opcional, WhatsApp em clientes críticos)

---

## 🚀 Quero rodar / replicar — por onde começo?

| Cenário | Documento |
|---|---|
| Quero rodar **no meu computador** (localhost) | **[docs/SETUP.md](docs/SETUP.md)** |
| Quero hospedar **um Farol próprio** (outra agência, outro contexto) | [docs/DEPLOY.md](docs/DEPLOY.md) |
| Preciso da **lista completa de variáveis** de ambiente | [docs/ENV.md](docs/ENV.md) |
| Quero **entender o código** pra contribuir / customizar | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

---

## ⚡ TL;DR — rodar local em 5 minutos

Pré-requisitos: Node 20+, Git, editor de código.

```bash
# 1. Clonar
git clone https://github.com/Lobatoias/farol-de-clientes.git
cd farol-de-clientes

# 2. Instalar
npm install

# 3. Configurar credenciais (peça pro Daniel ou crie suas — ver docs/SETUP.md)
cp .env.local.example .env.local
# Edite .env.local com as credenciais

# 4. Rodar em produção local
npm run build
npm start

# 5. Abrir
# http://localhost:3000
```

Login com a senha definida em `FAROL_PASSWORD` no `.env.local`.

---

## ✨ Features atuais

- **Dashboard** com 8 KPIs (clientes por status, investimento sob gestão, faturamento, LTV)
- **Farol por cliente** editável inline (clica no badge, escolhe verde/amarelo/vermelho, salva no ClickUp via API)
- **Estratégica** com 4 seções de insights baseados em dados reais (resumo executivo, priorize esta semana, sinais sistêmicos, higiene de dados)
- **Financeiro privado** (mensalidade, contratos, LTV) em Supabase — fora do ClickUp
- **Distribuição por nicho** com donut chart interativo (hover destaca segmento)
- **Notificação WhatsApp via Chatwoot** quando cliente vira vermelho (opcional)
- **Auth** por senha única compartilhada (3 pessoas usam a mesma)
- **Multi-instância consistente** (sem cache em memória — todos veem os mesmos dados)
- **Plano de otimização** por categoria — checklists com passos práticos baseados em reclamações reais do cliente. *Nunca desconto.*

---

## 🛣️ Roadmap

- [ ] Plugar IA real (Claude API) substituindo mocks de análise
- [ ] Multi-user com Supabase Auth (cada CSM com login próprio)
- [ ] Comentários das tasks na timeline do cliente
- [ ] Histórico de mudanças de status com gráfico
- [ ] Export de relatórios PDF/CSV
- [ ] Forecast de churn baseado em sinais

---

## 📂 Estrutura do repositório

```
farol-de-clientes/
├── README.md                  ← você está aqui
├── docs/
│   ├── SETUP.md               ← rodar localhost passo a passo
│   ├── DEPLOY.md              ← hospedar próprio (Supabase + GitHub + Vercel)
│   ├── ENV.md                 ← referência de env vars
│   └── ARCHITECTURE.md        ← visão técnica do código
├── supabase-schema.sql        ← SQL pra criar a tabela do financeiro
├── .env.local.example         ← template das env vars
├── src/
│   ├── app/                   ← rotas Next.js (App Router)
│   ├── components/            ← componentes React
│   ├── lib/                   ← lógica de negócio + clients de API
│   └── middleware.ts          ← auth middleware
└── data/
    └── financials.example.json ← exemplo de fallback financeiro (modo dev)
```

---

## 🤝 Contribuindo

Quer adicionar feature, ajustar texto ou consertar bug?

1. Clona o repo (ou faz fork)
2. Cria branch: `git checkout -b feature/minha-mudanca`
3. Roda local (`npm run build && npm start`) e testa
4. Commit + push pra sua branch
5. Abre PR no GitHub

A Vercel automaticamente cria um **preview deployment** pra cada PR — você consegue testar antes de merge.

---

## 📞 Suporte

- **Daniel Lobato** (Head da Vela Latina) — referência principal do produto
- Issues técnicas: abra no GitHub
- Setup: leia [docs/SETUP.md](docs/SETUP.md) — cobre 95% dos casos

---

## 📄 Licença

Este projeto é de uso interno. Tudo aqui é propriedade da Vela Latina. Quem clonar/forkar deve manter o crédito de origem e não distribuir publicamente sem autorização prévia.
