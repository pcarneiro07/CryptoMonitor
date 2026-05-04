# 🚀 Crypto Health Monitor — Guia de Configuração Completo

Este documento explica **passo a passo** tudo que você precisa para rodar o projeto no VS Code.

---

## 📋 Pré-requisitos

Antes de começar, instale:

| Software | Versão Mínima | Download |
|---|---|---|
| Node.js | v18.x ou superior | https://nodejs.org |
| Python | 3.10 ou superior | https://python.org |
| Git | Qualquer versão recente | https://git-scm.com |
| VS Code | Qualquer versão recente | https://code.visualstudio.com |

Para verificar se estão instalados, abra o terminal e rode:
```bash
node --version    # deve mostrar v18.x ou superior
python --version  # deve mostrar 3.10 ou superior
npm --version     # deve mostrar 9.x ou superior
```

---

## 🔑 Chaves de API Necessárias

O projeto precisa de **2 chaves de API**:

### 1. CoinGecko API Key (para os dados de mercado)

**O plano gratuito é suficiente!**

1. Acesse: https://www.coingecko.com/en/api
2. Clique em **"Get Your Free API Key"**
3. Crie uma conta gratuita
4. Acesse o Dashboard → **"Demo API Key"**
5. Copie a chave (começa com `CG-...`)

> ⚠️ **Sem a chave:** O app ainda funciona, mas pode atingir o limite de requisições da API pública (muito restritivo). Com a chave demo gratuita você tem 500 chamadas/mês.

### 2. Anthropic API Key (para o Chatbot IA)

**Necessária para o chatbot funcionar.**

1. Acesse: https://console.anthropic.com
2. Crie uma conta (requer cartão de crédito, mas tem crédito gratuito inicial)
3. Vá em **API Keys** → **Create Key**
4. Copie a chave (começa com `sk-ant-...`)

> 💡 **Custo:** O chatbot usa `claude-haiku-4-5` que é o modelo mais econômico. Para uso em portfólio, o custo será mínimo (centavos de dólar).

---

## 📁 Estrutura do Projeto

```
crypto-health-monitor/
├── frontend/               ← Aplicação React (Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/       ← Chatbot AI
│   │   │   ├── dashboard/  ← KPI Cards, Tabela, Gráficos
│   │   │   ├── heatmap/    ← Market Heatmap
│   │   │   └── ui/         ← Header, Skeleton
│   │   ├── lib/
│   │   │   ├── cryptoData.ts  ← Fetch + Cálculo de KPIs
│   │   │   └── store.ts       ← Estado global (Zustand)
│   │   ├── types/
│   │   │   └── index.ts    ← Tipagem TypeScript completa
│   │   ├── App.tsx         ← Componente principal
│   │   └── main.tsx        ← Entry point
│   ├── .env.example        ← Template das variáveis de ambiente
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                ← API Python (FastAPI) — OPCIONAL
│   ├── main.py             ← Servidor FastAPI
│   ├── requirements.txt
│   └── .env.example
│
└── SETUP.md                ← Este arquivo
```

---

## ⚙️ Configuração — Passo a Passo

### Passo 1: Abrir no VS Code

```bash
# No terminal, navegue até a pasta do projeto
cd crypto-health-monitor

# Abra no VS Code
code .
```

### Passo 2: Configurar as Variáveis de Ambiente do Frontend

1. No VS Code, navegue até a pasta `frontend/`
2. Copie o arquivo `.env.example` e renomeie para `.env`:

```bash
# No terminal integrado do VS Code (Ctrl+` para abrir)
cd frontend
cp .env.example .env
```

3. Abra o arquivo `frontend/.env` e preencha suas chaves:

```env
VITE_COINGECKO_API_KEY=CG-sua-chave-aqui
VITE_ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
```

> ⚠️ **Importante:** O arquivo `.env` NUNCA deve ser enviado para o GitHub. Ele já está no `.gitignore`.

### Passo 3: Instalar Dependências do Frontend

```bash
# No terminal, dentro da pasta frontend/
cd frontend
npm install
```

Isso instalará todas as bibliotecas: React, Tailwind, Recharts, Zustand, etc.
Aguarde até ver "added X packages" sem erros.

### Passo 4: Rodar o Frontend

```bash
# Ainda dentro de frontend/
npm run dev
```

Você verá:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Acesse **http://localhost:5173** no navegador. O dashboard vai carregar!

---

## 🐍 Backend Python (OPCIONAL)

O frontend funciona **sem o backend** — ele chama a CoinGecko API diretamente do browser e usa a Anthropic API para o chatbot.

O backend é útil para:
- Não expor a chave da Anthropic no browser (mais seguro)
- Manter histórico de preços entre sessões
- Rate limiting e cache dos dados

### Configurar o Backend

```bash
# No terminal, dentro da pasta backend/
cd backend

