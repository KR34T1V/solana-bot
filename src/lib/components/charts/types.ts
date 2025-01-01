export type TimeRange = '1h' | '4h' | '1d' | '1w' | '1m';

export interface PriceData {
  value: number;
  timestamp: number;
}

export interface ChartOptions {
  timeRange: TimeRange;
  showVolume?: boolean;
  showGrid?: boolean;
  height?: number;
  tooltips?: boolean;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface ChartData {
  token: TokenInfo;
  prices: PriceData[];
  timeRange: TimeRange;
  lastUpdated: number;
} 