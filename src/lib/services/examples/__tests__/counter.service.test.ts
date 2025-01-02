/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/examples/__tests__/counter.service.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CounterService } from "../counter.service";
import { ServiceStatus } from "../../core/service.manager";

describe("CounterService", () => {
  let service: CounterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CounterService({
      initialValue: 0,
      maxValue: 100,
    });
  });

  describe("Service Lifecycle", () => {
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

  describe("Counter Operations", () => {
    beforeEach(async () => {
      await service.start();
    });

    it("should initialize with correct value", () => {
      expect(service.getValue()).toBe(0);
    });

    it("should increment value", () => {
      service.increment();
      expect(service.getValue()).toBe(1);
    });

    it("should not exceed max value", () => {
      for (let i = 0; i < 100; i++) {
        service.increment();
      }
      expect(() => service.increment()).toThrow(
        "Counter exceeded maximum value",
      );
      expect(service.getValue()).toBe(100);
    });

    it("should reset value", () => {
      service.increment();
      service.reset();
      expect(service.getValue()).toBe(0);
    });

    it("should not allow operations when stopped", async () => {
      await service.stop();
      expect(() => service.increment()).toThrow("not running");
      expect(() => service.reset()).toThrow("not running");
    });
  });

  describe("Configuration", () => {
    it("should validate initial value", () => {
      expect(
        () =>
          new CounterService({
            initialValue: 200,
            maxValue: 100,
          }),
      ).toThrow("Initial value must be between min and max");
    });

    it("should validate min/max values", () => {
      expect(
        () =>
          new CounterService({
            initialValue: 0,
            maxValue: 0,
          }),
      ).toThrow("Min value must be less than max value");
    });
  });
});
