export interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
  metadata: EventMetadata;
}

export interface EventMetadata {
  version: string;
  source: string;
  correlationId?: string;
  causationId?: string;
  environment?: 'production' | 'staging' | 'development';
  priority?: 'high' | 'medium' | 'low';
  retryCount?: number;
  tags?: string[];
  context?: Record<string, unknown>;
}

export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum EventSource {
  SYSTEM = 'system',
  USER = 'user',
  MARKET = 'market',
  TRADING = 'trading',
  RISK = 'risk'
}

export interface EventOptions {
  priority?: EventPriority;
  tags?: string[];
  context?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
} 