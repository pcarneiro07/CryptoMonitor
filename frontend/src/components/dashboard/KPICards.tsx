import React from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Layers, Zap } from 'lucide-react';
import type { DashboardData } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface KPICardsProps {
  data: DashboardData;
}

interface TooltipCopy {
  title: string;
  description: string;
  calculation?: string;
  interpretation?: string;
  caveat?: string;
  source?: string;
}

const KPI_TOOLTIPS: Record<string, TooltipCopy> = {
  marketCap: {
    title: 'Total Market Cap',
    description: 'Soma do valor de mercado dos ativos monitorados no dashboard. Ajuda a dimensionar o tamanho financeiro do recorte analisado.',
    calculation: 'Preço atual de cada ativo multiplicado pela oferta circulante, somado para os top 20 ativos retornados pela CoinGecko.',
    interpretation: 'Quando cresce junto com volume e boa amplitude, sugere entrada mais consistente de capital. Quando cresce concentrado em poucos ativos, pode mascarar fraqueza do restante do mercado.',
    caveat: 'Não representa todo o mercado cripto, apenas o universo de ativos carregado pelo dashboard.',
    source: 'CoinGecko /coins/markets.',
  },
  volume24h: {
    title: '24h Volume',
    description: 'Volume financeiro negociado nas últimas 24 horas para os ativos monitorados. É uma leitura de atividade e liquidez.',
    calculation: 'Soma do volume 24h informado pela CoinGecko para cada ativo do recorte.',
    interpretation: 'Volume alto confirma que há participação relevante do mercado. Volume subindo com preço subindo reforça movimento; volume subindo com preço caindo pode indicar pressão vendedora.',
    caveat: 'Volume agregado pode ser afetado por stablecoins, exchanges e eventos pontuais. Use junto com variação de preço e alertas de anomalia.',
    source: 'CoinGecko /coins/markets.',
  },
  btcDominance: {
    title: 'BTC Dominance',
    description: 'Participação do Bitcoin no valor de mercado do recorte analisado. Mostra quanto do capital monitorado está concentrado em BTC.',
    calculation: 'Market cap do Bitcoin dividido pelo market cap total dos ativos monitorados.',
    interpretation: 'Dominância em alta pode indicar busca por segurança relativa dentro do cripto. Dominância em queda pode sugerir maior apetite por altcoins, desde que o mercado geral também esteja saudável.',
    caveat: 'Aqui a dominância é calculada sobre o top 20 do dashboard, não sobre todo o universo cripto global.',
    source: 'CoinGecko /coins/markets.',
  },
  topGainer: {
    title: 'Top Gainer',
    description: 'Ativo com maior valorização percentual em 24 horas dentro do recorte monitorado.',
    calculation: 'Ordenação dos ativos pela variação percentual de preço nas últimas 24 horas.',
    interpretation: 'Ajuda a identificar onde há maior força relativa no curto prazo. Se vier acompanhado de volume elevado, o movimento tende a ser mais relevante.',
    caveat: 'Alta isolada não significa tendência sustentável. Em cripto, movimentos muito fortes podem reverter rapidamente.',
    source: 'CoinGecko /coins/markets.',
  },
  topLoser: {
    title: 'Top Loser',
    description: 'Ativo com maior queda percentual em 24 horas dentro do recorte monitorado.',
    calculation: 'Ordenação dos ativos pela variação percentual de preço nas últimas 24 horas, do pior para o melhor desempenho.',
    interpretation: 'Ajuda a localizar pontos de estresse no mercado. Quando a queda vem com volume alto e volatilidade elevada, merece atenção maior.',
    caveat: 'Queda forte pode ser evento específico do ativo ou reflexo de mercado amplo; a leitura deve ser cruzada com setor, volume e risco.',
    source: 'CoinGecko /coins/markets.',
  },
  highestVelocity: {
    title: 'Highest Velocity',
    description: 'Ativo com maior aceleração recente de volume entre os monitorados. A ideia é detectar mudança de intensidade, não apenas volume absoluto.',
    calculation: 'Compara o volume mais recente com observações anteriores salvas enquanto o dashboard está aberto.',
    interpretation: 'Velocity positiva indica aumento de atividade; velocity negativa indica desaceleração. Quando marcada como anomalia, o movimento fugiu do padrão dos demais ativos.',
    caveat: 'Nos primeiros minutos após abrir o dashboard, essa métrica pode ficar zerada ou pouco informativa porque ainda não há histórico local suficiente.',
    source: 'CoinGecko + histórico temporário mantido no navegador.',
  },
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accentColor = 'blue',
  badge,
  tooltip,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  badge?: string;
  tooltip: TooltipCopy;
}) {
  const colorMap = {
    blue: { icon: 'text-blue-400', glow: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.2)' },
    green: { icon: 'text-emerald-400', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.2)' },
    red: { icon: 'text-red-400', glow: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.2)' },
    amber: { icon: 'text-amber-400', glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.2)' },
    purple: { icon: 'text-purple-400', glow: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.2)' },
  };

  const colors = colorMap[accentColor];

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 animate-fade-in-up"
      style={{
        boxShadow: `0 0 40px ${colors.glow}`,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
            <MetricTooltip {...tooltip} />
          </div>
          {badge && (
            <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
              {badge}
            </span>
          )}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: colors.glow }}
        >
          <Icon size={18} className={colors.icon} />
        </div>
      </div>

      <div>
        <p className="font-display font-bold text-2xl text-slate-100 number-mono">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {trendValue && (
        <div className={`flex items-center gap-1 text-xs font-mono ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'
        }`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

export function KPICards({ data }: KPICardsProps) {
  const { marketKPIs, volatilityScores, volumeVelocity, topGainer, topLoser } = data;

  const mostVolatile = volatilityScores.reduce(
    (max, v) => (v.normalized > (max?.normalized ?? -1) ? v : max),
    null as typeof volatilityScores[0] | null
  );

  const highestVelocity = volumeVelocity.reduce(
    (max, v) => (Math.abs(v.volumeChange30m) > Math.abs(max?.volumeChange30m ?? 0) ? v : max),
    null as typeof volumeVelocity[0] | null
  );

  const anomalyCount = volumeVelocity.filter((v) => v.isAnomaly).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 stagger-children">
      <StatCard
        title="Total Market Cap"
        value={formatCurrency(marketKPIs.totalMarketCap, true)}
        subtitle="Top 20 assets"
        icon={BarChart3}
        trend={marketKPIs.marketCapChange24h >= 0 ? 'up' : 'down'}
        trendValue={`${formatPercentage(marketKPIs.marketCapChange24h)} 24h`}
        accentColor="blue"
        tooltip={KPI_TOOLTIPS.marketCap}
      />

      <StatCard
        title="24h Volume"
        value={formatCurrency(marketKPIs.totalVolume24h, true)}
        subtitle={`${anomalyCount} volume anomal${anomalyCount !== 1 ? 'ies' : 'y'}`}
        icon={Activity}
        accentColor={anomalyCount > 0 ? 'amber' : 'blue'}
        badge={anomalyCount > 0 ? `${anomalyCount} ALERT` : undefined}
        tooltip={KPI_TOOLTIPS.volume24h}
      />

      <StatCard
        title="BTC Dominance"
        value={`${marketKPIs.btcDominance.toFixed(1)}%`}
        subtitle={`ETH: ${marketKPIs.ethDominance.toFixed(1)}%`}
        icon={Layers}
        accentColor="amber"
        tooltip={KPI_TOOLTIPS.btcDominance}
      />

      <StatCard
        title="Top Gainer"
        value={topGainer ? `${formatPercentage(topGainer.priceChangePercentage24h)}` : '—'}
        subtitle={topGainer?.name ?? 'N/A'}
        icon={TrendingUp}
        trend="up"
        trendValue={topGainer?.symbol}
        accentColor="green"
        tooltip={KPI_TOOLTIPS.topGainer}
      />

      <StatCard
        title="Top Loser"
        value={topLoser ? `${formatPercentage(topLoser.priceChangePercentage24h)}` : '—'}
        subtitle={topLoser?.name ?? 'N/A'}
        icon={TrendingDown}
        trend="down"
        trendValue={topLoser?.symbol}
        accentColor="red"
        tooltip={KPI_TOOLTIPS.topLoser}
      />

      <StatCard
        title="Highest Velocity"
        value={highestVelocity ? `${formatPercentage(highestVelocity.volumeChange30m)}` : '—'}
        subtitle={`${mostVolatile?.symbol ?? '—'} most volatile`}
        icon={Zap}
        trend={highestVelocity && highestVelocity.volumeChange30m >= 0 ? 'up' : 'down'}
        trendValue={highestVelocity?.symbol}
        accentColor={highestVelocity?.isAnomaly ? 'red' : 'purple'}
        badge={highestVelocity?.isAnomaly ? 'ANOMALY' : undefined}
        tooltip={KPI_TOOLTIPS.highestVelocity}
      />
    </div>
  );
}
