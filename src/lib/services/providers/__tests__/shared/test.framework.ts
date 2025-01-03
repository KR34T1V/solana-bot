/**
 * @file Unified Test Framework
 * @version 1.2.0
 * @module lib/services/providers/__tests__/shared/test.framework
 * @author Development Team
 * @lastModified 2025-01-02
 * @description A comprehensive testing framework for service providers with metadata support
 */

import "reflect-metadata";
import { expect } from "vitest";
import type { Service } from "../../../interfaces/service";
import type { BaseProvider } from "../../../../types/provider";
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
 * @description Configuration options for test methods
 */
export interface TestMetadata {
  category: TestCategory;
  priority: TestPriority;
  timeout?: number;
  retries?: number;
  description: string;
}

/**
 * Response type mapping
 * @interface MockResponseTypes
 * @description Type definitions for mock responses
 */
export type MockResponseTypes = {
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
};

/**
 * Test method types
 * @type TestMethod
 * @description Type definition for test methods
 */
export type TestMethod = (...args: any[]) => Promise<void>;

/**
 * Decorated test method type
 * @type DecoratedTestMethod
 * @description Type definition for test methods with metadata
 */
export type DecoratedTestMethod = TestMethod & {
  __testMetadata?: TestMetadata;
};

/**
 * Reflect metadata key - exported for testing
 * @const TEST_METADATA_KEY
 * @description Symbol used for storing test metadata
 */
export const TEST_METADATA_KEY = Symbol("testMetadata");

/**
 * Test decorator factory for adding metadata to test methods
 * @function Test
 * @description Decorates test methods with metadata and provides test execution wrapper
 * @param {TestMetadata} metadata - Configuration for the test including category, priority, and description
 * @returns {MethodDecorator} A decorator that adds metadata and wraps the test method
 * @throws {Error} If decorator is applied to non-method or method is not a function
 */
export function Test(metadata: TestMetadata): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ): TypedPropertyDescriptor<any> => {
    if (!descriptor.value || typeof descriptor.value !== "function") {
      throw new Error("Test decorator can only be applied to methods");
    }

    const originalMethod = descriptor.value;

    // Store metadata on the prototype
    Reflect.defineMetadata(
      TEST_METADATA_KEY,
      metadata,
      target,
      propertyKey.toString(),
    );

    // Create wrapped method
    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<void> {
      const testName = propertyKey.toString();
      console.log(`Running test: ${metadata.description}`);
      console.log(
        `Category: ${metadata.category}, Priority: ${metadata.priority}`,
      );

      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Test failed: ${testName}`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Base test suite that all provider tests will extend
 * @abstract
 * @class BaseTestSuite
 * @template T - Type extending BaseProvider & Service
 * @description Provides base functionality for testing service providers
 */
export abstract class BaseTestSuite<T extends BaseProvider & Service> {
  protected abstract createTestContext(): Promise<TestContext>;
  protected abstract createProvider(): T;

  private context: TestContext | null = null;
  protected provider: T | null = null;

  /**
   * Runs a specific test method by name
   * @method runTest
   * @description Executes a test method with the given name
   * @param {string} methodName - Name of the test method to run
   * @returns {Promise<void>}
   * @throws {Error} If method not found or no metadata found
   */
  public async runTest(methodName: string): Promise<void> {
    const method = this[methodName as keyof this];
    if (typeof method !== "function") {
      throw new Error(`Test method ${methodName} not found`);
    }

    const metadata = Reflect.getMetadata(
      TEST_METADATA_KEY,
      this,
      methodName,
    ) as TestMetadata | undefined;

    if (!metadata) {
      throw new Error(`No test metadata found for method ${methodName}`);
    }

    await method.call(this);
  }

  /**
   * Sets up the test suite before each test
   * @method setup
   * @description Initializes test context and provider
   * @returns {Promise<void>}
   */
  public async setup(): Promise<void> {
    await this.beforeEach();
  }

  /**
   * Tears down the test suite after each test
   * @method teardown
   * @description Cleans up test context and provider
   * @returns {Promise<void>}
   */
  public async teardown(): Promise<void> {
    await this.afterEach();
  }

  @Test({
    category: TestCategory.LIFECYCLE,
    priority: TestPriority.CRITICAL,
    description: "Provider initialization",
  })
  protected async testInitialization(): Promise<void> {
    const provider = this.createProvider();
    expect(provider).toBeDefined();
  }

  @Test({
    category: TestCategory.LIFECYCLE,
    priority: TestPriority.CRITICAL,
    description: "Provider startup",
  })
  protected async testStartup(): Promise<void> {
    const provider = this.createProvider();
    await provider.start();
    expect(provider.getStatus()).toBe(ServiceStatus.RUNNING);
  }

  @Test({
    category: TestCategory.LIFECYCLE,
    priority: TestPriority.CRITICAL,
    description: "Provider shutdown",
  })
  protected async testShutdown(): Promise<void> {
    const provider = this.createProvider();
    await provider.start();
    await provider.stop();
    expect(provider.getStatus()).toBe(ServiceStatus.STOPPED);
  }

  /**
   * Setup method called before each test
   * @method beforeEach
   * @description Sets up test context and provider
   * @protected
   * @returns {Promise<void>}
   */
  protected async beforeEach(): Promise<void> {
    this.context = await this.createTestContext();
    this.provider = this.createProvider();
    await this.provider.start();
  }

  /**
   * Cleanup method called after each test
   * @method afterEach
   * @description Cleans up test context and provider
   * @protected
   * @returns {Promise<void>}
   */
  protected async afterEach(): Promise<void> {
    if (this.provider) {
      await this.provider.stop();
    }
    if (this.context) {
      await this.context.cleanup();
    }
  }
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
