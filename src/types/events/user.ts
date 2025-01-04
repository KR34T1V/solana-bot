import type { BaseEvent, UserEventType } from './base';

export interface UserEvent extends BaseEvent {
  type: UserEventType;
  userId: string;
  sessionId: string;
}

export interface UserActionEvent extends UserEvent {
  type: 'USER_ACTION';
  action: string;
  target: string;
  data: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE';
  timestamp: string;
}

export interface PreferenceUpdateEvent extends UserEvent {
  type: 'PREFERENCE_UPDATE';
  preference: string;
  oldValue: unknown;
  newValue: unknown;
  scope: 'GLOBAL' | 'TRADING' | 'INTERFACE';
}

export interface StrategyChangeEvent extends UserEvent {
  type: 'STRATEGY_CHANGE';
  strategy: string;
  changes: {
    parameter: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  reason?: string;
}

export interface RiskUpdateEvent extends UserEvent {
  type: 'RISK_UPDATE';
  riskType: 'LIMIT' | 'THRESHOLD' | 'EXPOSURE';
  parameter: string;
  oldValue: number;
  newValue: number;
  enforced: boolean;
}

export interface SessionEvent extends UserEvent {
  type: 'SESSION_EVENT';
  eventType: 'LOGIN' | 'LOGOUT' | 'TIMEOUT' | 'INVALID_ATTEMPT';
  ip: string;
  userAgent: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
} 