/**
 * @file Unified Provider Test Framework
 * @version 1.1.0
 * @module lib/services/providers/__tests__/shared/provider.test.framework
 * @author Development Team
 * @lastModified 2025-01-02
 *
 * @description
 * This framework provides a standardized approach to testing provider implementations.
 * It enforces consistent test patterns across all providers while allowing for
 * provider-specific test extensions.
 *
 * Key Features:
 * - Automated lifecycle testing
 * - Standardized error handling verification
 * - State transition validation
 * - Rate limiting and caching tests
 * - Request cancellation testing
 *
 * Test Categories:
 * 1. Lifecycle Tests
 *    - Service startup/shutdown
 *    - State transitions
 *    - Resource cleanup
 *
 * 2. Error Handling Tests
 *    - Invalid operations
 *    - Rate limit handling
 *    - Network failures
 *
 * 3. Provider-Specific Tests
 *    - Custom API behaviors
 *    - Special error cases
 *    - Provider-specific features
 *
 * Usage:
 * ```typescript
 * class CustomProviderTest extends ProviderTestFramework<CustomProvider> {
 *   protected createInstance(): CustomProvider {
 *     return new CustomProvider(config);
 *   }
 *
 *   protected async setupContext(): Promise<ProviderTestContext> {
 *     // Setup test context
 *   }
 *
 *   protected async cleanupContext(): Promise<void> {
 *     // Cleanup resources
 *   }
 * }
 * ```
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Service } from "../../../interfaces/service";
import type { BaseProvider } from "../../../../types/provider";
import type { ManagedProviderBase } from "../../base.provider";
import { ServiceError } from "../../base.provider";
import { ServiceStatus } from "../../../core/service.manager";
import type { ManagedLoggingService } from "../../../core/managed-logging";
import { delay } from "./test.utils";

/**
 * Base test context interface that defines the minimum required
 * testing environment for all services.
 *
 * @interface BaseTestContext
 * @property {ManagedLoggingService} logger - Logging service for test execution
 */
export interface BaseTestContext {
  logger: ManagedLoggingService;
}

/**
 * Extended test context specific to provider testing. Includes
 * additional properties needed for provider-specific tests.
 *
 * @interface ProviderTestContext
 * @extends BaseTestContext
 * @property {ManagedProviderBase} provider - Provider instance being tested
 * @property {string} validTokenMint - Known valid token mint for testing
 * @property {string} invalidTokenMint - Known invalid token mint for testing
 * @property {Function} mockRequest - Optional function to create test requests
 */
export interface ProviderTestContext extends BaseTestContext {
  provider: ManagedProviderBase;
  validTokenMint: string;
  invalidTokenMint: string;
  mockRequest?: () => Promise<any>;
}

/**
 * Configuration interface for customizing test execution behavior.
 *
 * @interface TestConfig
 * @property {Object} timeouts - Timeout configurations for different test types
 * @property {number} retryAttempts - Number of retries for flaky tests
 * @property {boolean} cleanup - Whether to run cleanup after each test
 */
export interface TestConfig {
  timeouts?: {
    default?: number;
    lifecycle?: number;
    operations?: number;
  };
  retryAttempts?: number;
  cleanup?: boolean;
}

/**
 * Provider-specific test configuration for customizing provider test behavior.
 *
 * @interface ProviderTestConfig
 * @property {Object} rateLimitTests - Configuration for rate limiting tests
 * @property {Object} cacheTests - Configuration for cache behavior tests
 */
export interface ProviderTestConfig {
  rateLimitTests?: {
    requestCount: number;
    windowMs: number;
  };
  cacheTests?: {
    cacheTimeoutMs: number;
  };
}

/**
 * Abstract base class for all test suites
 */
export abstract class BaseTestFramework<
  T extends Service,
  C extends BaseTestContext,
