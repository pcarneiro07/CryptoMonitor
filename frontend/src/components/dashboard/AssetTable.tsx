import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import type { CryptoAsset } from '../../types';
import { formatCurrency, formatPercentage, getSectorColor } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface AssetTableProps {
  assets: CryptoAsset[];
}

type SortField =
  | 'marketCapRank'
  | 'currentPrice'
  | 'priceChangePercentage1h'
  | 'priceChangePercentage24h'
  | 'marketCap'
  | 'totalVolume';

type SortDirection = 'asc' | 'desc';

const sortableFields: Record<SortField, string> = {
  marketCapRank: 'Rank',
  currentPrice: 'Preço',
  priceChangePercentage1h: '1h',
  priceChangePercentage24h: '24h',
  marketCap: 'Market Cap',
  totalVolume: 'Volume',
};

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ArrowUpDown size={13} className="text-slate-600" />;
  }

  return direction === 'asc' ? (
    <ArrowUp size={13} className="text-blue-400" />
  ) : (
    <ArrowDown size={13} className="text-blue-400" />
  );
}

export function AssetTable({ assets }: AssetTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('marketCapRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (!term) return true;

      return (
        asset.name.toLowerCase().includes(term) ||
        asset.symbol.toLowerCase().includes(term) ||
        asset.category.toLowerCase().includes(term)
      );
    });
  }, [assets, search]);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      const mult = sortDirection === 'asc' ? 1 : -1;

      const aValue = Number(a[sortField] ?? 0);
      const bValue = Number(b[sortField] ?? 0);

      return (aValue - bValue) * mult;
    });
  }, [filteredAssets, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(field === 'marketCapRank' ? 'asc' : 'desc');
  }

  return (
    <section className="glass-card p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Live Asset Rankings
            </h2>

            <MetricTooltip
              title="Live Asset Rankings"
              description="Tabela com os ativos monitorados no dashboard, ordenados por ranking, preço, variação, market cap ou volume."
              calculation="Os dados vêm da CoinGecko via backend. O ranking é baseado no market cap informado pela fonte, enquanto preço, volume e variações são atualizados a cada ciclo de coleta."
              interpretation="Use esta tabela para identificar rapidamente quais ativos concentram valor de mercado, quais têm maior volume e quais estão com melhor ou pior desempenho recente."
              caveat="Os dados são atualizados em ciclos e podem ter pequeno atraso em relação às exchanges. Variações muito curtas podem mudar rapidamente."
              source="CoinGecko via backend FastAPI."
              align="left"
              widthClass="w-[420px]"
            />
          </div>

          <p className="text-sm text-slate-500">
            Ranking, preço, variação e liquidez dos ativos monitorados.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ativo, símbolo ou setor..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500/60"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-500">
              {Object.entries(sortableFields).map(([field, label]) => (
                <th key={field} className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort(field as SortField)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-300"
                  >
                    {label}

                    <SortIcon
                      active={sortField === field}
                      direction={sortDirection}
                    />
                  </button>
                </th>
              ))}

              <th className="px-3 py-3">Ativo</th>
              <th className="px-3 py-3">Setor</th>
              <th className="px-3 py-3">ATH</th>
            </tr>
          </thead>

          <tbody>
            {sortedAssets.map((asset) => {
              const change1h = asset.priceChangePercentage1h ?? 0;
              const change24h = asset.priceChangePercentage24h ?? 0;
              const sectorColor = getSectorColor(asset.category);

              return (
                <tr
                  key={asset.id}
                  className="border-b border-slate-800/60 text-slate-300 transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-3 py-3 number-mono text-slate-500">
                    #{asset.marketCapRank ?? '—'}
                  </td>

                  <td className="px-3 py-3 number-mono text-slate-100">
                    {formatCurrency(asset.currentPrice, asset.currentPrice >= 1)}
                  </td>

                  <td
                    className={`px-3 py-3 number-mono font-medium ${
                      change1h >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatPercentage(change1h)}
                  </td>

                  <td
                    className={`px-3 py-3 number-mono font-medium ${
                      change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatPercentage(change24h)}
                  </td>

                  <td className="px-3 py-3 number-mono text-slate-300">
                    {formatCurrency(asset.marketCap)}
                  </td>

                  <td className="px-3 py-3 number-mono text-slate-300">
                    {formatCurrency(asset.totalVolume)}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={asset.image}
                        alt={asset.symbol}
                        className="h-7 w-7 rounded-full"
                      />

                      <div>
                        <p className="font-medium text-slate-100">
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          {asset.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className="rounded-full border px-2 py-1 text-xs font-medium"
                      style={{
                        color: sectorColor,
                        borderColor: `${sectorColor}55`,
                        backgroundColor: `${sectorColor}18`,
                      }}
                    >
                      {asset.category}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <div>
                      <p className="number-mono text-slate-300">
                        {formatCurrency(asset.ath)}
                      </p>
                      <p
                        className={`number-mono text-xs ${
                          asset.athChangePercentage >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPercentage(asset.athChangePercentage)}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}

            {sortedAssets.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Nenhum ativo encontrado para a busca atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}