# Criar ambiente virtual Python
python -m venv venv

# Ativar o ambiente virtual
# No Windows:
venv\Scripts\activate
# No Mac/Linux:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env e coloque suas chaves
```

Edite `backend/.env`:
```env
COINGECKO_API_KEY=CG-sua-chave-aqui
ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
```

### Rodar o Backend

```bash
# Dentro de backend/, com o venv ativado
python main.py
```

O backend roda em **http://localhost:8000**

Para ver a documentação automática da API: http://localhost:8000/docs

---

## 🖥️ Rodando Tudo Junto no VS Code

Para rodar frontend e backend simultaneamente, use dois terminais no VS Code:

1. **Terminal 1** (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Terminal 2** (Backend — opcional):
   ```bash
   cd backend
   source venv/bin/activate  # ou venv\Scripts\activate no Windows
   python main.py
   ```

---

## 🔧 Extensões VS Code Recomendadas

Instale estas extensões para melhor experiência:

1. **ESLint** — `dbaeumer.vscode-eslint`
2. **Prettier** — `esbenp.prettier-vscode`  
3. **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
4. **TypeScript Hero** — `rbbit.typescript-hero`
5. **Python** — `ms-python.python`
6. **Thunder Client** — `rangav.vscode-thunder-client` (para testar API)

Para instalar todas de uma vez, abra o terminal no VS Code e rode:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-python.python
```

---

## 🐛 Solução de Problemas Comuns

### "npm: command not found"
→ Node.js não está instalado. Baixe em https://nodejs.org e reinicie o terminal.

### "CoinGecko rate limit reached"
→ A API pública tem limite baixo. Adicione sua chave em `VITE_COINGECKO_API_KEY`.

### O chatbot mostra "Configure a chave de API"
→ Adicione `VITE_ANTHROPIC_API_KEY` no arquivo `frontend/.env`.

### "Module not found" ao rodar npm run dev
→ Rode `npm install` dentro da pasta `frontend/` novamente.

### Erro de CORS ao chamar o backend
→ Certifique-se que o backend está rodando em `localhost:8000`.

### Dados não aparecem (tela de loading infinita)
→ Verifique o console do browser (F12 → Console) para ver a mensagem de erro.
→ Provavelmente é o limite da CoinGecko — aguarde 1 minuto e recarregue.

---

## 📊 Como o Sistema Funciona

```
[CoinGecko API]
      │
      │ a cada 10 minutos
      ▼
[Frontend / Backend]
  - Fetch Top 20 assets
  - Calcula KPIs:
    • Volatility Score (desvio padrão de preços)
    • Sector Dominance (market share por categoria)
    • Volume Velocity (mudança em 30min)
      │
      ▼
[Dashboard React]
  - Market Heatmap (tamanho = Market Cap, cor = variação)
  - KPI Cards (métricas calculadas)
  - Tabela de Assets (ordenável)
  - Gráfico de Setor (pie chart)
  - Volatility Bars
  - Volume Velocity panel
      │
      ▼
[Chatbot AI]
  - Context Snapshot (apenas os KPIs, não preços brutos)
  - Anthropic Claude Haiku via API
  - Responde em pt-BR sobre o mercado
```

---

## 🚀 Build para Produção

Para gerar a versão otimizada do frontend:

```bash
cd frontend
npm run build
```

Os arquivos ficam em `frontend/dist/` e podem ser servidos por qualquer servidor estático (Vercel, Netlify, GitHub Pages).

---

## 📝 Variáveis de Ambiente — Resumo

| Arquivo | Variável | Obrigatória | Onde obter |
|---|---|---|---|
| `frontend/.env` | `VITE_COINGECKO_API_KEY` | Recomendada | coingecko.com/en/api |
| `frontend/.env` | `VITE_ANTHROPIC_API_KEY` | Para o chatbot | console.anthropic.com |
| `backend/.env` | `COINGECKO_API_KEY` | Recomendada | coingecko.com/en/api |
| `backend/.env` | `ANTHROPIC_API_KEY` | Para o chatbot | console.anthropic.com |

---

## 💡 Dicas para o Portfólio

- O projeto demonstra: **Data Engineering** (fetch + KPI calculation), **Data Science** (volatility, statistical anomaly detection), **Frontend** (React, TypeScript, Tailwind, Recharts), e **AI Integration** (LLM context injection)
- Para deploy gratuito: use **Vercel** para o frontend (conecte seu repositório GitHub)
- Para impressionar: mencione o **Context Snapshot** do chatbot como uma técnica de RAG simplificado

---

*Dúvidas? Abra uma issue no repositório ou pergunte ao seu assistente de IA preferido! 🤖*
