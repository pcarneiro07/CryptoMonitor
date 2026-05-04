export interface Asset {
  [key: string]: any;

  id: string;
  symbol: string;
  name: string;
  image: string;
  category: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage1h: number;
  marketCap: number;
  marketCapRank: number | null;
  fullyDilutedValuation: number | null;
  totalVolume: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  lastUpdated: string;
  ath: number;
  athDate: string | null;
  athChangePercentage: number;
}

export type CryptoAsset = Asset;

export interface HeatmapBlock {
  id: string;
  symbol: string;
  name: string;
  category: string;
  marketCap: number;
  priceChangePercentage24h: number;
  priceChangePercentage1h: number;
  currentPrice: number;
  volume: number;
  weight: number;
  colorIntensity: number;
}

export interface VolatilityScore {
  assetId: string;
  symbol: string;
  score: number;
  normalized: number;
  level: 'low' | 'medium' | 'high' | 'extreme';
}

export interface SectorDominance {
  category: string;
  totalMarketCap: number;
  marketShare: number;
  assetCount: number;
  avgPriceChange24h: number;
  color: string;
}

export interface VolumeVelocity {
  assetId: string;
  symbol: string;
  volumeChange30m: number;
  currentVolume: number;
  previousVolume: number;
  isAnomaly: boolean;
}

export interface MarketKPIs {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  fearGreedIndex: number | null;
  fearGreedLabel?: string | null;
  activeAssets: number;
  marketCapChange24h: number;
}

export interface AssetTimeSeriesPoint {
  timestamp: string;
  price: number;
  volume: number;
  marketCap?: number;
}

export interface AssetTimeSeries {
  assetId: string;
  symbol: string;
  points: AssetTimeSeriesPoint[];
}

export interface MarketHealthScore {
  score: number;
  label: string;
  status: string;
  tone: string;
  drivers: string[];
  reasons: string[];
  components: {
    momentum: number;
    volatility: number;
    volume: number;
    breadth: number;
    sentiment: number;
    defi: number;
  };
}

export interface MarketAlert {
  id: string;
  type: 'info' | 'warning' | 'risk' | 'positive';
  title: string;
  description: string;
  metric?: string;
  assetId?: string;
  symbol?: string;
  category?: string;
  severity: 'low' | 'medium' | 'high' | 'info' | 'warning' | 'positive' | 'critical';
}

export interface RiskRankingItem {
  assetId: string;
  id: string;
  symbol: string;
  name: string;
  image: string;
  category: string;
  riskScore: number;
  volatility: number;
  volatilityNormalized: number;
  priceChange24h: number;
  return24h: number;
  volumeChange30m: number;
  athDistance: number;
  isVolumeAnomaly: boolean;
  label: 'Baixo' | 'Moderado' | 'Alto' | 'Extremo';
}

export type AssetRiskProfile = RiskRankingItem;

export interface FearGreedData {
  value: number | null;
  classification: string | null;
  timestamp: string | null;
}

export interface DeFiLlamaSnapshot {
  totalTvl: number;
  totalTvlUsd: number;
  tvlChange24h: number | null;
  chainCount: number;
  protocolCount: number;
  topChains: Array<{
    name: string;
    tvl: number;
    change1d?: number | null;
    change7d?: number | null;
    change24h?: number | null;
  }>;
  topProtocols: Array<{
    name: string;
    chain?: string;
    category?: string;
    tvl: number;
    change1d?: number | null;
    change7d?: number | null;
    change24h?: number | null;
  }>;
  timestamp: string;
}

export type DeFiLlamaSummary = DeFiLlamaSnapshot;

export interface DashboardData {
  assets: Asset[];
  volatilityScores: VolatilityScore[];
  sectorDominance: SectorDominance[];
  volumeVelocity: VolumeVelocity[];
  marketKPIs: MarketKPIs;
  topGainer: Asset | null;
  topLoser: Asset | null;
  lastFetchedAt: string;
  nextFetchAt: string;
  timeSeries?: AssetTimeSeries[];

  marketHealth: MarketHealthScore;
  alerts: MarketAlert[];
  riskRanking: RiskRankingItem[];
  riskProfiles: RiskRankingItem[];

  fearGreed?: FearGreedData;
  defiLlama: DeFiLlamaSnapshot | null;
  databaseWarning?: string;
}

export interface FetchStatus {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  lastSuccess: string | null;
  countdown: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DatabaseSummary {
  dbPath: string;
  totals: {
    assets: number;
    assetSnapshots: number;
    marketSnapshots: number;
    sectorSnapshots: number;
    volatilitySnapshots: number;
    volumeVelocitySnapshots: number;
    defillamaSnapshots: number;
  };
  period: {
    firstTimestamp: string | null;
    lastTimestamp: string | null;
  };
  assets: Array<{
    id: string;
    symbol: string;
    name: string;
    category: string | null;
    market_cap_rank: number | null;
    updated_at: string;
  }>;
  latestMarketSnapshot: Record<string, unknown> | null;
}

export interface BackfillStatus {
  isRunning: boolean;
  shouldStop: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  days: number | null;
  limit: number | null;
  totalAssets: number;
  processedAssets: number;
  currentAsset: string | null;
  savedRows: number;
  errors: Array<{
    assetId: string | null;
    symbol: string | null;
    message: string;
    timestamp: string;
  }>;
  statusMessage: string;
}