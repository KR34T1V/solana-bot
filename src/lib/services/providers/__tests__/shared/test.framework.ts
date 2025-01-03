/**
 * @file Unified Test Framework
 * @version 1.2.0
 * @module lib/services/providers/__tests__/shared/test.framework
 * @author Development Team
 * @lastModified 2025-01-02
 * @description A comprehensive testing framework for service providers
 */

import { describe, it, beforeEach, afterEach } from "vitest";
import type { Service } from "../../../interfaces/service";
import { ServiceStatus } from "../../../core/service.manager";
import type { ManagedLoggingService } from "../../../core/managed-logging";

/**
 * Test Categories as TypeScript enums for better organization
 * @enum {string}
 * @description Categories for organizing tests by their purpose
 */
export enum TestCategory {
  LIFECYCLE = "lifecycle",
  ERROR_HANDLING = "error-handling",
  PERFORMANCE = "performance",
  INTEGRATION = "integration",
  UNIT = "unit",
}

/**
 * Test priority levels
 * @enum {number}
 * @description Priority levels for tests to determine execution order and importance
 */
export enum TestPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

/**
 * Base interface for all test contexts
 * @interface TestContext
 * @description Defines the required context for running tests
 */
export interface TestContext {
  logger: ManagedLoggingService;
  cleanup: () => Promise<void>;
}

/**
 * Test metadata interface
 * @interface TestMetadata
 * @description Configuration for individual tests
 */
export interface TestMetadata {
  category: TestCategory;
  priority: TestPriority;
  timeout?: number;
  retries?: number;
  description: string;
}

/**
 * Test case interface
 * @interface TestCase
 * @description Represents a single test case with its metadata and implementation
 */
export interface TestCase {
  name: string;
  metadata: TestMetadata;
  implementation: () => Promise<void>;
}

/**
 * Base test suite class
 * @class BaseTestSuite
 * @description Abstract base class for all test suites
 */
export abstract class BaseTestSuite<T extends Service> {
  private tests: Map<string, TestCase> = new Map();

  protected abstract createInstance(): T;
  protected abstract setupContext(): Promise<TestContext>;
  protected abstract cleanupContext(): Promise<void>;

  /**
   * Register a test case
   * @param {string} name - Name of the test
   * @param {TestMetadata} metadata - Test metadata
   * @param {Function} implementation - Test implementation
   */
  protected registerTest(
    name: string,
    metadata: TestMetadata,
    implementation: () => Promise<void>,
  ): void {
    this.tests.set(name, { name, metadata, implementation });
  }

  /**
   * Run all registered tests
   * @param {string} suiteName - Name of the test suite
   */
  public runTests(suiteName: string): void {
    describe(suiteName, () => {
      let instance: T;

      beforeEach(async () => {
        instance = this.createInstance();
        await this.setupContext();
      });

      afterEach(async () => {
        if (instance?.getStatus() !== ServiceStatus.STOPPED) {
          await instance?.stop();
        }
        await this.cleanupContext();
      });

      // Run all registered tests
      for (const [name, testCase] of this.tests) {
        it(name, async () => {
          console.log(`Running test: ${testCase.metadata.description}`);
          console.log(
            `Category: ${testCase.metadata.category}, Priority: ${testCase.metadata.priority}`,
          );

          try {
            await testCase.implementation();
          } catch (error) {
            console.error(`Test failed: ${name}`, error);
            throw error;
          }
        });
      }
    });
  }
}

/**
 * Mock response types interface
 * @interface MockResponseTypes
 * @description Type definitions for mock responses
 */
export interface MockResponseTypes {
  price: {
    data: {
      price: string;
      timestamp: number;
    };
  };
  orderbook: {
    bids: [number, number][];
    asks: [number, number][];
  };
}

/**
 * Factory class for creating mock data with type safety
 * @class MockDataFactory
 * @description Provides methods for creating type-safe mock data
 */
export class MockDataFactory {
  /**
   * Creates a mock response of a specific type
   * @method createMockResponse
   * @description Creates a mock response with default values
   * @static
   * @template T - Type of mock response to create
   * @param {T} type - Type of mock response
   * @returns {MockResponseTypes[T]} Mock response data
   */
  static createMockResponse<T extends keyof MockResponseTypes>(
    type: T,
  ): MockResponseTypes[T] {
    const responses: MockResponseTypes = {
      price: {
        data: {
          price: "1.23",
          timestamp: Date.now(),
        },
      },
      orderbook: {
        bids: [
          [1.0, 100],
          [0.9, 200],
        ],
        asks: [
          [1.1, 150],
          [1.2, 300],
        ],
      },
    };
    return responses[type];
  }

  /**
   * Creates a mock error with a specific code
   * @method createMockError
   * @description Creates an error with a specific code for testing
   * @static
   * @param {string} code - Error code
   * @returns {Error} Mock error
   */
  static createMockError(code: string): Error {
    return new Error(`Mock error: ${code}`);
  }
}

/**
 * Utility class for common test operations
 * @class TestUtils
 * @description Provides utility methods for common testing operations
 */
export class TestUtils {
  /**
   * Delays execution for a specified time
   * @method delay
   * @description Creates a promise that resolves after specified milliseconds
   * @static
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Creates a random token mint address
   * @method createRandomTokenMint
   * @description Generates a random token mint address for testing
   * @static
   * @returns {string} Random token mint address
   */
  static createRandomTokenMint(): string {
    return `TOKEN${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Simulates network latency with random delay
   * @method simulateNetworkLatency
   * @description Adds random delay to simulate network conditions
   * @static
   * @returns {Promise<void>}
   */
  static async simulateNetworkLatency(): Promise<void> {
    await TestUtils.delay(Math.random() * 100);
  }
}
