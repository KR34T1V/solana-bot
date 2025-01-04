import { BaseEventFactory } from '../../shared/factories/base-event.factory';
import type { EventValidationError } from '../../shared/types/event';
import { EventSource } from '../../shared/types/enums';
import type { SystemEvent } from '../types/system-event';
import { SystemEventType } from '../types/system-event';
import { getSystemMetrics } from '../utils/metrics';

export class SystemEventFactory extends BaseEventFactory<SystemEvent> {
  constructor(version?: string) {
    super(EventSource.SYSTEM, version);
  }

  /**
   * Create a health check event
   */
  async createHealthCheck(component: string): Promise<SystemEvent> {
    const metrics = await getSystemMetrics();
    
    return this.create({
      type: SystemEventType.HEALTH_CHECK,
      component,
      details: {
        message: `Health check for ${component}`,
        metrics
      }
    });
  }

  /**
   * Create an error event
   */
  async createError(component: string, error: Error): Promise<SystemEvent> {
    return this.create({
      type: SystemEventType.ERROR_DETECTED,
      component,
      details: {
        message: error.message,
        code: 'ERROR',
        stack: error.stack
      }
    });
  }

  /**
   * Create a warning event
   */
  async createWarning(component: string, message: string): Promise<SystemEvent> {
    return this.create({
      type: SystemEventType.WARNING_RAISED,
      component,
      details: {
        message,
        code: 'WARNING'
      }
    });
  }

  /**
   * Validate system event
   */
  protected async validate(event: SystemEvent): Promise<EventValidationError[]> {
    const errors: EventValidationError[] = [];

    if (!event.component) {
      errors.push({
        field: 'component',
        message: 'Component is required',
        code: 'REQUIRED'
      });
    }

    if (!event.details?.message) {
      errors.push({
        field: 'details.message',
        message: 'Message is required',
        code: 'REQUIRED'
      });
    }

    return errors;
  }

  /**
   * Enrich system event with additional data
   */
  protected async enrich(event: SystemEvent): Promise<SystemEvent> {
    // Add system-wide context if needed
    return {
      ...event,
      details: {
        ...event.details,
        hostname: process.env.HOSTNAME,
        environment: process.env.NODE_ENV
      }
    };
  }
} 