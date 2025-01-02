/**
 * @file Base Service Test
 * @version 1.0.0
 * @description Base class for service test implementations
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { ManagedLoggingService } from "../managed-logging";
import { ServiceStatus } from "../service.manager";

export abstract class BaseServiceTest<
  T extends ManagedLoggingService = ManagedLoggingService,
> {
  abstract getService(): T;

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
