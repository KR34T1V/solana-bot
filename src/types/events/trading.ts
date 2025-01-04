import type { BaseEvent, TradingEventType } from './base';

export interface TradingEvent extends BaseEvent {
  type: TradingEventType;
  symbol: string;
  exchange: string;
  orderId: string;
}

export interface OrderCreatedEvent extends TradingEvent {
  type: 'ORDER_CREATED';
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  strategy?: string;
}

export interface OrderExecutedEvent extends TradingEvent {
  type: 'ORDER_EXECUTED';
  executionId: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  timestamp: string;
  fee?: number;
  remainingQuantity: number;
}

export interface OrderCancelledEvent extends TradingEvent {
  type: 'ORDER_CANCELLED';
  reason: string;
  timestamp: string;
  remainingQuantity: number;
}

export interface TradeSettledEvent extends TradingEvent {
  type: 'TRADE_SETTLED';
  tradeId: string;
  settlementId: string;
  quantity: number;
  price: number;
  timestamp: string;
  fee: number;
}

export interface PositionUpdatedEvent extends TradingEvent {
  type: 'POSITION_UPDATED';
  oldPosition: number;
  newPosition: number;
  averagePrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
} 