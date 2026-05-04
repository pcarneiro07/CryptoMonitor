# Crypto Health Monitor

Um dashboard de análise de mercado cripto em tempo real que combina dados de preço, volatilidade, volume e saúde DeFi em uma única interface. O projeto nasceu de uma frustração simples: a maioria das ferramentas de monitoramento cripto mostra *o quê* está acontecendo, mas raramente explica *como* interpretar isso.

---

## Por que isso existe

Quem acompanha mercado cripto enfrenta pelo menos três problemas recorrentes:

**Excesso de dado, falta de contexto.** Plataformas como CoinMarketCap e CoinGecko entregam preços e variações, mas deixam para você a tarefa de cruzar volatilidade com volume, identificar anomalias e entender se o mercado está saudável ou não.

**Dados em silos.** O preço do Bitcoin está numa aba. O TVL do DeFi está em outra. O Fear & Greed Index em uma terceira. Não existe uma visão integrada que mostre tudo num contexto coerente.

**Ferramentas boas custam caro.** Plataformas analíticas profissionais (Glassnode, Nansen, Messari Pro) têm planos que chegam na casa dos centenas de dólares por mês. Para estudo, portfólio pessoal ou projetos acadêmicos, isso é inviável.

O Crypto Health Monitor tenta resolver os três: agrega múltiplas fontes gratuitas, calcula métricas derivadas com lógica própria e entrega tudo em um único painel com histórico persistente e um chatbot que fala sobre o que está acontecendo agora.

---

## O que o projeto faz

- Monitora os 20 maiores ativos por market cap em tempo real (via CoinGecko)
- Calcula um **Market Health Score** de 0 a 100 que consolida momentum, volatilidade, volume, amplitude de mercado, sentimento e saúde DeFi
- Detecta **anomalias de volume** estatisticamente (desvio padrão > 2σ em relação aos demais ativos)
- Gera **alertas automáticos** por heurísticas: quedas amplas, volatilidade extrema, pressão setorial
- Exibe um **heatmap interativo** onde o tamanho do bloco representa market cap e a cor representa variação de preço
- Mantém **histórico persistente em SQLite** com suporte a backfill dos últimos 7–30 dias
- Oferece um **chatbot AI** (via Ollama, rodando localmente) que recebe um snapshot do estado atual do mercado como contexto e responde perguntas sobre o que está acontecendo
- Integra dados de **DeFiLlama** (TVL por chain e protocolo) e **Alternative.me** (Fear & Greed Index)

