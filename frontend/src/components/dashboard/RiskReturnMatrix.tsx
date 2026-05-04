import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { AssetRiskProfile } from '../../types';
import { getSectorColor } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface RiskReturnMatrixProps {
  profiles: AssetRiskProfile[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AssetRiskProfile }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl min-w-[190px]">
      <div className="flex items-center gap-2 mb-2">
        <img src={item.image} alt={item.symbol} className="w-5 h-5 rounded-full" />
        <div>
          <p className="text-sm font-semibold text-slate-100">{item.symbol}</p>
          <p className="text-xs text-slate-500">{item.category}</p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <p className="text-slate-400">Retorno 24h: <span className="font-mono text-slate-100">{item.return24h.toFixed(2)}%</span></p>
        <p className="text-slate-400">Volatilidade: <span className="font-mono text-slate-100">{item.volatilityNormalized}/100</span></p>
        <p className="text-slate-400">Risco: <span className="font-mono text-slate-100">{item.riskScore}/100 · {item.label}</span></p>
      </div>
    </div>
  );
}

export function RiskReturnMatrix({ profiles }: RiskReturnMatrixProps) {
  const topProfiles = profiles.slice(0, 20);

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-slate-100 text-lg">Matriz risco x retorno</h2>
            <MetricTooltip
              title="Matriz risco x retorno"
              description="Gráfico de dispersão que posiciona cada ativo pela relação entre desempenho recente e instabilidade. Ele ajuda a separar ativos que estão subindo de forma relativamente controlada daqueles que estão subindo ou caindo com risco elevado."
              calculation="Eixo X = variação percentual de preço em 24h. Eixo Y = volatilidade normalizada de 0 a 100. Tamanho da bolha = market cap do ativo. Cor = categoria/setor do ativo."
              interpretation="À direita estão ativos com retorno positivo; à esquerda, retorno negativo. Quanto mais alto, maior a volatilidade. O quadrante superior esquerdo costuma indicar estresse; o superior direito indica alta com risco elevado; a parte inferior indica comportamento mais estável."
              caveat="O gráfico mostra posição relativa no momento da coleta. Ele não prevê continuidade do movimento e pode mudar rapidamente em mercado cripto."
              align="left"
              widthClass="w-96"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">X = variação 24h · Y = volatilidade · tamanho = market cap</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="82%">
        <ScatterChart margin={{ top: 15, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis
            type="number"
            dataKey="return24h"
            name="Retorno 24h"
            unit="%"
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
          />
          <YAxis
            type="number"
            dataKey="volatilityNormalized"
            name="Volatilidade"
            domain={[0, 100]}
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
          />
          <ZAxis type="number" dataKey="marketCap" range={[60, 420]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />

          {topProfiles.map((profile) => (
            <Scatter
              key={profile.assetId}
              name={profile.symbol}
              data={[profile]}
              fill={getSectorColor(profile.category)}
              fillOpacity={0.85}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
