import { useEffect } from 'react';
import { useDashboardStore } from './lib/store';
import { Header } from './components/ui/Header';
import { KPICards } from './components/dashboard/KPICards';
import { MarketHeatmap } from './components/dashboard/MarketHeatmap';
import { SectorDominanceChart } from './components/dashboard/SectorDominance';
import { VolatilityChart } from './components/dashboard/VolatilityChart';
import { VolumeVelocityPanel } from './components/dashboard/VolumeVelocity';
import { AssetTable } from './components/dashboard/AssetTable';
import { Chatbot } from './components/chat/Chatbot';
import { DashboardSkeleton } from './components/ui/Skeleton';
import { MarketHealthOverview } from './components/dashboard/MarketHealthOverview';
import { AlertPanel } from './components/dashboard/AlertPanel';
import { RiskReturnMatrix } from './components/dashboard/RiskReturnMatrix';
import { RiskRanking } from './components/dashboard/RiskRanking';
import { DeFiLlamaPanel } from './components/dashboard/DeFiLlamaPanel';

export default function App() {
  const { data, status, startPolling } = useDashboardStore();

  useEffect(() => {
    const stopPolling = startPolling();
    return stopPolling;
  }, [startPolling]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {status.isError && !data && (
          <div className="glass-card border-red-500/30 p-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-display font-semibold text-red-400">Erro ao carregar dados</p>
              <p className="text-sm text-slate-400 mt-1">{status.errorMessage}</p>
              <p className="text-xs text-slate-500 mt-2">
                Verifique a conexão com a internet e o limite da CoinGecko. A API pública pode limitar requisições; se necessário, use uma chave gratuita no arquivo{' '}
                <code className="font-mono bg-slate-800 px-1 rounded">.env</code> como{' '}
                <code className="font-mono bg-slate-800 px-1 rounded">VITE_COINGECKO_API_KEY</code>.
              </p>
            </div>
          </div>
        )}

        {!data && status.isLoading && <DashboardSkeleton />}

        {data && (
          <>
            <MarketHealthOverview data={data} />

            <section>
              <KPICards data={data} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 h-[420px]">
                <MarketHeatmap assets={data.assets} />
              </div>
              <div className="h-[420px]">
                <AlertPanel alerts={data.alerts} />
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-[420px]">
                <RiskReturnMatrix profiles={data.riskProfiles} />
              </div>
              <div className="h-[420px]">
                <RiskRanking profiles={data.riskProfiles} />
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="h-80">
                <SectorDominanceChart sectors={data.sectorDominance} />
              </div>
              <div className="h-80">
                <VolatilityChart scores={data.volatilityScores} />
              </div>
              <div className="h-80">
                <VolumeVelocityPanel data={data.volumeVelocity} />
              </div>
            </section>

            <section>
              <DeFiLlamaPanel data={data.defiLlama} />
            </section>

            <section>
              <AssetTable assets={data.assets} />
            </section>

            <footer className="text-center py-4 text-xs text-slate-700 font-mono">
              Crypto Health Monitor · Dados fornecidos por CoinGecko, Alternative.me e DeFiLlama · Atualização a cada 10 minutos
            </footer>
          </>
        )}
      </main>

      <Chatbot data={data} />
    </div>
  );
}
