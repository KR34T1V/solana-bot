import { ErrorEventEmitter } from './errorEventEmitter';

/**
 * Base Error Classes
 * Provides foundational error types for the entire application
 */

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.emitErrorEvent();
  }

  private async emitErrorEvent(): Promise<void> {
    const emitter = ErrorEventEmitter.getInstance();
    await emitter.emitError(this, this.name);
  }
}

// Factory Errors
export class FactoryError extends ApplicationError {
  constructor(
    factoryName: string,
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(`[${factoryName}] ${message}`, code, details);
    this.name = 'FactoryError';
  }
}

// Validation Errors
export class ValidationError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Schema Errors
export class SchemaError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'SCHEMA_ERROR', details);
    this.name = 'SchemaError';
  }
}

// Context Errors
export class ContextError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'CONTEXT_ERROR', details);
    this.name = 'ContextError';
  }
}

// State Errors
export class StateError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'STATE_ERROR', details);
    this.name = 'StateError';
  }
}

// Configuration Errors
export class ConfigurationError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

// Service Errors
export class ServiceError extends ApplicationError {
  constructor(
    serviceName: string,
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(`[${serviceName}] ${message}`, code, details);
    this.name = 'ServiceError';
  }
}

// Runtime Errors
export class RuntimeError extends ApplicationError {
  constructor(
    component: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`[${component}] ${message}`, 'RUNTIME_ERROR', details);
    this.name = 'RuntimeError';
  }
} 