> {
  protected abstract createInstance(): T;
  protected abstract setupContext(): Promise<C>;
  protected abstract cleanupContext?(): Promise<void>;

  constructor(protected readonly config: TestConfig = {}) {}

  /**
   * Run the complete test suite
   */
  public runTests(suiteName: string): void {
    describe(suiteName, () => {
      let instance!: T;
      let context!: C;

      beforeEach(async () => {
        context = await this.setupContext();
        instance = this.createInstance();
      });

      afterEach(async () => {
        if (instance?.getStatus() !== ServiceStatus.STOPPED) {
          await instance?.stop();
        }
        if (this.config.cleanup && this.cleanupContext) {
          await this.cleanupContext();
        }
      });

      this.runLifecycleTests(instance);
      this.runErrorHandlingTests(instance);
      this.runStateTransitionTests(instance);
      this.runCustomTests?.(instance, context);
    });
  }

  /**
   * Run service lifecycle tests
   */
  protected runLifecycleTests(instance: T): void {
    describe("Lifecycle Tests", () => {
      it("should have a valid name", () => {
        expect(instance.getName()).toBeDefined();
        expect(typeof instance.getName()).toBe("string");
        expect(instance.getName().length).toBeGreaterThan(0);
      });

      it("should start in PENDING status", () => {
        expect(instance.getStatus()).toBe(ServiceStatus.PENDING);
      });

      it("should transition to RUNNING after start", async () => {
        await instance.start();
        expect(instance.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should transition to STOPPED after stop", async () => {
        await instance.start();
        await instance.stop();
        expect(instance.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should handle multiple start/stop cycles", async () => {
        for (let i = 0; i < 3; i++) {
          await instance.start();
          expect(instance.getStatus()).toBe(ServiceStatus.RUNNING);
          await instance.stop();
          expect(instance.getStatus()).toBe(ServiceStatus.STOPPED);
        }
      });
    });
  }

  /**
   * Run error handling tests
   */
  protected runErrorHandlingTests(instance: T): void {
    describe("Error Handling Tests", () => {
      it("should not allow starting an already running service", async () => {
        await instance.start();
        await expect(instance.start()).rejects.toThrow();
      });

      it("should not allow stopping an already stopped service", async () => {
        await instance.start();
        await instance.stop();
        await expect(instance.stop()).rejects.toThrow();
      });

      it("should maintain consistent state during errors", async () => {
        try {
          await instance.start();
          throw new Error("Test error");
        } catch (error: any) {
          expect(instance.getStatus()).toBe(ServiceStatus.RUNNING);
        }
        await instance.stop();
        expect(instance.getStatus()).toBe(ServiceStatus.STOPPED);
      });
    });
  }

  /**
   * Run state transition tests
   */
  protected runStateTransitionTests(instance: T): void {
    describe("State Transition Tests", () => {
      it("should follow correct state transitions", async () => {
        expect(instance.getStatus()).toBe(ServiceStatus.PENDING);

        await instance.start();
        expect(instance.getStatus()).toBe(ServiceStatus.RUNNING);

        await instance.stop();
        expect(instance.getStatus()).toBe(ServiceStatus.STOPPED);
      });
    });
  }

  /**
   * Optional method for running custom tests specific to the service type
   */
  protected runCustomTests?(instance: T, context: C): void;
}

/**
 * Provider-specific test framework
 */
export abstract class ProviderTestFramework<
  T extends BaseProvider & Service,
> extends BaseTestFramework<T, ProviderTestContext> {
  constructor(protected readonly providerConfig: ProviderTestConfig = {}) {
    super({
      timeouts: {
        default: 5000,
        lifecycle: 10000,
        operations: 15000,
      },
      cleanup: true,
    });
  }

  protected override runCustomTests(
    instance: T,
    context: ProviderTestContext,
  ): void {
    this.runTokenValidationTests(instance);
    this.runRateLimitTests(instance);
    this.runCacheTests(instance);
    this.runRequestCancellationTests(instance, context);
  }

  /**
   * Run token validation tests
   */
  private runTokenValidationTests(instance: T): void {
    describe("Token Validation Tests", () => {
      beforeEach(async () => {
        await instance.start();
      });

      it("should reject invalid token mint format", async () => {
        await expect(instance.getPrice("invalid-token-mint")).rejects.toThrow(
          ServiceError,
        );
      });

      it("should accept valid token mint format", async () => {
        await expect(
          instance.getPrice("valid-token-mint"),
        ).resolves.toBeDefined();
      });
    });
  }

  /**
   * Run rate limit tests
   */
  private async runRateLimitTests(instance: T): Promise<void> {
    const { requestCount, windowMs } = this.providerConfig.rateLimitTests || {
      requestCount: 5,
      windowMs: 1000,
    };

    describe("Rate Limit Tests", () => {
      it(`should handle rate limits (${requestCount} requests / ${windowMs}ms)`, async () => {
        await instance.start();

        // Make requests up to the limit
        for (let i = 0; i < requestCount; i++) {
          await instance.getPrice("valid-token-mint");
        }

        // Wait for the rate limit window to reset
        await delay(windowMs);

        // Should be able to make requests again
        await instance.getPrice("valid-token-mint");
      });
    });
  }

  /**
   * Run cache tests
   */
  private async runCacheTests(instance: T): Promise<void> {
    const { cacheTimeoutMs } = this.providerConfig.cacheTests || {
      cacheTimeoutMs: 1000,
    };

    describe("Cache Tests", () => {
      it(`should cache responses for ${cacheTimeoutMs}ms`, async () => {
        await instance.start();

        // Make initial request
        const firstResponse = await instance.getPrice("valid-token-mint");

        // Make second request immediately (should hit cache)
        const secondResponse = await instance.getPrice("valid-token-mint");
        expect(secondResponse).toEqual(firstResponse);

        // Wait for cache to expire
        await delay(cacheTimeoutMs);

        // Make third request (should miss cache)
        const thirdResponse = await instance.getPrice("valid-token-mint");
        expect(thirdResponse).not.toEqual(firstResponse);
      });
    });
  }

  /**
   * Run request cancellation tests
   */
  private runRequestCancellationTests(
    instance: T,
    context: ProviderTestContext,
  ): void {
    describe("Request Cancellation Tests", () => {
      it("should cancel pending requests on stop", async () => {
        if (!context.mockRequest) {
          throw new Error(
            "mockRequest must be provided to test request cancellation",
          );
        }

        await instance.start();
        const requestPromise = context.mockRequest();
        await instance.stop();

        await expect(requestPromise).rejects.toThrow(/cancel|abort/i);
      });
    });
  }
}
