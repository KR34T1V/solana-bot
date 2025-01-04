import {
  FactoryError,
  ValidationError,
  SchemaError,
  ContextError,
  StateError
} from './base';

export class FactoryValidationError extends ValidationError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, details);
  }
}

export class FactorySchemaError extends SchemaError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, details);
  }
}

export class FactoryContextError extends ContextError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, details);
  }
}

export class FactoryStateError extends StateError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, details);
  }
}

export class FactoryInitializationError extends FactoryError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, 'INITIALIZATION_ERROR', details);
  }
}

export class FactoryShutdownError extends FactoryError {
  constructor(
    factoryName: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(factoryName, message, 'SHUTDOWN_ERROR', details);
  }
} 