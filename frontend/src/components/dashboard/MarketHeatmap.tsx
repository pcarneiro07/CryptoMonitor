import { useMemo, useState } from 'react';
import type { CryptoAsset, HeatmapBlock } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/cryptoData';

interface MarketHeatmapProps {
  assets: CryptoAsset[];
  timeframe?: '1h' | '24h';
}

function buildHeatmapBlocks(assets: CryptoAsset[], timeframe: '1h' | '24h'): HeatmapBlock[] {
  const maxMarketCap = Math.max(...assets.map((a) => a.marketCap));

  return assets.map((asset) => {
    const priceChange =
      timeframe === '1h' ? asset.priceChangePercentage1h : asset.priceChangePercentage24h;

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      marketCap: asset.marketCap,
      priceChangePercentage24h: asset.priceChangePercentage24h,
      priceChangePercentage1h: asset.priceChangePercentage1h,
      currentPrice: asset.currentPrice,
      volume: asset.totalVolume,
      weight: asset.marketCap / maxMarketCap,
      colorIntensity: Math.max(-1, Math.min(1, priceChange / 15)),
    };
  });
}

// Retorna cor CSS real baseada na variação — escala suave de vermelho → cinza → verde
function getBlockColor(change: number): string {
  if (change >= 5)  return 'rgba(16, 185, 129, 0.90)';  // verde forte
  if (change >= 2)  return 'rgba(16, 185, 129, 0.70)';  // verde médio
  if (change > 0)   return 'rgba(16, 185, 129, 0.45)';  // verde suave
  if (change === 0) return 'rgba(100, 116, 139, 0.60)'; // neutro
  if (change > -2)  return 'rgba(239, 68, 68, 0.45)';   // vermelho suave
  if (change > -5)  return 'rgba(239, 68, 68, 0.70)';   // vermelho médio
  return             'rgba(239, 68, 68, 0.90)';          // vermelho forte
}

function getGlowColor(change: number): string {
  if (change > 0) return 'rgba(16, 185, 129, 0.35)';
  if (change < 0) return 'rgba(239, 68, 68, 0.35)';
  return 'rgba(100, 116, 139, 0.20)';
}

interface TooltipData {
  block: HeatmapBlock;
  x: number;
  y: number;
}

export function MarketHeatmap({ assets, timeframe = '24h' }: MarketHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<'1h' | '24h'>(timeframe);

  const blocks = useMemo(() => buildHeatmapBlocks(assets, activeTimeframe), [assets, activeTimeframe]);
  const sorted = useMemo(() => [...blocks].sort((a, b) => b.weight - a.weight), [blocks]);

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-slate-100 text-lg">Market Heatmap</h2>
          <p className="text-xs text-slate-500 mt-0.5">Block size = Market Cap · Color = Price Change</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
          {(['1h', '24h'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                activeTimeframe === tf
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div
            className="w-24 h-3 rounded"
            style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.9), rgba(100,116,139,0.5), rgba(16,185,129,0.9))' }}
          />
          <span>Loss → Gain</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-slate-700 inline-block" /> Large Cap
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-slate-700 inline-block" /> Small Cap
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        className="flex-1 relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="absolute inset-0 flex flex-wrap gap-1 content-start">
          {sorted.map((block) => {
            const change = activeTimeframe === '1h'
              ? block.priceChangePercentage1h
              : block.priceChangePercentage24h;

            const minSize = 60;
            const maxSize = 180;
            const size = Math.round(minSize + block.weight * (maxSize - minSize));

            return (
              <div
                key={block.id}
                className="relative rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 flex flex-col items-center justify-center overflow-hidden select-none"
                style={{
                  width: `${size}px`,
                  height: `${Math.round(size * 0.7)}px`,
                  backgroundColor: getBlockColor(change),
                  boxShadow: `0 0 ${block.weight * 20}px ${getGlowColor(change)}`,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    block,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
              >
                <span
                  className="font-display font-bold leading-none text-white drop-shadow"
                  style={{ fontSize: `${Math.max(10, Math.min(16, size / 7))}px` }}
                >
                  {block.symbol}
                </span>
                <span
                  className="font-mono font-medium leading-none text-white/80 drop-shadow mt-0.5"
                  style={{ fontSize: `${Math.max(8, Math.min(12, size / 9))}px` }}
                >
                  {formatPercentage(change)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="glass-card border border-slate-600/50 p-3 min-w-[180px] shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display font-bold text-slate-100">{tooltip.block.symbol}</span>
              <span className="text-slate-400 text-xs">{tooltip.block.name}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Price</span>
                <span className="font-mono text-slate-200">{formatCurrency(tooltip.block.currentPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">1h Change</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: tooltip.block.priceChangePercentage1h >= 0 ? '#34d399' : '#f87171' }}
                >
                  {formatPercentage(tooltip.block.priceChangePercentage1h)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">24h Change</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: tooltip.block.priceChangePercentage24h >= 0 ? '#34d399' : '#f87171' }}
                >
                  {formatPercentage(tooltip.block.priceChangePercentage24h)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Market Cap</span>
                <span className="font-mono text-slate-300">{formatCurrency(tooltip.block.marketCap, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="text-blue-400">{tooltip.block.category}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}