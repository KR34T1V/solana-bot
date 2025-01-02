/**
 * @file Utility functions and helpers
 * @version 1.0.0
 * @module lib/utils/errors
 * @author Development Team
 * @lastModified 2025-01-02
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
