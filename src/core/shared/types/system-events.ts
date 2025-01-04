import type { BaseEvent } from './events';

export enum SystemEventType {
  // Health Events
  HEALTH_CHECK = 'HEALTH_CHECK',
  ERROR_DETECTED = 'ERROR_DETECTED',
  WARNING_RAISED = 'WARNING_RAISED',
  
  // Performance Events
  HIGH_LATENCY = 'HIGH_LATENCY',
  MEMORY_PRESSURE = 'MEMORY_PRESSURE',
  CPU_PRESSURE = 'CPU_PRESSURE',
  
  // Connection Events
  CONNECTION_LOST = 'CONNECTION_LOST',
  CONNECTION_RESTORED = 'CONNECTION_RESTORED',
  
  // Configuration Events
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  MAINTENANCE_START = 'MAINTENANCE_START',
  MAINTENANCE_END = 'MAINTENANCE_END'
}

export interface SystemHealthMetrics {
  memory: {
    total: number;
    used: number;
    free: number;
  };
  cpu: {
    usage: number;
    load: number[];
  };
  latency: number;
  uptime: number;
}

export interface SystemEvent extends BaseEvent {
  type: SystemEventType;
  component: string;
  details: SystemEventDetails;
}

export type SystemEventDetails = 
  | HealthCheckDetails
  | ErrorDetails
  | WarningDetails
  | PerformanceDetails
  | ConnectionDetails
  | ConfigurationDetails;

export interface HealthCheckDetails {
  status: 'healthy' | 'degraded' | 'failed';
  metrics: SystemHealthMetrics;
}

export interface ErrorDetails {
  error: string;
  stack?: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WarningDetails {
  message: string;
  code?: string;
  threshold?: number;
  currentValue?: number;
}

export interface PerformanceDetails {
  metric: string;
  value: number;
  threshold: number;
  duration: number;
}

export interface ConnectionDetails {
  endpoint: string;
  duration?: number;
  reason?: string;
  attempts?: number;
}

export interface ConfigurationDetails {
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
} 