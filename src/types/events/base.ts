/**
 * Base Event Types and Interfaces
 */

export type EventType = 
  | MarketEventType
  | TradingEventType
  | SystemEventType
  | UserEventType;

export type MarketEventType = 
  | 'PRICE_UPDATE'
  | 'LIQUIDITY_CHANGE'
  | 'MARKET_DEPTH'
  | 'TRADING_STATUS'
  | 'ORDER_BOOK_UPDATE';

export type TradingEventType =
  | 'ORDER_CREATED'
  | 'ORDER_EXECUTED'
  | 'ORDER_CANCELLED'
  | 'TRADE_SETTLED'
  | 'POSITION_UPDATED';

export type SystemEventType =
  | 'HEALTH_CHECK'
  | 'CONFIG_CHANGE'
  | 'ERROR_OCCURRED'
  | 'METRIC_REPORTED'
  | 'STATE_CHANGED';

export type UserEventType =
  | 'USER_ACTION'
  | 'PREFERENCE_UPDATE'
  | 'STRATEGY_CHANGE'
  | 'RISK_UPDATE'
  | 'SESSION_EVENT';

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: string; // ISO format
  version: number;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  source: string;
  environment: string;
  userId?: string;
  custom?: Record<string, unknown>;
}

export interface EventContext {
  user?: UserContext;
  system?: SystemContext;
  market?: MarketContext;
}

export interface UserContext {
  id: string;
  permissions: string[];
  preferences: Record<string, unknown>;
  session?: string;
}

export interface SystemContext {
  nodeId: string;
  environment: string;
  version: string;
  state: SystemState;
}

export interface MarketContext {
  tradingSession: string;
  marketState: MarketState;
  conditions: MarketConditions;
}

export type SystemState = 'STARTING' | 'RUNNING' | 'DEGRADED' | 'ERROR' | 'SHUTTING_DOWN';
export type MarketState = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET' | 'HALTED';

export interface MarketConditions {
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
} 