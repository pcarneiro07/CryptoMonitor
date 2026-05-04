import { ShieldAlert } from 'lucide-react';
import type { AssetRiskProfile } from '../../types';
import { MetricTooltip } from '../ui/MetricTooltip';

interface RiskRankingProps {
  profiles: AssetRiskProfile[];
}

const labelClass: Record<AssetRiskProfile['label'], string> = {
  Baixo: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  Moderado: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  Alto: 'text-red-300 bg-red-500/10 border-red-500/30',
  Extremo: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
};

export function RiskRanking({ profiles }: RiskRankingProps) {
  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-slate-100 text-lg">Ranking de risco</h2>
            <MetricTooltip
              title="Ranking de risco"
              description="Ordena os ativos que exigem mais atenção no momento, combinando sinais de instabilidade de preço, queda recente e pressão de volume."
              calculation="O score considera volatilidade normalizada, variação negativa de preço, aceleração de volume e distância da máxima histórica quando disponível. O resultado é convertido para uma escala de 0 a 100."
              interpretation="Quanto maior o score, maior o nível de atenção. Baixo sugere comportamento relativamente controlado; moderado indica atenção; alto e extremo indicam maior estresse ou instabilidade."
              caveat="Risco aqui significa risco de mercado/instabilidade no curto prazo, não risco fundamental do projeto, risco regulatório ou recomendação de investimento."
              align="left"
              widthClass="w-96"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Combina volatilidade, queda/estresse de preço e pressão de volume</p>
        </div>
        <ShieldAlert size={18} className="text-red-400" />
      </div>

      <div className="space-y-3">
        {profiles.slice(0, 6).map((profile) => (
          <div key={profile.assetId}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <img src={profile.image} alt={profile.symbol} className="w-6 h-6 rounded-full" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{profile.symbol}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full border text-xs font-mono ${labelClass[profile.label]}`}>
                  {profile.label}
                </span>
                <span className="font-mono text-sm text-slate-200 w-10 text-right">{profile.riskScore}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                style={{ width: `${profile.riskScore}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
