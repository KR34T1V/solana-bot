import type { BaseEvent, MarketEventType } from './base';

export interface MarketEvent extends BaseEvent {
  type: MarketEventType;
  symbol: string;
  exchange: string;
  timestamp: string;
}

export interface PriceUpdateEvent extends MarketEvent {
  type: 'PRICE_UPDATE';
  price: number;
  volume: number;
  side: 'BUY' | 'SELL';
}

export interface LiquidityChangeEvent extends MarketEvent {
  type: 'LIQUIDITY_CHANGE';
  oldLiquidity: number;
  newLiquidity: number;
  reason?: string;
}

export interface MarketDepthEvent extends MarketEvent {
  type: 'MARKET_DEPTH';
  bids: Array<[number, number]>; // [price, size]
  asks: Array<[number, number]>; // [price, size]
  sequenceNumber: number;
}

export interface TradingStatusEvent extends MarketEvent {
  type: 'TRADING_STATUS';
  status: 'OPEN' | 'CLOSED' | 'HALTED';
  reason?: string;
  expectedDuration?: number; // in milliseconds
}

export interface OrderBookUpdateEvent extends MarketEvent {
  type: 'ORDER_BOOK_UPDATE';
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  action: 'ADD' | 'REMOVE' | 'MODIFY';
} 