---

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | React + TypeScript + Vite | Tipagem forte + HMR rápido |
| Estilo | Tailwind CSS + Glass morphism | Dark mode nativo, customizável |
| Charts | Recharts | Componentes React nativos, simples de estender |
| Estado | Zustand | Menor boilerplate que Redux, suficiente para este caso |
| Animações | Framer Motion | Transições fluidas sem overhead |
| Backend | Python + FastAPI | Async nativo, OpenAPI automático, fácil de escalar |
| Banco | SQLite (via `sqlite3`) | Zero configuração, persistência local, bom para séries temporais leves |
| LLM local | Ollama (`llama3.1:8b`) | Sem custo de API, sem dados saindo da máquina |
| Dados de mercado | CoinGecko API (plano demo gratuito) | Cobertura ampla, plano gratuito viável |
| Dados DeFi | DeFiLlama API (pública) | Melhor fonte aberta de TVL |
| Sentimento | Alternative.me Fear & Greed (pública) | Endpoint simples, histórico disponível |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / UI                        │
│                                                         │
│  React App (Vite, TypeScript, Tailwind)                 │
│  ├── Zustand Store  (estado global + polling)           │
│  ├── cryptoData.ts  (lógica de negócio + KPIs)         │
│  └── Componentes    (dashboard, chat, UI)               │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP / JSON  (/api/*)
┌───────────────────▼─────────────────────────────────────┐
│                  FastAPI Backend                         │
│                                                         │
│  main.py                                                │
│  ├── /api/dashboard     → CoinGecko + Fear&Greed        │
│  │                        + DeFiLlama + SQLite          │
│  ├── /api/chat          → Ollama (LLM local)            │
│  ├── /api/database/*    → SQLite (resumo, histórico)    │
│  └── /api/database/backfill/* → coleta histórica        │
│                                                         │
│  database.py                                            │
│  └── SQLite  (7 tabelas, WAL mode)                      │
└─────────────────────────────────────────────────────────┘
         │              │               │
    CoinGecko      DeFiLlama      Alternative.me
    (preços)         (TVL)         (Fear & Greed)
```

O frontend nunca chama APIs externas diretamente em produção — tudo passa pelo backend. Isso evita expor chaves de API no navegador e centraliza o rate limiting.

> **Exceção no modo dev:** Se você rodar só o frontend sem o backend, ele pode chamar o CoinGecko diretamente via variável de ambiente `VITE_COINGECKO_API_KEY`. O chatbot, nesse caso, ficará inoperante porque a chave Anthropic não deve ficar no browser.

---

## Pré-requisitos

```bash
node --version   # >= 18.x
python --version # >= 3.10
npm --version    # >= 9.x
```

Para o chatbot funcionar localmente:

```bash
# Instale o Ollama (macos/linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Baixe o modelo (4–5 GB)
ollama pull llama3.1:8b

# Rode o servidor Ollama em background
ollama serve
```

---

## Instalação e execução

### 1. Clone o repositório

```bash
git clone https://github.com/pcarneiro07/CryptoMonitor.git
cd CryptoMonitor
```

### 2. Configure o backend

```bash
cd backend

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env e preencha:
# COINGECKO_API_KEY=CG-...
# (ANTHROPIC_API_KEY não é necessário — o chatbot usa Ollama local)
```

### 3. Rode o backend

```bash
# Dentro de backend/, com venv ativado
python main.py
# Servidor sobe em http://localhost:8000
# Documentação automática em http://localhost:8000/docs
```

### 4. Configure o frontend

```bash
cd ../frontend
npm install

cp .env.example .env
# Edite frontend/.env:
# VITE_COINGECKO_API_KEY=CG-...   (opcional, mas evita rate limit)
```

### 5. Rode o frontend

```bash
npm run dev
# Acesse http://localhost:5173
```

---

## Obtenção das chaves de API

**CoinGecko (recomendado, gratuito):**
1. Acesse [coingecko.com/en/api](https://www.coingecko.com/en/api)
2. Crie uma conta e gere uma Demo API Key
3. A chave começa com `CG-`
4. O plano demo oferece 10–30 chamadas/minuto — suficiente para este projeto

**Sem chave:** o dashboard ainda funciona, mas pode atingir o rate limit da API pública rapidamente se houver múltiplos usuários ou chamadas frequentes.

---

## Módulos em detalhe

### Backend

#### `backend/main.py`

O coração do servidor. Estrutura em seções:

**Startup:** ao iniciar, o servidor lê os snapshots mais recentes do SQLite e popula um histórico em memória (`price_history`). Isso garante que o cálculo de volatilidade já tenha dados desde a primeira requisição, sem precisar esperar 20–30 minutos de coleta ao vivo.

**`/api/dashboard`:** rota principal. Faz três chamadas em paralelo — CoinGecko, Fear & Greed Index e DeFiLlama — usando `asyncio.gather`. Se o CoinGecko falhar ou atingir rate limit, retorna o último snapshot salvo no SQLite com um aviso no campo `databaseWarning`. As outras duas fontes são tratadas como opcionais: se falharem, o dashboard segue funcionando sem elas.

**Cálculo de volatilidade:** usa desvio padrão sobre o histórico de preços em memória (até 12 pontos, coletados a cada 10 minutos). O resultado é normalizado de 0 a 100 em relação ao grupo atual para facilitar comparação relativa.

**Detecção de anomalia de volume:** compara a variação de volume de cada ativo com a média e desvio padrão do grupo. Ativos com `|variação - média| > 2σ` são marcados como anomalia.

**`/api/chat`:** recebe mensagens e contexto do frontend e repassa para o Ollama via HTTP. Sem streaming — aguarda a resposta completa antes de retornar. Timeout de 90 segundos.

**Backfill (`/api/database/backfill/*`):** processo em background que busca histórico de cada ativo via endpoint `market_chart` do CoinGecko. Processa um ativo por vez com pausa configurável entre chamadas para respeitar o rate limit. Permite iniciar, acompanhar progresso e parar.

#### `backend/database.py`

Camada de persistência com 7 tabelas:

| Tabela | O que guarda |
|---|---|
| `assets` | Cadastro de ativos (id, símbolo, nome, categoria, rank) |
| `asset_snapshots` | Preço, volume, market cap e variações por timestamp |
| `market_snapshots` | KPIs globais: market cap total, volume, dominância BTC/ETH, Fear & Greed |
| `sector_snapshots` | Distribuição de market cap por categoria de ativo |
| `volatility_snapshots` | Score de volatilidade por ativo por timestamp |
| `volume_velocity_snapshots` | Aceleração de volume por ativo por timestamp |
| `defillama_snapshots` | TVL total, top chains e top protocolos por timestamp |

O banco usa `WAL mode` (Write-Ahead Logging), que permite leituras concorrentes durante escritas — importante porque o frontend lê o banco enquanto o backfill está gravando. Todas as inserções usam `INSERT OR IGNORE` para evitar duplicatas sem precisar checar antes.

A função `get_latest_dashboard_snapshot()` reconstrói um payload completo de dashboard a partir das tabelas — usada como fallback quando o CoinGecko está indisponível.

---

### Frontend

#### `src/lib/cryptoData.ts`

Todo o processamento analítico acontece aqui, no cliente. As principais funções:

**`enrichDashboardData(raw)`:** transforma o payload bruto da API em um objeto `DashboardData` completo. Chama as três funções abaixo em sequência.

**`buildRiskRanking(assets, volatility, volume)`:** calcula um score de risco de 0 a 100 para cada ativo combinando quatro componentes:
- Volatilidade normalizada (peso 42%)
- Drawdown recente — queda em 24h (peso 22%)
- Aceleração de volume (peso 16%)
- Distância da máxima histórica — ATH (peso 12%)
- Bônus de +15 se for anomalia de volume

**`buildMarketAlerts(data, riskRanking)`:** gera alertas por heurísticas simples. Exemplos: mercado caindo mais de 2% → alerta de queda; ativo com riskScore ≥ 70 → alerta de risco; setor com variação média ≤ -1% → alerta setorial.

**`buildMarketHealthScore(data, riskRanking, alerts)`:** calcula o score de saúde em 7 componentes com pesos distintos:

| Componente | Peso | Lógica |
|---|---|---|
| Momentum | 22% | `50 + marketCapChange24h * 8` |
| Volatilidade | 20% | `100 - avgVolatility` |
| Risco | 20% | `100 - avgRisk (top 10)` |
| Amplitude | 16% | `% de ativos positivos em 24h` |
| Volume | 15% | `100 - anomalyCount * 12` |
| Sentimento | 7% | Fear & Greed Index direto (0–100) |
| DeFi | 5% | `50 + tvlChange24h * 10` (limitado a 0–100) |

**`buildContextSnapshot(data)`:** prepara um objeto enxuto com os KPIs mais relevantes para ser enviado como contexto para o chatbot. Evita mandar o payload completo (que incluiria dados brutos desnecessários para o LLM).

#### `src/lib/store.ts`

Store Zustand com polling automático. Ao chamar `startPolling()`, quatro intervalos são iniciados:

- **Dados do dashboard:** a cada 10 minutos
- **Countdown visual:** a cada 1 segundo
- **Status do backfill:** a cada 3 segundos (para atualizar a barra de progresso)
- **Resumo do banco:** a cada 15 segundos

Todos os intervalos são limpos pelo retorno de `startPolling()` (padrão cleanup do `useEffect`).

#### `src/types/index.ts`

Tipagem completa do projeto. Os tipos principais que vale conhecer:

- `DashboardData` — payload completo do dashboard
- `MarketHealthScore` — score com componentes e razões
- `RiskRankingItem` — perfil de risco por ativo (alias: `AssetRiskProfile`)
- `MarketAlert` — alerta com severidade, tipo e métricas
- `DeFiLlamaSnapshot` — dados de TVL, chains e protocolos
- `BackfillStatus` — estado do processo de backfill em background

#### Componentes

**`MarketHealthOverview`:** seção principal do dashboard. Exibe o score, a classificação (Saudável / Neutro / Atenção / Risco elevado), as razões textuais e seis barras de progresso para os componentes individuais. A cor da borda e dos textos muda dinamicamente com o `tone` do score.

**`MarketHeatmap`:** grid de blocos onde cada ativo é representado por um retângulo. O tamanho é proporcional ao market cap (escala linear, mínimo 60px, máximo 180px de largura). A cor vai do vermelho (queda > 5%) ao verde (alta > 5%) passando por cinza. Toggle entre 1h e 24h no canto superior. Tooltip detalhado ao hover.

**`RiskReturnMatrix`:** scatter chart do Recharts com eixo X = variação 24h, eixo Y = volatilidade normalizada, e tamanho da bolha = market cap. Cada ativo é colorido pela categoria do setor. Útil para identificar visualmente o quadrante de estresse (alto risco, retorno negativo).

**`DatabaseExplorer`:** painel de administração do SQLite local. Exibe contadores de registros por tabela, período coberto, e permite iniciar/parar o backfill com barra de progresso em tempo real.

**`Chatbot`:** componente flutuante no canto inferior direito. Mantém histórico de mensagens em estado local. Ao enviar, monta um system prompt com o snapshot de contexto atual e envia todo o histórico para `/api/chat`. Sugestões de perguntas aparecem enquanto há menos de 3 mensagens.

**`MetricTooltip`:** botão de info (ícone `i`) que abre um modal com explicação de cada métrica — o quê é, como é calculada, como interpretar e caveats. Renderizado via `createPortal` para evitar problemas de z-index.

---

## Fluxo de dados completo

```
Usuário abre o browser
        │
        ▼
App.tsx → startPolling()
        │
        ▼
store.fetchData()
        │
        ▼
GET /api/dashboard
        │
        ├── CoinGecko /coins/markets (top 20)
        ├── Alternative.me /fng/ (Fear & Greed)
        └── DeFiLlama /v2/chains + /protocols
                │
                ▼
        build_dashboard() no backend
        ├── normaliza assets
        ├── atualiza price_history em memória
        ├── calcula volatilidade (std dev)
        └── detecta anomalias de volume (2σ)
                │
                ▼
        save_dashboard_snapshot() → SQLite
                │
                ▼
        retorna JSON para o frontend
                │
                ▼
enrichDashboardData() no frontend
        ├── buildRiskRanking()
        ├── buildMarketAlerts()
        └── buildMarketHealthScore()
                │
                ▼
        Zustand store.data atualizado
                │
                ▼
        Componentes React rerenderizam
```

---

## Banco de dados

O SQLite fica em `backend/data/crypto_monitor.db`. Para inspecionar manualmente:

```bash
sqlite3 backend/data/crypto_monitor.db

# Ver todas as tabelas
.tables

# Ver últimos snapshots de mercado
SELECT * FROM market_snapshots ORDER BY timestamp DESC LIMIT 5;

# Ver volatilidade mais recente
SELECT symbol, score, level FROM volatility_snapshots
WHERE timestamp = (SELECT MAX(timestamp) FROM volatility_snapshots)
ORDER BY score DESC;

# Contar registros históricos por ativo
SELECT symbol, COUNT(*) as registros
FROM asset_snapshots
GROUP BY symbol
ORDER BY registros DESC;
```

---

## Backfill histórico

O backfill busca dados históricos de cada ativo via endpoint `market_chart` do CoinGecko, que retorna preço, market cap e volume em intervalos automáticos (diário para períodos > 90 dias, por hora para períodos menores).

Para iniciar pelo painel:
1. Acesse o `DatabaseExplorer` no dashboard
2. Clique em "Iniciar backfill 7d"
3. Acompanhe o progresso na barra

Para iniciar via API diretamente:

```bash
# Backfill de 7 dias, top 20 ativos
curl -X POST "http://localhost:8000/api/database/backfill/start?days=7&limit=20&delay_seconds=1.2"

# Verificar progresso
curl http://localhost:8000/api/database/backfill/status

# Parar se necessário
curl -X POST http://localhost:8000/api/database/backfill/stop
```

O parâmetro `delay_seconds` controla a pausa entre ativos para respeitar o rate limit da CoinGecko. O valor padrão de 1.2 segundos é seguro para o plano demo.

---

## Chatbot

O chatbot usa Ollama rodando localmente — nenhum dado sai da máquina. O modelo padrão é `llama3.1:8b`, que roda bem em máquinas com 8+ GB de RAM.

Para trocar o modelo, edite o `.env` do backend:

```env
OLLAMA_MODEL=llama3.2:3b      # mais leve, respostas mais rápidas
OLLAMA_MODEL=llama3.1:70b     # mais preciso, requer GPU ou muita RAM
```

O system prompt enviado junto com cada mensagem inclui um snapshot JSON do estado atual do mercado: KPIs, score de saúde, top gainer/loser, ranking de risco, alertas e dominância setorial. Isso permite que o modelo responda sobre o mercado atual sem precisar de acesso à internet.

---

## Build para produção

```bash
# Frontend
cd frontend
npm run build
# Gera frontend/dist/ pronto para deploy estático

# Para servir localmente após o build
npm run preview

# Backend (com gunicorn em produção)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Deploy gratuito sugerido:** Vercel para o frontend (conecte o repositório GitHub e configure `frontend` como root directory). O backend pode rodar em Railway, Fly.io ou em qualquer VPS com Python.

---

## Variáveis de ambiente

**`backend/.env`**

| Variável | Padrão | Descrição |
|---|---|---|
| `COINGECKO_API_KEY` | `""` | Chave demo CoinGecko (recomendado) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL do servidor Ollama |
| `OLLAMA_MODEL` | `llama3.1:8b` | Modelo a usar |

**`frontend/.env`**

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_BASE_URL` | `""` (mesmo host) | URL base do backend em produção |
| `VITE_COINGECKO_API_KEY` | `""` | Apenas para modo sem backend |

---

## Limitações conhecidas

**Volatilidade nos primeiros minutos:** o histórico de preços em memória começa vazio. O servidor tenta populá-lo a partir do SQLite no startup, mas se o banco estiver vazio (primeira execução), as métricas de volatilidade ficam menos confiáveis até acumular alguns ciclos de coleta.

**Volume velocity zerado inicialmente:** a mesma limitação se aplica à aceleração de volume. A métrica fica mais significativa após 3+ coletas (≈ 30 minutos).

**Rate limit CoinGecko sem chave:** a API pública tem limites bem restritivos. Com uso intenso ou múltiplos usuários, pode atingir o limite e o dashboard cairá para o fallback do SQLite. Recomenda-se usar a Demo Key gratuita.

**TVL vs. fluxo real:** a variação de TVL que alimenta o componente DeFi do score pode subir simplesmente porque os ativos depositados valorizaram, sem entrada real de novo capital. Isso é uma limitação inerente à métrica de TVL.

**Chatbot lento em CPU:** o modelo `llama3.1:8b` pode levar 20–60 segundos por resposta em CPUs sem aceleração. Em máquinas com GPU, a latência cai para 2–5 segundos.

---

## Contribuindo

O projeto não tem guidelines formais ainda, mas algumas coisas ajudam:

- Rode `npm run lint` antes de abrir um PR no frontend
- Mantenha a tipagem TypeScript — evite `any` salvo nos casos já existentes na `Asset` interface
- Novos componentes de dashboard devem incluir um `MetricTooltip` explicando a métrica
- Mudanças no schema do banco devem incluir migração ou instrução para recriar o `.db`

---

## Licença

MIT. Use, modifique e distribua à vontade.
