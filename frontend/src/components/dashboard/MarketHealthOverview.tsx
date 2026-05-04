import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, TrendingUp } from 'lucide-react';
import type { DashboardData, MarketHealthScore } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface MarketHealthOverviewProps {
  data: DashboardData;
}

type ToneKey = 'positive' | 'neutral' | 'warning' | 'critical' | 'danger' | 'healthy' | 'risk';

const toneMap: Record<
  ToneKey,
  { text: string; bg: string; border: string; icon: JSX.Element; label: string }
> = {
  positive: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle2 size={18} />,
    label: 'Saudável',
  },
  healthy: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle2 size={18} />,
    label: 'Saudável',
  },
  neutral: {
    text: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: <Activity size={18} />,
    label: 'Neutro',
  },
  warning: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <AlertTriangle size={18} />,
    label: 'Atenção',
  },
  critical: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <ShieldAlert size={18} />,
    label: 'Crítico',
  },
  danger: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <ShieldAlert size={18} />,
    label: 'Crítico',
  },
  risk: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <ShieldAlert size={18} />,
    label: 'Risco',
  },
};

const COMPONENT_TOOLTIPS = {
  momentum: {
    title: 'Momentum',
    description:
      'Indica se o recorte monitorado está ganhando ou perdendo força no curto prazo.',
    calculation:
      'Usa principalmente a variação ponderada de market cap em 24h. Ativos maiores têm mais peso no cálculo.',
    interpretation:
      'Valores mais altos sugerem melhora de direção do mercado; valores baixos indicam perda de força ou pressão vendedora.',
    caveat:
      'Momentum não prevê continuidade. Ele mostra o estado recente do mercado, não uma recomendação de compra ou venda.',
  },
  volatility: {
    title: 'Volatilidade',
    description:
      'Resume o nível de oscilação dos ativos monitorados.',
    calculation:
      'Combina os scores relativos de volatilidade calculados para cada ativo, usando o histórico recente disponível.',
    interpretation:
      'Quanto maior o componente, mais controlada está a volatilidade. Quanto menor, maior o nível de instabilidade.',
    caveat:
      'Nos primeiros minutos de coleta, o histórico ainda é pequeno. A leitura fica mais confiável com mais snapshots.',
  },
  volume: {
    title: 'Volume',
    description:
      'Avalia se há aceleração ou anomalia no volume negociado dos ativos.',
    calculation:
      'Compara o volume atual com o histórico recente salvo ou coletado durante a sessão.',
    interpretation:
      'Volume muito fora do padrão pode indicar reação do mercado a notícias, fluxo incomum ou aumento de especulação.',
    caveat:
      'Volume alto não indica sozinho direção de preço. Pode acompanhar tanto movimentos de alta quanto de queda.',
  },
  breadth: {
    title: 'Amplitude',
    description:
      'Mostra se a força do mercado está espalhada entre vários ativos ou concentrada em poucos nomes.',
    calculation:
      'Calcula a proporção de ativos positivos no recorte de 24h.',
    interpretation:
      'Uma amplitude alta indica que mais ativos estão participando do movimento. Amplitude baixa sugere mercado mais fraco ou concentrado.',
    caveat:
      'A leitura depende do recorte de ativos monitorados. Não representa necessariamente todo o mercado cripto.',
  },
  sentiment: {
    title: 'Sentimento',
    description:
      'Camada de humor geral do mercado, pensada para incorporar indicadores como Fear & Greed.',
    calculation:
      'Quando disponível, usa fonte externa de sentimento. Quando indisponível, fica em valor neutro para não distorcer a nota.',
    interpretation:
      'Ajuda a entender se o mercado está mais dominado por medo, neutralidade ou euforia.',
    caveat:
      'Sentimento é leitura complementar. Não deve ser usado isoladamente como sinal de compra ou venda.',
  },
  defi: {
    title: 'DeFi',
    description:
      'Camada de saúde do ecossistema DeFi, pensada para considerar TVL, protocolos e chains.',
    calculation:
      'Quando disponível, usa dados externos como DeFiLlama. Quando indisponível, fica neutro para não distorcer a nota.',
    interpretation:
      'Ajuda a observar se há expansão ou retração da atividade em protocolos e redes DeFi.',
    caveat:
      'TVL pode variar por preço dos ativos depositados, não apenas por entrada ou saída real de capital.',
  },
};

