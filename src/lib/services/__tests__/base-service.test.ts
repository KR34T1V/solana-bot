/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/__tests__/base-service.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, beforeEach, afterEach, it, expect } from "vitest";
import type { Service } from "../interfaces/service";
import { ServiceStatus } from "../core/service.manager";

export abstract class BaseServiceTest {
  protected abstract createService(): Service;
  protected service!: Service;

  public beforeAll(): void {
    describe("Service Interface Tests", () => {
      beforeEach(() => {
        this.service = this.createService();
      });

      afterEach(async () => {
        if (this.service?.getStatus() !== ServiceStatus.STOPPED) {
          await this.service?.stop();
        }
      });

      it("should have a valid name", () => {
        expect(this.service.getName()).toBeDefined();
        expect(typeof this.service.getName()).toBe("string");
        expect(this.service.getName().length).toBeGreaterThan(0);
      });

      it("should start in PENDING status", () => {
        expect(this.service.getStatus()).toBe(ServiceStatus.PENDING);
      });

      it("should transition to RUNNING after start", async () => {
        await this.service.start();
        expect(this.service.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should transition to STOPPED after stop", async () => {
        await this.service.start();
        await this.service.stop();
        expect(this.service.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should handle multiple start/stop cycles", async () => {
        for (let i = 0; i < 3; i++) {
          await this.service.start();
          expect(this.service.getStatus()).toBe(ServiceStatus.RUNNING);
          await this.service.stop();
          expect(this.service.getStatus()).toBe(ServiceStatus.STOPPED);
        }
      });

      it("should not allow starting an already running service", async () => {
        await this.service.start();
        await expect(this.service.start()).rejects.toThrow();
      });

      it("should not allow stopping an already stopped service", async () => {
        await this.service.start();
        await this.service.stop();
        await expect(this.service.stop()).rejects.toThrow();
      });
    });
  }
}
