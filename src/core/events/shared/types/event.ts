import { EventPriority, EventSource, EventStatus } from './enums';

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: number;
  metadata: EventMetadata;
  status: EventStatus;
}

export interface EventMetadata {
  version: string;
  source: EventSource;
  correlationId?: string;
  causationId?: string;
  environment: 'production' | 'staging' | 'development';
  priority: EventPriority;
  retryCount: number;
  tags: string[];
  context: Record<string, unknown>;
}

export interface EventOptions {
  priority?: EventPriority;
  correlationId?: string;
  causationId?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

export interface EventValidationError {
  field: string;
  message: string;
  code: string;
} 