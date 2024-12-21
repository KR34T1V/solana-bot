export interface Order {
  price: number;
  size: number;
}

export interface MarketState {
  bestBid: Order | null;
  bestAsk: Order | null;
}

export interface TradeDecision {
  shouldBuy: boolean;
  shouldSell: boolean;
  buyPrice?: number;
  sellPrice?: number;
  tradeSize?: number;
}

export interface TradingStrategy {
  analyze(state: MarketState): TradeDecision;
} 