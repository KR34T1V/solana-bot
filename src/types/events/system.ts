import type { BaseEvent, SystemEventType, SystemState } from './base';

export interface SystemEvent extends BaseEvent {
  type: SystemEventType;
  component: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export interface HealthCheckEvent extends SystemEvent {
  type: 'HEALTH_CHECK';
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  checks: {
    [key: string]: {
      status: 'PASS' | 'FAIL';
      latency: number;
      message?: string;
    };
  };
}

export interface ConfigChangeEvent extends SystemEvent {
  type: 'CONFIG_CHANGE';
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  user?: string;
}

export interface ErrorOccurredEvent extends SystemEvent {
  type: 'ERROR_OCCURRED';
  error: {
    message: string;
    code: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
  handled: boolean;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MetricReportedEvent extends SystemEvent {
  type: 'METRIC_REPORTED';
  metricName: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
}

export interface StateChangedEvent extends SystemEvent {
  type: 'STATE_CHANGED';
  oldState: SystemState;
  newState: SystemState;
  reason: string;
  initiator: string;
} 