export interface Trade {
  id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  profitLoss: string | null;
  strategyId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Strategy {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  config: Record<string, unknown>;
  trades: Trade[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Stats {
  totalTrades: number;
  successRate: string;
  profitLoss: string;
  activeStrategies: number;
} 