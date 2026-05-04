import { useMemo } from 'react';
import {
  Database,
  DownloadCloud,
  HardDrive,
  History,
  Loader2,
  Play,
  Square,
  TableProperties,
} from 'lucide-react';
import { useDashboardStore } from '../../lib/store';
import { MetricTooltip } from '../ui/MetricTooltip';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '0';

  return new Intl.NumberFormat('pt-BR').format(value);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function DatabaseExplorer() {
  const {
    databaseSummary,
    databaseSummaryLoading,
    databaseSummaryError,
    backfillStatus,
    backfillLoading,
    backfillError,
    fetchDatabaseSummary,
    startBackfill,
    stopBackfill,
  } = useDashboardStore();

  const progress = useMemo(() => {
    if (!backfillStatus?.totalAssets) return 0;
    return (backfillStatus.processedAssets / backfillStatus.totalAssets) * 100;
  }, [backfillStatus]);

  const isBackfillRunning = Boolean(backfillStatus?.isRunning);

  return (
    <section className="glass-card p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Database size={18} className="text-blue-400" />

            <h2 className="font-display text-lg font-semibold text-slate-100">
              Database Explorer
            </h2>

            <MetricTooltip
              title="Database Explorer"
              description="Painel de acompanhamento do SQLite local usado para armazenar os snapshots históricos do dashboard."
              calculation="A cada chamada de /api/dashboard, o backend salva os dados atuais em tabelas SQLite. O backfill histórico também grava preço, market cap e volume por ativo."
              interpretation="Use este painel para verificar se o banco está sendo alimentado, qual período já está coberto e se o backfill de 7 dias está em andamento ou foi concluído."
              note="O SQLite é local. Se você apagar o arquivo .db ou trocar de máquina, o histórico salvo também muda."
              source="Backend FastAPI + SQLite local em backend/data/crypto_monitor.db."
            />
          </div>

          <p className="max-w-3xl text-sm text-slate-500">
            Camada persistente do projeto. Ela guarda o histórico coletado para que o dashboard
            deixe de depender apenas da memória temporária da sessão.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchDatabaseSummary()}
            disabled={databaseSummaryLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
          >
            {databaseSummaryLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <HardDrive size={15} />
            )}
            Atualizar resumo
          </button>

          {!isBackfillRunning ? (
            <button
              type="button"
              onClick={() => startBackfill(7, 20)}
              disabled={backfillLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {backfillLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Play size={15} />
              )}
              Iniciar backfill 7d
            </button>
          ) : (
            <button
              type="button"
              onClick={() => stopBackfill()}
              disabled={backfillLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {backfillLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Square size={15} />
              )}
              Parar backfill
            </button>
          )}
        </div>
      </div>

      {(databaseSummaryError || backfillError) && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {databaseSummaryError || backfillError}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Ativos
            </p>
            <TableProperties size={15} className="text-slate-500" />
          </div>

          <p className="number-mono text-2xl font-semibold text-slate-100">
            {formatNumber(databaseSummary?.totals.assets)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            moedas cadastradas no banco
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Snapshots
            </p>
            <History size={15} className="text-slate-500" />
          </div>

          <p className="number-mono text-2xl font-semibold text-slate-100">
            {formatNumber(databaseSummary?.totals.assetSnapshots)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            registros históricos por ativo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Início
            </p>
            <DownloadCloud size={15} className="text-slate-500" />
          </div>

          <p className="text-sm font-medium text-slate-100">
            {formatDate(databaseSummary?.period.firstTimestamp)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            primeiro registro salvo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Último dado
            </p>
            <HardDrive size={15} className="text-slate-500" />
          </div>

          <p className="text-sm font-medium text-slate-100">
            {formatDate(databaseSummary?.period.lastTimestamp)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            coleta mais recente no SQLite
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-200">
                Status do backfill
              </p>

              <p className="text-xs text-slate-500">
                Coleta histórica em background
              </p>
            </div>

            <MetricTooltip
              title="Backfill histórico"
              description="Processo que busca dados passados da CoinGecko e salva no SQLite para criar uma base histórica inicial."
              calculation="O backend primeiro busca os ativos atuais e, depois, processa um ativo por vez usando o endpoint histórico de market chart. Entre cada ativo há uma pausa para reduzir risco de timeout ou rate limit."
              interpretation="Quando concluído, o banco passa a ter dados históricos suficientes para análises de tendência, volatilidade e volume além da sessão aberta."
              note="Se falhar no meio, os ativos já salvos permanecem no banco. O processo pode ser iniciado novamente para completar lacunas."
              source="CoinGecko market_chart + SQLite local."
            />
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>
                  {backfillStatus?.processedAssets ?? 0}/
                  {backfillStatus?.totalAssets ?? 0} ativos
                </span>
                <span>{progress.toFixed(0)}%</span>
              </div>

              <ProgressBar value={progress} />
            </div>

            <p className="text-sm text-slate-300">
              {backfillStatus?.statusMessage || 'Aguardando início do backfill.'}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-slate-500">Registros salvos</p>
                <p className="number-mono mt-1 text-base text-slate-100">
                  {formatNumber(backfillStatus?.savedRows)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-slate-500">Ativo atual</p>
                <p className="mt-1 truncate text-base text-slate-100">
                  {backfillStatus?.currentAsset || '—'}
                </p>
              </div>
            </div>

            {backfillStatus?.errors && backfillStatus.errors.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-200">
                  {backfillStatus.errors.length} erro(s) durante o backfill
                </p>

                <p className="mt-1 text-xs text-amber-100/70">
                  O processo salva ativo por ativo. Erros pontuais não apagam os registros já gravados.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-200">
                Ativos no banco
              </p>

              <p className="text-xs text-slate-500">
                Amostra dos ativos cadastrados no SQLite
              </p>
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-950/95 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-2 py-2">Rank</th>
                  <th className="px-2 py-2">Ativo</th>
                  <th className="px-2 py-2">Setor</th>
                  <th className="px-2 py-2">Atualizado</th>
                </tr>
              </thead>

              <tbody>
                {(databaseSummary?.assets ?? []).slice(0, 30).map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-t border-slate-800/70 text-slate-300"
                  >
                    <td className="px-2 py-2 number-mono text-slate-500">
                      {asset.market_cap_rank ?? '—'}
                    </td>

                    <td className="px-2 py-2">
                      <div>
                        <p className="font-medium text-slate-200">
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          {asset.name}
                        </p>
                      </div>
                    </td>

                    <td className="px-2 py-2 text-slate-400">
                      {asset.category || '—'}
                    </td>

                    <td className="px-2 py-2 text-xs text-slate-500">
                      {formatDate(asset.updated_at)}
                    </td>
                  </tr>
                ))}

                {!databaseSummary?.assets?.length && (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-slate-500">
                      Nenhum ativo salvo ainda. Chame o dashboard ou inicie o backfill.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}