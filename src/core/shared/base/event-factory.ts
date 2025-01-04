import { EventPriority } from '../types/events';
import type { BaseEvent, EventMetadata, EventOptions, EventSource } from '../types/events';

export abstract class BaseEventFactory<T extends BaseEvent> {
  constructor(
    protected readonly source: EventSource,
    protected readonly version: string = '1.0.0'
  ) {}

  abstract create(data: Partial<T>, options?: EventOptions): Promise<T>;

  protected createMetadata(options?: EventOptions): EventMetadata {
    return {
      version: this.version,
      source: this.source,
      correlationId: options?.correlationId || crypto.randomUUID(),
      causationId: options?.causationId,
      environment: process.env.NODE_ENV as 'production' | 'staging' | 'development',
      priority: options?.priority || EventPriority.MEDIUM,
      retryCount: 0,
      tags: options?.tags || [],
      context: options?.context || {}
    };
  }

  protected validate(event: T): boolean {
    if (!event.id || !event.type || !event.timestamp) {
      return false;
    }
    return this.validateEvent(event);
  }

  protected abstract validateEvent(event: T): boolean;

  protected enrich(event: Partial<T>, options?: EventOptions): T {
    const now = Date.now();
    const metadata = this.createMetadata(options);

    return {
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || now,
      metadata: {
        ...metadata,
        ...event.metadata
      }
    } as T;
  }
} 