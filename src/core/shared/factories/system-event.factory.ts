import { BaseEventFactory } from '../base/event-factory';
import { EventSource } from '../types/events';
import { SystemEventType } from '../types/system-events';
import type { SystemEvent, SystemEventDetails } from '../types/system-events';

export interface CreateSystemEventData {
  type: SystemEventType;
  component: string;
  details: SystemEventDetails;
}

export class SystemEventFactory extends BaseEventFactory<SystemEvent> {
  constructor(version: string = '1.0.0') {
    super(EventSource.SYSTEM, version);
  }

  async create(data: CreateSystemEventData): Promise<SystemEvent> {
    const event = this.enrich({
      type: data.type,
      component: data.component,
      details: data.details
    });

    if (!this.validate(event)) {
      throw new Error(`Invalid system event: ${JSON.stringify(event)}`);
    }

    return event;
  }

  protected validateEvent(event: SystemEvent): boolean {
    // Validate required fields
    if (!event.component || !event.details) {
      return false;
    }

    // Validate event type
    if (!Object.values(SystemEventType).includes(event.type as SystemEventType)) {
      return false;
    }

    // Validate details based on event type
    switch (event.type) {
      case SystemEventType.HEALTH_CHECK:
        return this.validateHealthCheck(event);
      case SystemEventType.ERROR_DETECTED:
        return this.validateError(event);
      case SystemEventType.WARNING_RAISED:
        return this.validateWarning(event);
      case SystemEventType.HIGH_LATENCY:
      case SystemEventType.MEMORY_PRESSURE:
      case SystemEventType.CPU_PRESSURE:
        return this.validatePerformance(event);
      case SystemEventType.CONNECTION_LOST:
      case SystemEventType.CONNECTION_RESTORED:
        return this.validateConnection(event);
      case SystemEventType.CONFIG_CHANGED:
      case SystemEventType.MAINTENANCE_START:
      case SystemEventType.MAINTENANCE_END:
        return this.validateConfiguration(event);
      default:
        return false;
    }
  }

  private validateHealthCheck(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      details.status &&
      ['healthy', 'degraded', 'failed'].includes(details.status) &&
      details.metrics &&
      typeof details.metrics.memory === 'object' &&
      typeof details.metrics.cpu === 'object' &&
      typeof details.metrics.latency === 'number' &&
      typeof details.metrics.uptime === 'number'
    );
  }

  private validateError(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      typeof details.error === 'string' &&
      details.error.length > 0 &&
      (!details.severity || ['low', 'medium', 'high', 'critical'].includes(details.severity))
    );
  }

  private validateWarning(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      typeof details.message === 'string' &&
      details.message.length > 0
    );
  }

  private validatePerformance(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      typeof details.metric === 'string' &&
      typeof details.value === 'number' &&
      typeof details.threshold === 'number' &&
      typeof details.duration === 'number'
    );
  }

  private validateConnection(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      typeof details.endpoint === 'string' &&
      details.endpoint.length > 0
    );
  }

  private validateConfiguration(event: SystemEvent): boolean {
    const details = event.details as any;
    return (
      typeof details.key === 'string' &&
      details.key.length > 0
    );
  }
} 