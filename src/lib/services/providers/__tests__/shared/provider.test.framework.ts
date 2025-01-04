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
import type { LoadBalancedEndpoint, ProviderConfig } from "../../base.provider";
import { createMockLogger } from "./test.utils";
import type { EndpointMetrics, Alert, TestEndpoint } from "./test.types";

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
      let instance: T;
      let context: C;

      beforeEach(async () => {
        instance = this.createInstance();
        context = await this.setupContext();
      });

      afterEach(async () => {
        if (instance?.getStatus() !== ServiceStatus.STOPPED) {
          await instance?.stop();
        }
        if (this.config.cleanup && this.cleanupContext) {
          await this.cleanupContext();
        }
      });

      describe(suiteName, () => {
        this.runLifecycleTests(() => instance);
        this.runErrorHandlingTests(() => instance);
        this.runStateTransitionTests(() => instance);
        this.runCustomTests?.(
          () => instance,
          () => context,
        );
      });
    });
  }

  /**
   * Run service lifecycle tests
   */
  protected runLifecycleTests(getInstance: () => T): void {
    describe("Lifecycle Tests", () => {
      it("should have a valid name", () => {
        const instance = getInstance();
        expect(instance.getName()).toBeDefined();
        expect(typeof instance.getName()).toBe("string");
        expect(instance.getName().length).toBeGreaterThan(0);
      });

      it("should start in PENDING status", () => {
        const instance = getInstance();
        expect(instance.getStatus()).toBe(ServiceStatus.PENDING);
      });

      it("should transition to RUNNING after start", async () => {
        const instance = getInstance();
        await instance.start();
        expect(instance.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should transition to STOPPED after stop", async () => {
        const instance = getInstance();
        await instance.start();
        await instance.stop();
        expect(instance.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should handle multiple start/stop cycles", async () => {
        const instance = getInstance();
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
  protected runErrorHandlingTests(getInstance: () => T): void {
    describe("Error Handling Tests", () => {
      it("should not allow starting an already running service", async () => {
        const instance = getInstance();
        await instance.start();
        await expect(instance.start()).rejects.toThrow();
      });

      it("should not allow stopping an already stopped service", async () => {
        const instance = getInstance();
        await instance.start();
        await instance.stop();
        await expect(instance.stop()).rejects.toThrow();
      });

      it("should maintain consistent state during errors", async () => {
        const instance = getInstance();
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
  protected runStateTransitionTests(getInstance: () => T): void {
    describe("State Transition Tests", () => {
      it("should follow correct state transitions", async () => {
        const instance = getInstance();
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
  protected runCustomTests?(getInstance: () => T, getContext: () => C): void;
}

export interface TestEndpoint {
  url: string;
  latency: number;
  errorRate: number;
  weight: number;
}

export class TestContext {
  private endpoints: Map<string, TestEndpoint> = new Map();
  private metrics: Map<string, EndpointMetrics> = new Map();
  private failures: Map<string, boolean> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private alerts: Alert[] = [];

  public addEndpoint(endpoint: TestEndpoint): void {
    this.endpoints.set(endpoint.url, endpoint);
    this.metrics.set(endpoint.url, {
      requestCount: 0,
      latency: 0,
      errorRate: 0,
      successRate: 100
    });
  }

  public getEndpoint(url: string): TestEndpoint | undefined {
    return this.endpoints.get(url);
  }

  public getMetrics(): Record<string, EndpointMetrics> {
    return Object.fromEntries(this.metrics);
  }

  public recordRequest(url: string): void {
    const metrics = this.metrics.get(url);
    if (metrics) {
      metrics.requestCount++;
      this.metrics.set(url, metrics);
    }
  }

  public setFailure(url: string, shouldFail: boolean): void {
    this.failures.set(url, shouldFail);
  }

  public isFailure(url: string): boolean {
    return this.failures.get(url) || false;
  }

  public recordRecoveryAttempt(url: string): void {
    const attempts = this.recoveryAttempts.get(url) || 0;
    this.recoveryAttempts.set(url, attempts + 1);
  }

  public getRecoveryAttempts(url: string): number {
    return this.recoveryAttempts.get(url) || 0;
  }

  public addAlert(alert: Alert): void {
    this.alerts.push(alert);
  }

  public getAlerts(): Alert[] {
    return this.alerts;
  }
}

export abstract class ProviderTestFramework<T> {
  protected abstract provider: T;
  protected context: TestContext;

  constructor() {
    this.context = new TestContext();
  }

  public async setup(): Promise<void> {
    this.context = await this.setupContext();
    this.provider = this.createInstance();
  }

  protected abstract createInstance(config?: Partial<ProviderConfig>): T;
  protected abstract setupContext(): Promise<TestContext>;
  protected abstract cleanupContext(): Promise<void>;

  public getEndpointMetrics(): Record<string, EndpointMetrics> {
    return this.context.getMetrics();
  }

  public setEndpointFailure(url: string, shouldFail: boolean): void {
    this.context.setFailure(url, shouldFail);
  }

  public getEndpointRecoveryAttempts(url: string): number {
    return this.context.getRecoveryAttempts(url);
  }

  public getAlerts(): Alert[] {
    return this.context.getAlerts();
  }
}
