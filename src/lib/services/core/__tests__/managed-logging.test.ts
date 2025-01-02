/**
 * @file Managed Logging Tests
 * @version 1.0.0
 * @description Test suite for managed logging implementation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManagedLoggingService } from "../managed-logging";
import { ServiceStatus } from "../service.manager";

describe("ManagedLoggingService", () => {
  let service: ManagedLoggingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ManagedLoggingService({
      logDir: "./logs",
      level: "debug",
      serviceName: "test-logging"
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

  describe("Logging Operations", () => {
    beforeEach(async () => {
      await service.start();
    });

    it("should log info messages", () => {
      service.info("test message", { test: true });
      // Add assertions for log file contents
    });

    it("should log error messages", () => {
      service.error("test error", { error: new Error("test") });
      // Add assertions for log file contents
    });

    it("should log warning messages", () => {
      service.warn("test warning", { warn: true });
      // Add assertions for log file contents
    });

    it("should log debug messages", () => {
      service.debug("test debug", { debug: true });
      // Add assertions for log file contents
    });

    it("should not allow logging when stopped", async () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        on: vi.fn((event, callback) => {
          if (event === "finish") {
            setTimeout(() => callback(), 0);
          }
          return mockLogger;
        }),
        end: vi.fn()
      };
      // @ts-expect-error - Accessing private property for testing
      service.logger = mockLogger;
      
      await service.stop();
      service.info("test");
      service.error("test");
      service.warn("test");
      service.debug("test");

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should validate log directory", () => {
      expect(() => new ManagedLoggingService({
        logDir: "",
        level: "debug",
        serviceName: "test-logging"
      })).toThrow("Invalid log directory");
    });

    it("should validate log level", () => {
      expect(() => new ManagedLoggingService({
        logDir: "./logs",
        level: "invalid",
        serviceName: "test-logging"
      })).toThrow("Invalid log level");
    });
  });
});
