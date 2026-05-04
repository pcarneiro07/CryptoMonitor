import type {
  Asset,
  DashboardData,
  DeFiLlamaSnapshot,
  MarketAlert,
  MarketHealthScore,
  RiskRankingItem,
  VolatilityScore,
  VolumeVelocity,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchDashboardFromBackend(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`);

  if (!response.ok) {
    const detail = await safeReadError(response);
    throw new Error(detail || 'Falha ao buscar dashboard no backend.');
  }

  const dashboard = (await response.json()) as Partial<DashboardData>;
  return enrichDashboardData(dashboard);
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.detail || data?.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export function enrichDashboardData(raw: Partial<DashboardData>): DashboardData {
  const assets = raw.assets ?? [];
  const volatilityScores = raw.volatilityScores ?? [];
  const volumeVelocity = raw.volumeVelocity ?? [];
  const sectorDominance = raw.sectorDominance ?? [];

  const baseData = {
    ...raw,
    assets,
    volatilityScores,
    volumeVelocity,
    sectorDominance,
    marketKPIs: {
      totalMarketCap: raw.marketKPIs?.totalMarketCap ?? 0,
      totalVolume24h: raw.marketKPIs?.totalVolume24h ?? 0,
      btcDominance: raw.marketKPIs?.btcDominance ?? 0,
      ethDominance: raw.marketKPIs?.ethDominance ?? 0,
      fearGreedIndex: raw.marketKPIs?.fearGreedIndex ?? null,
      fearGreedLabel: raw.marketKPIs?.fearGreedLabel ?? null,
      activeAssets: raw.marketKPIs?.activeAssets ?? assets.length,
      marketCapChange24h: raw.marketKPIs?.marketCapChange24h ?? 0,
    },
    topGainer: raw.topGainer ?? null,
    topLoser: raw.topLoser ?? null,
    lastFetchedAt: raw.lastFetchedAt ?? new Date().toISOString(),
    nextFetchAt: raw.nextFetchAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    defiLlama: normalizeDefiLlama(raw.defiLlama),
  };

  const riskRanking = buildRiskRanking(
    baseData.assets,
    baseData.volatilityScores,
    baseData.volumeVelocity,
  );

  const alerts = buildMarketAlerts(baseData as DashboardData, riskRanking);
  const marketHealth = buildMarketHealthScore(baseData as DashboardData, riskRanking, alerts);

  return {
    ...(baseData as DashboardData),
    riskRanking,
    riskProfiles: riskRanking,
    alerts,
    marketHealth,
  };
}

function normalizeDefiLlama(
  value: DeFiLlamaSnapshot | null | undefined,
): DeFiLlamaSnapshot | null {
  if (!value) return null;

  const totalTvl = value.totalTvl ?? value.totalTvlUsd ?? 0;

  return {
    ...value,
    totalTvl,
    totalTvlUsd: value.totalTvlUsd ?? totalTvl,
    tvlChange24h: value.tvlChange24h ?? null,
    chainCount: value.chainCount ?? value.topChains?.length ?? 0,
    protocolCount: value.protocolCount ?? value.topProtocols?.length ?? 0,
    topChains: (value.topChains ?? []).map((chain) => ({
      ...chain,
      change24h: chain.change24h ?? chain.change1d ?? null,
    })),
    topProtocols: (value.topProtocols ?? []).map((protocol) => ({
      ...protocol,
      change24h: protocol.change24h ?? protocol.change1d ?? null,
    })),
    timestamp: value.timestamp ?? new Date().toISOString(),
  };
}

export function buildContextSnapshot(data: DashboardData) {
  return {
    fetchedAt: data.lastFetchedAt,
    marketKPIs: data.marketKPIs,
    marketHealth: data.marketHealth,
    topGainer: data.topGainer
      ? {
          symbol: data.topGainer.symbol,
          name: data.topGainer.name,
          change24h: data.topGainer.priceChangePercentage24h,
        }
      : null,
    topLoser: data.topLoser
      ? {
          symbol: data.topLoser.symbol,
          name: data.topLoser.name,
          change24h: data.topLoser.priceChangePercentage24h,
        }
      : null,
    sectors: data.sectorDominance,
    highestRiskAssets: data.riskRanking?.slice(0, 5) ?? [],
    alerts: data.alerts?.slice(0, 8) ?? [],
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getVolatilityMap(volatilityScores: VolatilityScore[]) {
  return new Map<string, VolatilityScore>(
    volatilityScores.map((item) => [item.assetId, item]),
  );
}

function getVolumeMap(volumeVelocity: VolumeVelocity[]) {
  return new Map<string, VolumeVelocity>(
    volumeVelocity.map((item) => [item.assetId, item]),
  );
}

function riskLabel(score: number): RiskRankingItem['label'] {
  if (score >= 75) return 'Extremo';
  if (score >= 55) return 'Alto';
  if (score >= 30) return 'Moderado';
  return 'Baixo';
}

export function buildRiskRanking(
  assets: Asset[],
  volatilityScores: VolatilityScore[],
  volumeVelocity: VolumeVelocity[],
): RiskRankingItem[] {
  const volatilityMap = getVolatilityMap(volatilityScores);
  const volumeMap = getVolumeMap(volumeVelocity);

  return assets
    .map((asset: Asset) => {
      const volatility = volatilityMap.get(asset.id);
      const volume = volumeMap.get(asset.id);

      const volatilityNormalized = volatility?.normalized ?? 0;
      const return24h = asset.priceChangePercentage24h ?? 0;
      const volumeChange30m = volume?.volumeChange30m ?? 0;
      const athDistance = Math.abs(asset.athChangePercentage ?? 0);

      const volatilityComponent = volatilityNormalized;
      const drawdownComponent = clamp(Math.abs(Math.min(return24h, 0)) * 12);
      const volumeComponent = clamp(Math.abs(volumeChange30m) * 2);
      const athComponent = clamp(athDistance);
      const anomalyBonus = volume?.isAnomaly ? 15 : 0;

      const riskScore = clamp(
        volatilityComponent * 0.42 +
          drawdownComponent * 0.22 +
          volumeComponent * 0.16 +
          athComponent * 0.12 +
          anomalyBonus,
      );

      const roundedRiskScore = Math.round(riskScore);

      return {
        assetId: asset.id,
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        image: asset.image,
        category: asset.category,
        riskScore: roundedRiskScore,
        volatility: volatilityNormalized,
        volatilityNormalized,
        priceChange24h: return24h,
        return24h,
        volumeChange30m,
        athDistance,
        isVolumeAnomaly: Boolean(volume?.isAnomaly),
        label: riskLabel(roundedRiskScore),
      };
    })
    .sort((a: RiskRankingItem, b: RiskRankingItem) => b.riskScore - a.riskScore);
}

export function buildMarketAlerts(
  data: DashboardData,
  riskRanking: RiskRankingItem[],
): MarketAlert[] {
  const alerts: MarketAlert[] = [];

  const marketChange = data.marketKPIs.marketCapChange24h;

  if (marketChange <= -2) {
    alerts.push({
      id: 'market-drop',
      type: 'risk',
      severity: 'high',
      title: 'Queda relevante no mercado',
      metric: `${marketChange.toFixed(2)}%`,
      description: `O market cap ponderado do recorte caiu ${marketChange.toFixed(
        2,
      )}% em 24h. Isso sugere pressão vendedora ampla no conjunto monitorado.`,
    });
  } else if (marketChange >= 2) {
    alerts.push({
      id: 'market-rise',
      type: 'positive',
      severity: 'positive',
      title: 'Mercado em recuperação',
      metric: `+${marketChange.toFixed(2)}%`,
      description: `O market cap ponderado do recorte subiu ${marketChange.toFixed(
        2,
      )}% em 24h. O movimento indica melhora de momentum no grupo analisado.`,
    });
  }

  const extremeVolatility = data.volatilityScores.filter(
    (item: VolatilityScore) => item.level === 'extreme',
  );

  if (extremeVolatility.length > 0) {
    alerts.push({
      id: 'extreme-volatility',
      type: 'warning',
      severity: 'medium',
      title: 'Volatilidade extrema detectada',
      metric: `${extremeVolatility.length}`,
      description: `${extremeVolatility
        .slice(0, 4)
        .map((item: VolatilityScore) => item.symbol)
        .join(', ')} estão com os maiores scores relativos de volatilidade no momento.`,
    });
  }

  const volumeAnomalies = data.volumeVelocity.filter(
    (item: VolumeVelocity) => item.isAnomaly,
  );

  if (volumeAnomalies.length > 0) {
    alerts.push({
      id: 'volume-anomaly',
      type: 'warning',
      severity: 'high',
      title: 'Anomalia de volume',
      metric: `${volumeAnomalies.length}`,
      description: `${volumeAnomalies
        .slice(0, 4)
        .map((item: VolumeVelocity) => item.symbol)
        .join(', ')} apresentam aceleração de volume fora do padrão recente coletado.`,
    });
  }

  const topRisk = riskRanking[0];

  if (topRisk && topRisk.riskScore >= 70) {
    alerts.push({
      id: `risk-${topRisk.assetId}`,
      type: 'risk',
      severity: 'high',
      title: `${topRisk.symbol} lidera ranking de risco`,
      metric: `${topRisk.riskScore}/100`,
      description: `${topRisk.name} combina volatilidade, variação recente e distância da máxima histórica em nível elevado.`,
      assetId: topRisk.assetId,
      symbol: topRisk.symbol,
      category: topRisk.category,
    });
  }

  const weakestSector = [...data.sectorDominance]
    .filter((sector) => sector.assetCount > 0)
    .sort((a, b) => a.avgPriceChange24h - b.avgPriceChange24h)[0];

  if (weakestSector && weakestSector.avgPriceChange24h <= -1) {
    alerts.push({
      id: `sector-${weakestSector.category}`,
      type: 'warning',
      severity: 'medium',
      title: `Pressão no setor ${weakestSector.category}`,
      metric: `${weakestSector.avgPriceChange24h.toFixed(2)}%`,
      description: `O setor ${weakestSector.category} tem queda média de ${weakestSector.avgPriceChange24h.toFixed(
        2,
      )}% no recorte de 24h.`,
      category: weakestSector.category,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: 'stable-market',
      type: 'info',
      severity: 'info',
      title: 'Sem anomalias críticas',
      metric: 'OK',
      description:
        'Nenhuma queda ampla, pico extremo de volume ou concentração crítica de risco foi detectada no recorte atual.',
    });
  }

  return alerts;
}

function resolveTone(score: number): string {
  if (score < 35) return 'critical';
  if (score < 55) return 'warning';
  if (score < 72) return 'neutral';
  return 'positive';
}

// ---------------------------------------------------------------------------
// Sentiment component (tópico 6)
//
// Fear & Greed já vem em escala 0–100, então mapeia direto.
// Quando indisponível retorna 50 (neutro) — igual ao comportamento anterior,
// mas agora é explícito e documentado.
// ---------------------------------------------------------------------------
function computeSentimentComponent(fearGreedIndex: number | null | undefined): number {
  if (fearGreedIndex == null) return 50;
  // Fear & Greed já é 0–100: baixo = medo (mercado estressado → score menor),
  // alto = ganância (mercado confiante → score maior). Mapeia direto.
  return clamp(fearGreedIndex);
}

// ---------------------------------------------------------------------------
// DeFi component (tópico 6)
//
// Usa a variação média de TVL nas top chains (tvlChange24h) para derivar um
// score. TVL crescendo = mercado DeFi saudável = score maior.
// Escala: variação de +5% ou mais → 100; variação de -5% ou menos → 0.
// Quando indisponível retorna 50 (neutro).
// ---------------------------------------------------------------------------
function computeDefiComponent(defiLlama: DeFiLlamaSnapshot | null | undefined): number {
  if (!defiLlama) return 50;

  // Tenta tvlChange24h primeiro (média das top chains calculada pelo backend).
  // Se nulo, deriva a variação média das top chains disponíveis.
  let tvlChange = defiLlama.tvlChange24h;

  if (tvlChange == null && defiLlama.topChains && defiLlama.topChains.length > 0) {
    const chainChanges = defiLlama.topChains
      .map((c) => c.change24h ?? c.change1d ?? null)
      .filter((v): v is number => v != null);

    tvlChange = chainChanges.length > 0 ? avg(chainChanges) : null;
  }

  if (tvlChange == null) return 50;

  // Mapeia variação percentual para 0–100:
  // -5% → 0 | 0% → 50 | +5% → 100
  // Além desses extremos, o clamp garante que não sai do intervalo.
  return clamp(50 + tvlChange * 10);
}

export function buildMarketHealthScore(
  data: DashboardData,
  riskRanking: RiskRankingItem[],
  alerts: MarketAlert[],
): MarketHealthScore {
  const marketChange = data.marketKPIs.marketCapChange24h;
  const avgVolatility = avg(
    data.volatilityScores.map((item: VolatilityScore) => item.normalized),
  );
  const avgRisk = avg(
    riskRanking.slice(0, 10).map((item: RiskRankingItem) => item.riskScore),
  );
  const anomalyCount = data.volumeVelocity.filter(
    (item: VolumeVelocity) => item.isAnomaly,
  ).length;

  const positiveAssets = data.assets.filter(
    (asset: Asset) => asset.priceChangePercentage24h > 0,
  ).length;

  const breadth =
    data.assets.length > 0 ? (positiveAssets / data.assets.length) * 100 : 50;

  const momentumComponent = clamp(50 + marketChange * 8);
  const volatilityComponent = clamp(100 - avgVolatility);
  const riskComponent = clamp(100 - avgRisk);
  const breadthComponent = clamp(breadth);
  const volumeComponent = clamp(100 - anomalyCount * 12);
  const alertPenalty = alerts.filter((alert: MarketAlert) => alert.type === 'risk').length * 8;

  // Tópico 6: sentimento e DeFi agora usam dados reais quando disponíveis
  const sentimentComponent = computeSentimentComponent(data.marketKPIs.fearGreedIndex);
  const defiComponent = computeDefiComponent(data.defiLlama);

  // Pesos redistribuídos para incluir sentimento (8%) e DeFi (7%)
  // reduzindo levemente momentum e risco para acomodar sem mudar a escala geral.
  const score = clamp(
    momentumComponent  * 0.22 +
    volatilityComponent * 0.20 +
    riskComponent       * 0.20 +
    breadthComponent    * 0.16 +
    volumeComponent     * 0.15 +
    sentimentComponent  * 0.07 +   // antes: 50 fixo
    defiComponent       * 0.05 -   // antes: 50 fixo
    alertPenalty,
  );

  const roundedScore = Math.round(score);

  let label = 'Saudável';
  let status = 'Saudável';

  if (roundedScore < 35) {
    label = 'Risco elevado';
    status = 'Risco elevado';
  } else if (roundedScore < 55) {
    label = 'Atenção';
    status = 'Atenção';
  } else if (roundedScore < 72) {
    label = 'Neutro';
    status = 'Neutro';
  }

  const reasons: string[] = [];

  if (marketChange < 0) {
    reasons.push(`Mercado ponderado em queda de ${marketChange.toFixed(2)}% em 24h`);
  } else if (marketChange > 0) {
    reasons.push(`Mercado ponderado em alta de ${marketChange.toFixed(2)}% em 24h`);
  } else {
    reasons.push('Mercado ponderado estável no recorte de 24h');
  }

  reasons.push(`${positiveAssets}/${data.assets.length} ativos positivos em 24h`);

  if (avgVolatility >= 60) {
    reasons.push('Volatilidade média elevada no recorte monitorado');
  } else {
    reasons.push('Volatilidade média ainda controlada no recorte monitorado');
  }

  if (anomalyCount > 0) {
    reasons.push(`${anomalyCount} anomalia(s) de volume detectada(s)`);
  } else {
    reasons.push('Sem anomalias relevantes de volume no momento');
  }

  // Razão de sentimento — só aparece quando o dado está disponível
  if (data.marketKPIs.fearGreedIndex != null) {
    const fg = data.marketKPIs.fearGreedIndex;
    const fgLabel = data.marketKPIs.fearGreedLabel ?? '';
    if (fg <= 25) {
      reasons.push(`Sentimento em medo extremo (Fear & Greed: ${fg} — ${fgLabel})`);
    } else if (fg >= 75) {
      reasons.push(`Sentimento em ganância extrema (Fear & Greed: ${fg} — ${fgLabel})`);
    } else {
      reasons.push(`Sentimento de mercado: ${fgLabel} (Fear & Greed: ${fg})`);
    }
  }

  // Razão de DeFi — só aparece quando o dado está disponível
  const tvlChange = data.defiLlama?.tvlChange24h;
  if (tvlChange != null) {
    if (tvlChange >= 1) {
      reasons.push(`TVL DeFi em expansão (${tvlChange >= 0 ? '+' : ''}${tvlChange.toFixed(2)}% nas top chains)`);
    } else if (tvlChange <= -1) {
      reasons.push(`TVL DeFi em retração (${tvlChange.toFixed(2)}% nas top chains)`);
    } else {
      reasons.push(`TVL DeFi estável (${tvlChange >= 0 ? '+' : ''}${tvlChange.toFixed(2)}% nas top chains)`);
    }
  }

  return {
    score: roundedScore,
    label,
    status,
    tone: resolveTone(roundedScore),
    drivers: reasons,
    reasons,
    components: {
      momentum: Math.round(momentumComponent),
      volatility: Math.round(volatilityComponent),
      volume: Math.round(volumeComponent),
      breadth: Math.round(breadthComponent),
      sentiment: Math.round(sentimentComponent),
      defi: Math.round(defiComponent),
    },
  };
}

export function formatCurrency(value: number, compact = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 6,
  }).format(value);
}

export function formatNumber(value: number, compact = true): string {
  return new Intl.NumberFormat('en-US', {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function getSectorColor(category: string): string {
  const colors: Record<string, string> = {
    'Layer 1': '#3b82f6',
    'Layer 2': '#8b5cf6',
    DeFi: '#10b981',
    RWA: '#f59e0b',
    'Exchange Token': '#ec4899',
    Stablecoin: '#6b7280',
    Meme: '#f97316',
    Other: '#64748b',
  };

  return colors[category] ?? colors.Other;
}

export function getHeatmapColor(changePercentage: number): string {
  if (changePercentage >= 5) return 'bg-emerald-500/90';
  if (changePercentage >= 2) return 'bg-emerald-500/70';
  if (changePercentage > 0) return 'bg-emerald-500/45';
  if (changePercentage === 0) return 'bg-slate-600/60';
  if (changePercentage > -2) return 'bg-red-500/45';
  if (changePercentage > -5) return 'bg-red-500/70';
  return 'bg-red-500/90';
}
