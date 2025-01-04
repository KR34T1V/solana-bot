import type {
  BaseEvent,
  EventType,
  EventContext,
  ValidationResult,
  MarketEvent,
  TradingEvent,
  SystemEvent,
  UserEvent
} from '../../types/events';

export interface EventFactoryOptions {
  context?: EventContext;
  metadata?: Partial<BaseEvent['metadata']>;
  validate?: boolean;
}

export interface IEventFactory {
  // Core Creation Methods
  createEvent<T extends BaseEvent>(
    type: EventType,
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T>;

  // Specialized Creation Methods
  createMarketEvent<T extends MarketEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T>;

  createTradingEvent<T extends TradingEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T>;

  createSystemEvent<T extends SystemEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T>;

  createUserEvent<T extends UserEvent>(
    data: Partial<T>,
    options?: EventFactoryOptions
  ): Promise<T>;

  // Batch Operations
  createEvents<T extends BaseEvent>(
    events: Array<{
      type: EventType;
      data: Partial<T>;
      options?: EventFactoryOptions;
    }>
  ): Promise<T[]>;

  // Validation
  validateEvent<T extends BaseEvent>(
    event: T
  ): Promise<ValidationResult>;

  // Context Management
  setDefaultContext(context: EventContext): void;
  getDefaultContext(): EventContext;
  
  // Metadata Management
  setDefaultMetadata(metadata: Partial<BaseEvent['metadata']>): void;
  getDefaultMetadata(): Partial<BaseEvent['metadata']>;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
} 