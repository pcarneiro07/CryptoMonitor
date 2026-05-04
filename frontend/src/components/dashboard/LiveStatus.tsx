import { Clock, Wifi, WifiOff } from 'lucide-react';
import { useDashboardStore } from '../../lib/store';

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatLastUpdate(lastSuccess: string | null) {
  if (!lastSuccess) return 'Aguardando atualização';

  const date = new Date(lastSuccess);

  if (Number.isNaN(date.getTime())) {
    return 'Horário indisponível';
  }

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function LiveStatus() {
  const { status, countdown } = useDashboardStore();

  const isOnline = !status.isError;
  const isLoading = status.isLoading;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
          isOnline
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/20 bg-red-500/10 text-red-300'
        }`}
      >
        <span
          className={`status-pulse ${isOnline ? 'green' : 'amber'} relative inline-flex h-2 w-2 rounded-full ${
            isOnline ? 'bg-emerald-400' : 'bg-red-400'
          }`}
        />

        {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}

        <span className="font-medium">
          {isLoading ? 'Atualizando...' : isOnline ? 'Ao vivo' : 'Erro na coleta'}
        </span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-slate-400">
        <Clock size={13} className="text-slate-500" />

        <span>
          Última atualização:{' '}
          <span className="text-slate-300">
            {formatLastUpdate(status.lastSuccess)}
          </span>
        </span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-slate-400">
        <span>
          Próxima coleta:{' '}
          <span className="number-mono text-slate-300">
            {formatCountdown(countdown)}
          </span>
        </span>
      </div>

      {status.isError && status.errorMessage && (
        <div className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-300">
          {status.errorMessage}
        </div>
      )}
    </div>
  );
}