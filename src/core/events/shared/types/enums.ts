export enum EventPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum EventStatus {
  CREATED = 'CREATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export enum EventSource {
  SYSTEM = 'SYSTEM',
  TRADING = 'TRADING',
  RISK = 'RISK',
  USER = 'USER',
  MARKET = 'MARKET',
  EXTERNAL = 'EXTERNAL'
} 