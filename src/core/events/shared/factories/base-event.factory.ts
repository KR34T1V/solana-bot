import type { BaseEvent, EventMetadata, EventOptions, EventValidationError } from '../types/event';
import { EventPriority, EventSource, EventStatus } from '../types/enums';

export abstract class BaseEventFactory<T extends BaseEvent> {
  constructor(
    protected readonly source: EventSource,
    protected readonly version: string = '1.0.0'
  ) {}

  /**
   * Create a new event instance
   */
  async create(data: Partial<T>, options: EventOptions = {}): Promise<T> {
    const event = this.createEvent(data, options);
    const validationErrors = await this.validate(event);
    
    if (validationErrors.length > 0) {
      throw new Error(`Event validation failed: ${JSON.stringify(validationErrors)}`);
    }

    return event;
  }

  /**
   * Create multiple events in batch
   */
  async createBatch(dataArray: Partial<T>[], options: EventOptions = {}): Promise<T[]> {
    return Promise.all(dataArray.map(data => this.create(data, options)));
  }

  /**
   * Validate the event
   */
  protected abstract validate(event: T): Promise<EventValidationError[]>;

  /**
   * Create the event instance with metadata
   */
  protected createEvent(data: Partial<T>, options: EventOptions): T {
    return {
      ...data,
      id: data.id || crypto.randomUUID(),
      timestamp: data.timestamp || Date.now(),
      status: EventStatus.CREATED,
      metadata: this.createMetadata(options),
    } as T;
  }

  /**
   * Create event metadata
   */
  protected createMetadata(options: EventOptions): EventMetadata {
    return {
      version: this.version,
      source: this.source,
      correlationId: options.correlationId,
      causationId: options.causationId,
      environment: process.env.NODE_ENV as 'production' | 'staging' | 'development' || 'development',
      priority: options.priority || EventPriority.MEDIUM,
      retryCount: 0,
      tags: options.tags || [],
      context: options.context || {},
    };
  }

  /**
   * Enrich event with additional data
   */
  protected abstract enrich(event: T): Promise<T>;
} 