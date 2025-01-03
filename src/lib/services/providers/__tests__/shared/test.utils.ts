/**
 * @file Test Utilities and Mock System
 * @version 1.1.0
 * @module lib/services/providers/__tests__/shared/test.utils
 * @author Development Team
 * @lastModified 2025-01-02
 *
 * @description
 * Provides a comprehensive set of testing utilities and mock implementations
 * for provider testing. This includes standardized mock data, factory functions
 * for common dependencies, and helper utilities for test scenarios.
 *
 * Mock System:
 * - Standardized mock data for consistent testing
 * - Factory functions for complex dependencies
 * - Configurable mock behaviors
 *
 * Utility Functions:
 * - Timing and delay helpers
 * - Retry mechanisms for flaky operations
 * - Request simulation helpers
 *
 * Assertion Helpers:
 * - Timestamp validation
 * - Price format checking
 * - Confidence score validation
 */

import { vi, expect } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../../core/managed-logging";
import { ServiceStatus } from "../../../core/service.manager";
import type {
  PriceData,
  OHLCVData,
  MarketDepth,
} from "../../../../types/provider";

/**
 * Standardized mock data for provider testing.
 * These values are carefully chosen to represent real-world scenarios
 * while remaining predictable for testing purposes.
 *
 * @constant mockData
 * @property {string} validTokenMint - A known valid token mint address
 * @property {string} invalidTokenMint - An invalid token mint for error testing
 * @property {PriceData} priceData - Mock price data with realistic values
 * @property {OHLCVData} ohlcvData - Mock OHLCV data for market analysis
 * @property {MarketDepth} marketDepth - Mock order book data
 */
export const mockData = {
  validTokenMint: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  invalidTokenMint: "invalid-token-mint",
  priceData: {
    price: 1.23,
    confidence: 0.99,
    timestamp: Date.now(),
  } as PriceData,
  ohlcvData: {
    open: 1.2,
    high: 1.25,
    low: 1.18,
    close: 1.23,
    volume: 1000000,
    timestamp: Date.now(),
  } as OHLCVData,
  marketDepth: {
    bids: [[1.22, 1000]],
    asks: [[1.24, 1000]],
    timestamp: Date.now(),
  } as MarketDepth,
};

/**
 * Creates a mock logging service for testing.
 * The mock implements all required logging methods while
 * tracking calls for verification.
 *
 * @function createMockLogger
 * @returns {ManagedLoggingService} A fully mocked logging service
 * @description Creates a fully mocked logging service with all required methods
 * implemented as Jest spies. The mock maintains the expected interface while
 * allowing test verification of method calls.
 */
export function createMockLogger(): ManagedLoggingService {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue(ServiceStatus.RUNNING),
    getName: vi.fn().mockReturnValue("mock-logger"),
  } as unknown as ManagedLoggingService;
}

/**
 * Creates a mock Solana connection for testing.
 * Implements common blockchain operations with predictable
 * responses for testing purposes.
 *
 * @function createMockConnection
 * @returns {Connection} A mocked Solana connection
 * @description Creates a mock Solana connection that implements common blockchain
 * operations with predictable responses. This mock allows testing provider
 * functionality without requiring an actual blockchain connection.
 */
export function createMockConnection(): Connection {
  return {
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: "mock-blockhash",
      lastValidBlockHeight: 1000,
    }),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getBalance: vi.fn().mockResolvedValue(1000000000),
    getParsedTokenAccountsByOwner: vi.fn().mockResolvedValue({ value: [] }),
  } as unknown as Connection;
}

/**
 * Collection of utility functions for test execution.
 * Provides common operations needed across different test scenarios.
 *
 * @namespace testUtils
 */
export const testUtils = {
  /**
   * Creates a promise that resolves after a specified delay.
   * Useful for timing-sensitive tests and rate limit verification.
   *
   * @function delay
   * @param {number} ms - Delay duration in milliseconds
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Retries a function with exponential backoff.
   * Useful for handling intermittent failures in tests.
   *
   * @function retry
   * @param {Function} fn - Function to retry
   * @param {number} maxAttempts - Maximum number of retry attempts
   * @param {number} baseDelay - Initial delay between retries
   * @throws {Error} Last error encountered if all retries fail
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 100,
  ): Promise<T> => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) break;
        await testUtils.delay(baseDelay * Math.pow(2, attempt - 1));
      }
    }

    throw lastError;
  },

  /**
   * Creates a promise that never resolves.
   * Useful for testing request cancellation scenarios.
   *
   * @function createNeverResolvingRequest
   */
  createNeverResolvingRequest: () => new Promise(() => {}),

  /**
   * Creates a promise that fails after a delay.
   * Useful for testing error handling and timeouts.
   *
   * @function createFailingRequest
   * @param {number} delay - Delay before failure in milliseconds
   * @param {Error} error - Error to throw
   */
  createFailingRequest: (
    delay: number = 100,
    error: Error = new Error("Mock error"),
  ) => new Promise((_, reject) => setTimeout(() => reject(error), delay)),

  /**
   * Creates a promise that succeeds after a delay.
   * Useful for testing successful async operations.
   *
   * @function createSucceedingRequest
   * @param {T} data - Data to resolve with
   * @param {number} delay - Delay before success in milliseconds
   */
  createSucceedingRequest: <T>(data: T, delay: number = 100) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(data), delay)),
};

/**
 * Collection of assertion helpers for common test validations.
 * Provides standardized checks for common data types.
 *
 * @namespace assertions
 */
export const assertions = {
  /**
   * Validates that a timestamp is within reasonable bounds.
   *
   * @function isValidTimestamp
   * @param {number} timestamp - Timestamp to validate
   */
  isValidTimestamp: (timestamp: number) => {
    expect(timestamp).toBeGreaterThan(0);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  },

  /**
   * Validates that a price value is properly formatted.
   *
   * @function isValidPrice
   * @param {number} price - Price value to validate
   */
  isValidPrice: (price: number) => {
    expect(price).toBeGreaterThan(0);
    expect(Number.isFinite(price)).toBe(true);
  },

  /**
   * Validates that a confidence value is within [0,1].
   *
   * @function isValidConfidence
   * @param {number} confidence - Confidence value to validate
   */
  isValidConfidence: (confidence: number) => {
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  },
};
