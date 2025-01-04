import type { EventFactory } from '@factories/events/EventFactory';
import type { ErrorOccurredEvent } from '@types/events';
import type { ApplicationError } from './base';

export class ErrorEventEmitter {
  private static instance: ErrorEventEmitter;
  private eventFactory?: EventFactory;

  private constructor() {}

  static getInstance(): ErrorEventEmitter {
    if (!ErrorEventEmitter.instance) {
      ErrorEventEmitter.instance = new ErrorEventEmitter();
    }
    return ErrorEventEmitter.instance;
  }

  setEventFactory(factory: EventFactory): void {
    this.eventFactory = factory;
  }

  async emitError(
    error: ApplicationError,
    component: string,
    handled = true
  ): Promise<void> {
    if (!this.eventFactory) {
      // If event factory isn't available, just log the error
      console.error('[ErrorEventEmitter]', error);
      return;
    }

    try {
      await this.eventFactory.createSystemEvent<ErrorOccurredEvent>({
        type: 'ERROR_OCCURRED',
        component,
        severity: this.determineSeverity(error),
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack,
          context: error.details
        },
        handled,
        impact: this.determineImpact(error)
      });
    } catch (emitError) {
      // Prevent infinite loop of error events
      console.error('[ErrorEventEmitter] Failed to emit error event:', emitError);
      console.error('Original error:', error);
    }
  }

  private determineSeverity(error: ApplicationError): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' {
    switch (error.code) {
      case 'VALIDATION_ERROR':
      case 'SCHEMA_ERROR':
        return 'WARNING';
      case 'INITIALIZATION_ERROR':
      case 'STATE_ERROR':
        return 'CRITICAL';
      case 'CONTEXT_ERROR':
      case 'CONFIGURATION_ERROR':
        return 'ERROR';
      default:
        return 'INFO';
    }
  }

  private determineImpact(error: ApplicationError): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (error.code) {
      case 'VALIDATION_ERROR':
      case 'SCHEMA_ERROR':
        return 'LOW';
      case 'CONTEXT_ERROR':
      case 'CONFIGURATION_ERROR':
        return 'MEDIUM';
      case 'INITIALIZATION_ERROR':
      case 'STATE_ERROR':
        return 'HIGH';
      default:
        return 'LOW';
    }
  }
} 