import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SectorDominance } from '../../types';
import { formatPercentage } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface SectorDominanceChartProps {
  sectors: SectorDominance[];
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: SectorDominance }>;
}) => {
  if (!active || !payload?.length) return null;
  const sector = payload[0].payload;

  return (
    <div className="glass-card border border-slate-600/50 p-3 min-w-[160px] shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: sector.color }} />
        <span className="font-display font-semibold text-slate-200 text-sm">{sector.category}</span>
      </div>
      <div className="space-y-1 text-xs font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Share</span>
          <span className="text-slate-200">{sector.marketShare.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Avg 24h</span>
          <span className={sector.avgPriceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {formatPercentage(sector.avgPriceChange24h)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Assets</span>
          <span className="text-slate-400">{sector.assetCount}</span>
        </div>
      </div>
    </div>
  );
};

const CustomLegend = ({ sectors }: { sectors: SectorDominance[] }) => (
  <div className="space-y-2 mt-2">
    {sectors.map((sector) => (
      <div key={sector.category} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sector.color }} />
          <span className="text-xs text-slate-400 truncate max-w-[90px]">{sector.category}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-200">{sector.marketShare.toFixed(1)}%</span>
          <span className={`min-w-[52px] text-right ${sector.avgPriceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercentage(sector.avgPriceChange24h)}
          </span>
        </div>
      </div>
    ))}
  </div>
);

export function SectorDominanceChart({ sectors }: SectorDominanceChartProps) {
  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-slate-100 text-lg">Sector Dominance</h2>
          <MetricTooltip
            title="Sector Dominance"
            description="Mostra como o valor de mercado dos ativos monitorados se distribui entre categorias como Layer 1, Layer 2, DeFi, stablecoins, memes e outros setores."
            calculation="Soma o market cap dos ativos de cada categoria e divide pelo market cap total do recorte analisado. O gráfico exibe a participação percentual de cada setor."
            interpretation="Setores com maior fatia têm mais peso na leitura geral do dashboard. Se um setor grande cai, ele pode puxar o Market Health mesmo que setores menores estejam subindo."
            caveat="A categorização é uma simplificação. Alguns ativos poderiam pertencer a mais de uma categoria, mas o dashboard usa uma categoria principal para facilitar a leitura."
            source="CoinGecko + mapeamento interno de categorias."
            align="left"
            widthClass="w-96"
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Market cap distribution by category</p>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectors}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="marketShare"
                nameKey="category"
                strokeWidth={0}
              >
                {sectors.map((sector) => (
                  <Cell
                    key={sector.category}
                    fill={sector.color}
                    opacity={0.9}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <CustomLegend sectors={sectors} />
      </div>
    </div>
  );
}
