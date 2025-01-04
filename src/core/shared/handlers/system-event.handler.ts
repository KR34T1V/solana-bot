import type { SystemEvent } from '../types/system-events';
import { SystemEventType } from '../types/system-events';

export abstract class BaseSystemEventHandler {
  abstract handle(event: SystemEvent): Promise<void>;
  
  protected abstract logEvent(event: SystemEvent): void;
  
  protected abstract handleHealthCheck(event: SystemEvent): Promise<void>;
  protected abstract handleError(event: SystemEvent): Promise<void>;
  protected abstract handleWarning(event: SystemEvent): Promise<void>;
  protected abstract handlePerformance(event: SystemEvent): Promise<void>;
  protected abstract handleConnection(event: SystemEvent): Promise<void>;
  protected abstract handleConfiguration(event: SystemEvent): Promise<void>;
}

export class SystemEventHandler extends BaseSystemEventHandler {
  async handle(event: SystemEvent): Promise<void> {
    this.logEvent(event);

    switch (event.type) {
      case SystemEventType.HEALTH_CHECK:
        await this.handleHealthCheck(event);
        break;
      case SystemEventType.ERROR_DETECTED:
        await this.handleError(event);
        break;
      case SystemEventType.WARNING_RAISED:
        await this.handleWarning(event);
        break;
      case SystemEventType.HIGH_LATENCY:
      case SystemEventType.MEMORY_PRESSURE:
      case SystemEventType.CPU_PRESSURE:
        await this.handlePerformance(event);
        break;
      case SystemEventType.CONNECTION_LOST:
      case SystemEventType.CONNECTION_RESTORED:
        await this.handleConnection(event);
        break;
      case SystemEventType.CONFIG_CHANGED:
      case SystemEventType.MAINTENANCE_START:
      case SystemEventType.MAINTENANCE_END:
        await this.handleConfiguration(event);
        break;
      default:
        throw new Error(`Unhandled system event type: ${event.type}`);
    }
  }

  protected logEvent(event: SystemEvent): void {
    console.log(`[${event.type}] Component: ${event.component}`, {
      id: event.id,
      timestamp: event.timestamp,
      details: event.details,
      metadata: event.metadata
    });
  }

  protected async handleHealthCheck(event: SystemEvent): Promise<void> {
    const { status, metrics } = event.details as any;
    console.log(`Health Check - Status: ${status}`, metrics);
    
    if (status === 'failed') {
      // Trigger alerts or recovery procedures
      await this.triggerHealthAlert(event);
    }
  }

  protected async handleError(event: SystemEvent): Promise<void> {
    const { error, severity, stack } = event.details as any;
    console.error(`Error [${severity}]: ${error}`, { stack });
    
    if (severity === 'critical') {
      // Trigger immediate alerts
      await this.triggerErrorAlert(event);
    }
  }

  protected async handleWarning(event: SystemEvent): Promise<void> {
    const { message, threshold, currentValue } = event.details as any;
    console.warn(`Warning: ${message}`, { threshold, currentValue });
  }

  protected async handlePerformance(event: SystemEvent): Promise<void> {
    const { metric, value, threshold } = event.details as any;
    console.log(`Performance - ${metric}: ${value} (threshold: ${threshold})`);
    
    if (value > threshold) {
      // Take action based on performance issue
      await this.handlePerformanceIssue(event);
    }
  }

  protected async handleConnection(event: SystemEvent): Promise<void> {
    const { endpoint, reason } = event.details as any;
    console.log(`Connection Event - ${event.type} - Endpoint: ${endpoint}`, { reason });
    
    if (event.type === SystemEventType.CONNECTION_LOST) {
      // Attempt reconnection or failover
      await this.handleConnectionLoss(event);
    }
  }

  protected async handleConfiguration(event: SystemEvent): Promise<void> {
    const { key, oldValue, newValue, reason } = event.details as any;
    console.log(`Configuration Change - ${key}:`, { oldValue, newValue, reason });
  }

  // Helper methods for specific actions
  private async triggerHealthAlert(event: SystemEvent): Promise<void> {
    // Implement health alert logic
    console.error('HEALTH ALERT:', event);
  }

  private async triggerErrorAlert(event: SystemEvent): Promise<void> {
    // Implement error alert logic
    console.error('ERROR ALERT:', event);
  }

  private async handlePerformanceIssue(event: SystemEvent): Promise<void> {
    // Implement performance issue handling
    console.warn('PERFORMANCE ISSUE:', event);
  }

  private async handleConnectionLoss(event: SystemEvent): Promise<void> {
    // Implement connection loss handling
    console.warn('CONNECTION LOSS:', event);
  }
} 