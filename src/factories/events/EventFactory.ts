import { v4 as uuid } from 'uuid';
import type {
  BaseEvent,
  EventType,
  EventContext,
  ValidationResult,
  MarketEvent,
  TradingEvent,
  SystemEvent,
  UserEvent
} from '@types/events';
import type { IEventFactory, EventFactoryOptions } from './interfaces';
import { eventSchemas } from './eventSchemas';
import {
  FactoryValidationError,
  FactorySchemaError,
  FactoryContextError,
  FactoryStateError,
  FactoryInitializationError
} from '@errors';

export class EventFactory implements IEventFactory {
  private static readonly FACTORY_NAME = 'EventFactory';
  private defaultContext?: EventContext;
  private defaultMetadata?: Partial<BaseEvent['metadata']>;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new FactoryInitializationError(
        EventFactory.FACTORY_NAME,
        'Already initialized'
      );
    }
    // Add initialization logic here (e.g., connecting to services)
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      throw new FactoryInitializationError(
        EventFactory.FACTORY_NAME,
        'Not initialized'
      );
    }
    // Add cleanup logic here
    this.initialized = false;
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new FactoryStateError(
        EventFactory.FACTORY_NAME,
        'Not initialized'
      );
    }
  }

  async createEvent<T extends BaseEvent>(
    type: EventType,
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T> {
    this.checkInitialized();

    const schema = eventSchemas[type];
    if (!schema) {
      throw new FactorySchemaError(
        EventFactory.FACTORY_NAME,
        `No schema found for event type: ${type}`
      );
    }

    const event = {
      id: uuid(),
      type,
      timestamp: new Date().toISOString(),
      version: 1,
      metadata: this.buildMetadata(options?.metadata),
      ...data
    };

    if (options?.validate !== false) {
      const validationResult = await this.validateEvent(event as T);
      if (!validationResult.isValid) {
        throw new FactoryValidationError(
          EventFactory.FACTORY_NAME,
          'Event validation failed',
          { errors: validationResult.errors }
        );
      }
    }

    return event as T;
  }

  async createMarketEvent<T extends MarketEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T> {
    return this.createEvent<T>(data.type as EventType, data, options);
  }

  async createTradingEvent<T extends TradingEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T> {
    return this.createEvent<T>(data.type as EventType, data, options);
  }

  async createSystemEvent<T extends SystemEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T> {
    return this.createEvent<T>(data.type as EventType, data, options);
  }

  async createUserEvent<T extends UserEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T> {
    return this.createEvent<T>(data.type as EventType, data, options);
  }

  async createEvents<T extends BaseEvent>(
    events: Array<{
      type: EventType;
      data: Partial<T>;
      options?: EventFactoryOptions;
    }>
  ): Promise<T[]> {
    return Promise.all(
      events.map(({ type, data, options }) =>
        this.createEvent<T>(type, data, options)
      )
    );
  }

  async validateEvent<T extends BaseEvent>(event: T): Promise<ValidationResult> {
    const schema = eventSchemas[event.type as keyof typeof eventSchemas];
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          field: 'type',
          message: `No schema found for event type: ${event.type}`,
          code: 'SCHEMA_NOT_FOUND'
        }]
      };
    }

    try {
      schema.parse(event);
      return { isValid: true };
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          errors: [{
            field: 'validation',
            message: error.message,
            code: 'VALIDATION_FAILED'
          }]
        };
      }
      throw error;
    }
  }

  setDefaultContext(context: EventContext): void {
    this.defaultContext = context;
  }

  getDefaultContext(): EventContext {
    if (!this.defaultContext) {
      throw new FactoryContextError(
        EventFactory.FACTORY_NAME,
        'No default context set'
      );
    }
    return this.defaultContext;
  }

  setDefaultMetadata(metadata: Partial<BaseEvent['metadata']>): void {
    this.defaultMetadata = metadata;
  }

  getDefaultMetadata(): Partial<BaseEvent['metadata']> {
    if (!this.defaultMetadata) {
      throw new FactoryContextError(
        EventFactory.FACTORY_NAME,
        'No default metadata set'
      );
    }
    return this.defaultMetadata;
  }

  private buildMetadata(
    metadata?: Partial<BaseEvent['metadata']>
  ): BaseEvent['metadata'] {
    return {
      source: 'event-factory',
      environment: process.env.NODE_ENV || 'development',
      ...this.defaultMetadata,
      ...metadata
    };
  }
} 