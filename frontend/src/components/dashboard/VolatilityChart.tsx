import type { VolatilityScore } from '../../types';
import { MetricTooltip } from '../ui/MetricTooltip';

interface VolatilityChartProps {
  scores: VolatilityScore[];
}

const LEVEL_COLORS = {
  low: { bar: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  medium: { bar: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  high: { bar: '#f97316', text: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' },
  extreme: { bar: '#ef4444', text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
};

export function VolatilityChart({ scores }: VolatilityChartProps) {
  const sorted = [...scores].sort((a, b) => b.normalized - a.normalized).slice(0, 10);

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-slate-100 text-lg">Volatility Score</h2>
          <MetricTooltip
            title="Volatility Score"
            description="Ranking dos ativos com maior oscilação recente de preço. A volatilidade mostra intensidade de movimento, independentemente da direção."
            calculation="Quando há histórico suficiente, calcula a dispersão dos preços recentes e normaliza o resultado de 0 a 100. Quando o histórico ainda é curto, usa a variação recente disponível como aproximação."
            interpretation="Scores baixos indicam comportamento mais estável; scores altos ou extremos indicam maior instabilidade. Um ativo pode estar muito volátil tanto subindo quanto caindo."
            caveat="A janela é curta e depende do histórico coletado enquanto o dashboard está rodando. Nos primeiros minutos, a métrica ainda está amadurecendo."
            align="left"
            widthClass="w-96"
          />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Price std dev · Sliding 1h window</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['low', 'medium', 'high', 'extreme'] as const).map((level) => {
          const count = scores.filter((s) => s.level === level).length;
          return (
            <span
              key={level}
              className={`px-2 py-0.5 rounded-full text-xs font-mono border capitalize ${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].text}`}
            >
              {level}: {count}
            </span>
          );
        })}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sorted.map((score, index) => {
          const colors = LEVEL_COLORS[score.level];
          return (
            <div key={score.assetId} className="group">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-4 text-right font-mono">{index + 1}</span>
                <span className="font-display font-semibold text-slate-200 text-sm w-14 flex-shrink-0">
                  {score.symbol}
                </span>
                <div className="flex-1 relative h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{
                      width: `${score.normalized}%`,
                      background: colors.bar,
                      boxShadow: `0 0 8px ${colors.bar}80`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className={`text-xs font-mono font-medium ${colors.text}`}>
                      {score.normalized}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-mono capitalize flex-shrink-0 w-14 text-right ${colors.text}`}>
                  {score.level}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
