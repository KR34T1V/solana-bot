/**
 * @file Counter Service Tests
 * @version 1.0.0
 * @description Test suite for the CounterService
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CounterService } from "../counter.service";
import { BaseServiceTest } from "../../__tests__/base-service.test";
import { ServiceStatus } from "../../core/service.manager";

class CounterServiceTest extends BaseServiceTest {
  protected createService(): CounterService {
    return new CounterService({ initialValue: 0, maxValue: 10 });
  }

  public beforeAll(): void {
    super.beforeAll();

    describe("Counter Service Specific Tests", () => {
      let counterService: CounterService;

      beforeEach(() => {
        counterService = this.createService();
      });

      it("should initialize with correct values", async () => {
        await counterService.start();
        expect(counterService.getValue()).toBe(0);
      });

      it("should increment counter", async () => {
        await counterService.start();
        expect(counterService.increment()).toBe(1);
        expect(counterService.getValue()).toBe(1);
      });

      it("should reset counter", async () => {
        await counterService.start();
        counterService.increment();
        counterService.increment();
        counterService.reset();
        expect(counterService.getValue()).toBe(0);
      });

      it("should not exceed max value", async () => {
        await counterService.start();
        for (let i = 0; i < 10; i++) {
          counterService.increment();
        }
        expect(() => counterService.increment()).toThrow();
        expect(counterService.getStatus()).toBe(ServiceStatus.ERROR);
      });

      it("should not allow operations when not running", () => {
        expect(() => counterService.getValue()).toThrow();
        expect(() => counterService.increment()).toThrow();
        expect(() => counterService.reset()).toThrow();
      });

      it("should validate initial value against max value", async () => {
        const invalidService = new CounterService({
          initialValue: 20,
          maxValue: 10,
        });
        await expect(invalidService.start()).rejects.toThrow();
        expect(invalidService.getStatus()).toBe(ServiceStatus.ERROR);
      });
    });
  }
}

// Create an instance and run the tests
new CounterServiceTest().beforeAll();
