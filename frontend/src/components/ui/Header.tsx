import { Activity } from 'lucide-react';
import { LiveStatus } from '../dashboard/LiveStatus';
import { useDashboardStore } from '../../lib/store';

export function Header() {
  const { data } = useDashboardStore();

  const lastUpdated = data?.lastFetchedAt
    ? new Date(data.lastFetchedAt).toLocaleTimeString('pt-BR')
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/80">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-100 text-base leading-none">
                Crypto Health Monitor
              </h1>
              <p className="text-xs text-slate-500 leading-none mt-0.5">
                {data ? `${data.assets.length} assets · ` : ''}
                {lastUpdated ? `Atualizado às ${lastUpdated}` : 'Carregando...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LiveStatus />
          </div>
        </div>
      </div>
    </header>
  );
}
