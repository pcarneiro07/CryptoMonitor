import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { MarketAlert } from '../../types';
import { MetricTooltip } from '../ui/MetricTooltip';

interface AlertPanelProps {
  alerts: MarketAlert[];
}

const severityMap: Record<
  MarketAlert['severity'],
  { icon: JSX.Element; className: string; label: string }
> = {
  low: {
    icon: <Info size={16} />,
    className: 'border-slate-700 bg-slate-800/40 text-slate-300',
    label: 'Baixo',
  },
  medium: {
    icon: <AlertTriangle size={16} />,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    label: 'Médio',
  },
  high: {
    icon: <ShieldAlert size={16} />,
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
    label: 'Alto',
  },
  info: {
    icon: <Info size={16} />,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    label: 'Info',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    label: 'Atenção',
  },
  positive: {
    icon: <CheckCircle2 size={16} />,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    label: 'Positivo',
  },
  critical: {
    icon: <ShieldAlert size={16} />,
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
    label: 'Crítico',
  },
};

function getAlertVisual(alert: MarketAlert) {
  return severityMap[alert.severity] ?? severityMap.info;
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  const safeAlerts = alerts ?? [];

  return (
    <section className="glass-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Alertas automáticos
            </h2>

            <MetricTooltip
              title="Alertas automáticos"
              description="Leituras geradas por regras simples a partir dos dados atuais do dashboard. Elas ajudam a destacar movimentos que merecem atenção, como volatilidade extrema, pressão setorial, queda ampla de mercado ou anomalias de volume."
              calculation="O painel cruza variação ponderada do mercado, scores de volatilidade, aceleração de volume, ranking de risco e desempenho médio por setor."
              interpretation="Use os alertas como uma primeira triagem. Eles ajudam a responder rapidamente onde há movimento fora do padrão ou onde o mercado parece mais estável."
              caveat="Alertas são heurísticos. Eles não confirmam causalidade e não substituem leitura contextual de notícia, liquidez e comportamento setorial."
              align="left"
              widthClass="w-[420px]"
            />
          </div>

          <p className="text-sm text-slate-500">
            Sinais de atenção calculados automaticamente a partir dos dados atuais.
          </p>
        </div>

        <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-400">
          {safeAlerts.length} alerta{safeAlerts.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {safeAlerts.map((alert) => {
          const visual = getAlertVisual(alert);

          return (
            <article
              key={alert.id}
              className={`rounded-2xl border p-4 ${visual.className}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {visual.icon}

                  <span className="text-xs font-medium uppercase tracking-[0.16em] opacity-80">
                    {visual.label}
                  </span>
                </div>

                {alert.metric && (
                  <span className="number-mono shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-xs">
                    {alert.metric}
                  </span>
                )}
              </div>

              <h3 className="mb-1.5 text-sm font-semibold text-slate-100">
                {alert.title}
              </h3>

              <p className="text-sm leading-relaxed text-slate-300/90">
                {alert.description}
              </p>

              {(alert.symbol || alert.category) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {alert.symbol && (
                    <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-0.5 text-xs text-slate-300">
                      {alert.symbol}
                    </span>
                  )}

                  {alert.category && (
                    <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-0.5 text-xs text-slate-300">
                      {alert.category}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {safeAlerts.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
            Nenhum alerta disponível no momento.
          </div>
        )}
      </div>
    </section>
  );
}