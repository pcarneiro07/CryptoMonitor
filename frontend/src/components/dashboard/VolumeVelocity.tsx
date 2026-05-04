import { Zap, AlertTriangle } from 'lucide-react';
import type { VolumeVelocity } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface VolumeVelocityPanelProps {
  data: VolumeVelocity[];
}

export function VolumeVelocityPanel({ data }: VolumeVelocityPanelProps) {
  const sorted = [...data].sort(
    (a, b) => Math.abs(b.volumeChange30m) - Math.abs(a.volumeChange30m)
  ).slice(0, 8);

  const anomalies = data.filter((v) => v.isAnomaly);

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-slate-100 text-lg">Volume Velocity</h2>
            <MetricTooltip
              title="Volume Velocity"
              description="Mede a aceleração ou desaceleração recente do volume negociado. Diferente do volume 24h absoluto, esta métrica tenta capturar mudança de ritmo."
              calculation="Compara o volume mais recente com observações anteriores salvas durante a sessão do dashboard, usando uma janela curta aproximada de 30 minutos."
              interpretation="Valores positivos indicam aumento de atividade; valores negativos indicam desaceleração. Um spike/anomalia sugere que o ativo mudou de ritmo de forma relevante em relação aos demais."
              caveat="Depende de histórico local. Quando o dashboard acabou de abrir, ainda não há pontos suficientes e a métrica pode aparecer zerada ou pouco confiável."
              source="CoinGecko + histórico temporário do navegador."
              align="left"
              widthClass="w-96"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">30-min volume change rate</p>
        </div>
        {anomalies.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-xs font-mono text-amber-400">{anomalies.length} anomaly</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {sorted.map((item) => {
          const isPos = item.volumeChange30m >= 0;
          const absPct = Math.min(100, Math.abs(item.volumeChange30m));

          return (
            <div key={item.assetId} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-semibold text-slate-200 text-sm w-12 flex-shrink-0">
                  {item.symbol}
                </span>
                {item.isAnomaly && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    <Zap size={9} />
                    SPIKE
                  </span>
                )}
                <div className="flex-1 relative h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                      isPos ? 'bg-blue-500' : 'bg-purple-500'
                    }`}
                    style={{
                      width: `${absPct}%`,
                      opacity: 0.7 + (absPct / 100) * 0.3,
                    }}
                  />
                </div>
                <span className={`font-mono text-xs font-medium w-16 text-right flex-shrink-0 ${
                  isPos ? 'text-blue-400' : 'text-purple-400'
                }`}>
                  {formatPercentage(item.volumeChange30m)}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-14">
                <span className="text-xs text-slate-600">
                  Vol: {formatCurrency(item.currentVolume, true)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