function getTone(marketHealth?: MarketHealthScore) {
  const rawTone = marketHealth?.tone || marketHealth?.status || 'neutral';
  const normalized = String(rawTone).toLowerCase();

  if (normalized.includes('risco')) return toneMap.risk;
  if (normalized.includes('crítico') || normalized.includes('critico')) return toneMap.critical;
  if (normalized.includes('atenção') || normalized.includes('atencao')) return toneMap.warning;
  if (normalized.includes('saudável') || normalized.includes('saudavel')) return toneMap.positive;
  if (normalized in toneMap) return toneMap[normalized as ToneKey];

  return toneMap.neutral;
}

function getSafeMarketHealth(data: DashboardData): MarketHealthScore {
  return (
    data.marketHealth ?? {
      score: 50,
      label: 'Neutro',
      status: 'Neutro',
      tone: 'neutral',
      drivers: ['Aguardando cálculo completo do score de saúde do mercado.'],
      reasons: ['Aguardando cálculo completo do score de saúde do mercado.'],
      components: {
        momentum: 50,
        volatility: 50,
        volume: 50,
        breadth: 50,
        sentiment: 50,
        defi: 50,
      },
    }
  );
}

function ComponentBar({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number;
  tooltip: {
    title: string;
    description: string;
    calculation: string;
    interpretation: string;
    caveat: string;
  };
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{label}</span>

          <MetricTooltip
            title={tooltip.title}
            description={tooltip.description}
            calculation={tooltip.calculation}
            interpretation={tooltip.interpretation}
            caveat={tooltip.caveat}
          />
        </div>

        <span className="number-mono text-xs text-slate-500">
          {Math.round(safeValue)}/100
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export function MarketHealthOverview({ data }: MarketHealthOverviewProps) {
  const marketHealth = getSafeMarketHealth(data);
  const tone = getTone(marketHealth);
  const marketKPIs = data.marketKPIs;
  const defiLlama = data.defiLlama ?? null;
  const reasons = marketHealth.reasons ?? marketHealth.drivers ?? [];

  return (
    <section className={`glass-card border ${tone.border} p-5`}>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${tone.bg} ${tone.border} ${tone.text}`}>
              {tone.icon}
              <span className="text-xs font-medium uppercase tracking-[0.18em]">
                Market Health
              </span>
            </div>

            <MetricTooltip
              title="Market Health Score"
              description="Nota sintética de 0 a 100 criada para resumir a saúde do mercado monitorado. Ela transforma várias leituras do dashboard em um único sinal executivo."
              calculation="Combina momentum de preço, volatilidade, volume, amplitude do movimento, sentimento externo e saúde DeFi. Cada componente é convertido para escala de 0 a 100 e consolidado em uma nota final."
              interpretation="Use como leitura de abertura: ele indica o estado geral do mercado, mas os motivos logo abaixo explicam o que está puxando a nota para cima ou para baixo."
              caveat="É uma métrica autoral e de apoio analítico. Não é recomendação financeira e não deve ser usada sozinha para decisão de compra ou venda."
              align="left"
              widthClass="w-[460px]"
            />
          </div>

          <h1 className="font-display text-2xl font-semibold text-slate-100 md:text-3xl">
            Crypto Health Monitor
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Monitoramento de saúde do mercado cripto combinando preço, volume,
            volatilidade, dominância, risco e base histórica persistente em SQLite.
          </p>
        </div>

        <div className={`rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}>
          <div className="flex items-end gap-1">
            <span className={`font-display text-4xl font-bold ${tone.text}`}>
              {marketHealth.score}
            </span>
            <span className="pb-1 text-sm text-slate-500">/100</span>
          </div>

          <p className={`mt-1 font-semibold ${tone.text}`}>
            {marketHealth.label || tone.label}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Leitura sintética do mercado monitorado
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          {reasons.map((reason, index) => (
            <div
              key={`${reason}-${index}`}
              className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5"
            >
              <TrendingUp size={14} className="mt-0.5 shrink-0 text-blue-400" />

              <p className="text-sm leading-relaxed text-slate-300">
                {reason}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <ComponentBar
            label="Momentum"
            value={marketHealth.components.momentum}
            tooltip={COMPONENT_TOOLTIPS.momentum}
          />

          <ComponentBar
            label="Volatilidade"
            value={marketHealth.components.volatility}
            tooltip={COMPONENT_TOOLTIPS.volatility}
          />

          <ComponentBar
            label="Volume"
            value={marketHealth.components.volume}
            tooltip={COMPONENT_TOOLTIPS.volume}
          />

          <ComponentBar
            label="Amplitude"
            value={marketHealth.components.breadth}
            tooltip={COMPONENT_TOOLTIPS.breadth}
          />

          <ComponentBar
            label="Sentimento"
            value={marketHealth.components.sentiment}
            tooltip={COMPONENT_TOOLTIPS.sentiment}
          />

          <ComponentBar
            label="DeFi"
            value={marketHealth.components.defi}
            tooltip={COMPONENT_TOOLTIPS.defi}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Fear & Greed
            </p>

            <MetricTooltip
              title="Fear & Greed"
              description="Índice de sentimento que resume se o mercado cripto está mais dominado por medo, neutralidade ou ganância."
              calculation="O dashboard consome o valor consolidado quando a fonte está disponível."
              interpretation="Valores baixos indicam medo; valores altos indicam ganância ou euforia."
              caveat="É um termômetro de humor, não um gatilho de compra ou venda."
              source="Alternative.me quando disponível."
            />
          </div>

          <p className="number-mono text-xl font-semibold text-slate-100">
            {marketKPIs.fearGreedIndex == null ? 'N/A' : `${marketKPIs.fearGreedIndex}/100`}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {marketKPIs.fearGreedLabel ?? 'Fonte indisponível no momento'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              DeFi TVL
            </p>

            <MetricTooltip
              title="DeFi TVL"
              description="Total Value Locked representa o valor total alocado em protocolos DeFi."
              calculation="Quando disponível, usa dados agregados da DeFiLlama."
              interpretation="Ajuda a medir atividade e confiança no ecossistema DeFi."
              caveat="TVL pode subir apenas porque os ativos depositados valorizaram."
              source="DeFiLlama quando disponível."
            />
          </div>

          <p className="number-mono text-xl font-semibold text-slate-100">
            {defiLlama?.totalTvlUsd == null
              ? 'N/A'
              : formatCurrency(defiLlama.totalTvlUsd, true)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {defiLlama?.tvlChange24h == null
              ? 'Fonte indisponível no momento'
              : `${formatPercentage(defiLlama.tvlChange24h)} média nas top chains`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Protocolos
            </p>

            <MetricTooltip
              title="Protocolos monitorados"
              description="Quantidade de protocolos DeFi considerados na leitura complementar."
              interpretation="Ajuda a dimensionar a cobertura da fonte DeFi no dashboard."
              caveat="Quantidade não significa qualidade dos protocolos."
              source="DeFiLlama quando disponível."
            />
          </div>

          <p className="number-mono text-xl font-semibold text-slate-100">
            {defiLlama?.protocolCount ?? 'N/A'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Cobertura DeFi complementar
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Market Cap
            </p>

            <MetricTooltip
              title="Market Cap total"
              description="Soma do valor de mercado dos ativos monitorados."
              calculation="Preço atual multiplicado pela oferta circulante de cada ativo, somado no recorte exibido."
              interpretation="Ajuda a medir o tamanho financeiro do grupo monitorado."
              caveat="Representa apenas os ativos acompanhados pelo dashboard, não todo o mercado cripto."
              source="CoinGecko via backend."
            />
          </div>

          <p className="number-mono text-xl font-semibold text-slate-100">
            {formatCurrency(marketKPIs.totalMarketCap, true)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatPercentage(marketKPIs.marketCapChange24h)} em 24h
          </p>
        </div>
      </div>
    </section>
  );
}