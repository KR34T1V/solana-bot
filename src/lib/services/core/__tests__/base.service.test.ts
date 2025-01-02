/**
 * @file Base Service Test
 * @version 1.0.0
 * @description Base class for service test implementations that enforces consistent testing patterns
 * across all services. This class provides a standard set of lifecycle tests that all services
 * must pass to ensure they properly implement the Service interface.
 *
 * @example
 * ```typescript
 * class CounterServiceTest extends BaseServiceTest<CounterService> {
 *   getService(): CounterService {
 *     return new CounterService();
 *   }
 *
 *   runTests(): void {
 *     super.runServiceTests(); // Run standard lifecycle tests
 *     // Add service-specific tests...
 *   }
 * }
 * ```
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ManagedLoggingService } from "../managed-logging";
import { ServiceStatus } from "../service.manager";

/**
 * Abstract base class for service tests that enforces consistent testing patterns.
 * All service test implementations should extend this class to ensure proper lifecycle testing.
 *
 * @template T - The type of service being tested, must extend ManagedLoggingService
 *
 * @remarks
 * This class provides a standard set of tests that verify:
 * - Proper service status transitions
 * - Error handling for invalid state transitions
 * - Basic lifecycle method implementations
 */
export abstract class BaseServiceTest<
  T extends ManagedLoggingService = ManagedLoggingService,
> {
  /**
   * Abstract method that must be implemented by test classes to provide
   * the service instance to test.
   *
   * @returns A new instance of the service to test
   */
  abstract getService(): T;

  /**
   * Runs the standard suite of service lifecycle tests.
   * This method should be called by all implementing test classes.
   *
   * @remarks
   * Tests performed:
   * - Initial status is PENDING
   * - Transitions to RUNNING after start
   * - Transitions to STOPPED after stop
   * - Prevents invalid state transitions
   */
  runServiceTests(): void {
    describe("Service Lifecycle", () => {
      let service: T;

      beforeEach(() => {
        service = this.getService();
      });

      it("should start correctly", async () => {
        expect(service.getStatus()).toBe(ServiceStatus.PENDING);
        await service.start();
        expect(service.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should stop correctly", async () => {
        await service.start();
        await service.stop();
        expect(service.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should prevent double start", async () => {
        await service.start();
        await expect(service.start()).rejects.toThrow("already running");
      });

      it("should prevent double stop", async () => {
        await service.start();
        await service.stop();
        await expect(service.stop()).rejects.toThrow("already stopped");
      });
    });
  }
}
