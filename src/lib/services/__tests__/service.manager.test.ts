/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/__tests__/service.manager.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ServiceManager,
  ServiceStatus,
  type Service,
} from "../core/service.manager";
import type { ManagedLoggingService } from "../core/managed-logging";

// Mock service implementation
class MockService implements Service {
  private status: ServiceStatus = ServiceStatus.PENDING;
  private name: string;
  private startFn: () => Promise<void>;
  private stopFn: () => Promise<void>;

  constructor(
    name: string,
    startFn: () => Promise<void> = async () => {},
    stopFn: () => Promise<void> = async () => {},
  ) {
    this.name = name;
    this.startFn = startFn;
    this.stopFn = stopFn;
  }

  async start(): Promise<void> {
    await this.startFn();
    this.status = ServiceStatus.RUNNING;
  }

  async stop(): Promise<void> {
    await this.stopFn();
    this.status = ServiceStatus.STOPPED;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  getName(): string {
    return this.name;
  }
}

describe("ServiceManager", () => {
  let serviceManager: ServiceManager;
  let mockLogger: Partial<ManagedLoggingService> &
    Required<Pick<ManagedLoggingService, keyof Service>>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ServiceStatus.RUNNING),
      getName: vi.fn().mockReturnValue("logging-service"),
      logAuthAttempt: vi.fn(),
      logAuthSuccess: vi.fn(),
      logAuthFailure: vi.fn(),
      logAccountLock: vi.fn(),
      logError: vi.fn(),
      logTradeExecution: vi.fn(),
      logStrategySignal: vi.fn(),
      testLogging: vi.fn(),
    };

    // Create service manager instance
    serviceManager = new ServiceManager(mockLogger as ManagedLoggingService);
  });

  describe("Service Registration", () => {
    it("should register a service successfully", () => {
      const service = new MockService("test-service");
      const config = {
        name: "test-service",
        version: "1.0.0",
      };

      serviceManager.register(service, config);

      const metadata = serviceManager.getServiceMetadata("test-service");
      expect(metadata).toEqual({
        name: "test-service",
        version: "1.0.0",
        dependencies: [],
        isActive: false,
        status: ServiceStatus.PENDING,
      });
    });

    it("should prevent duplicate service registration", () => {
      const service = new MockService("test-service");
      const config = {
        name: "test-service",
        version: "1.0.0",
      };

      serviceManager.register(service, config);

      expect(() => serviceManager.register(service, config)).toThrow(
        "Service test-service is already registered",
      );
    });
  });

  describe("Service Deregistration", () => {
    it("should deregister a stopped service", () => {
      const service = new MockService("test-service");
      const config = {
        name: "test-service",
        version: "1.0.0",
      };

      serviceManager.register(service, config);
      serviceManager.deregister("test-service");

      expect(() => serviceManager.getServiceMetadata("test-service")).toThrow(
        "Service test-service not found",
      );
    });

    it("should prevent deregistering a running service", async () => {
      const service = new MockService("test-service");
      const config = {
        name: "test-service",
        version: "1.0.0",
      };

      serviceManager.register(service, config);
      await service.start();

      expect(() => serviceManager.deregister("test-service")).toThrow(
        "Service test-service must be stopped before deregistering",
      );
    });

    it("should throw error when deregistering non-existent service", () => {
      expect(() => serviceManager.deregister("non-existent")).toThrow(
        "Service non-existent is not registered",
      );
    });
  });

  describe("Service Lifecycle", () => {
    it("should initialize successfully", async () => {
      await serviceManager.initialize();
      expect(mockLogger.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Initializing service manager",
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Service manager initialized",
      );
    });

    it("should start services in dependency order", async () => {
      const startOrder: string[] = [];
      const serviceA = new MockService("service-a", async () => {
        startOrder.push("service-a");
      });
      const serviceB = new MockService("service-b", async () => {
        startOrder.push("service-b");
      });

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      await serviceManager.startAll();

      expect(startOrder).toEqual(["service-a", "service-b"]);
      expect(mockLogger.info).toHaveBeenCalledWith("Starting all services");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "All services started successfully",
      );
    });

    it("should detect circular dependencies", async () => {
      const serviceA = new MockService("service-a");
      const serviceB = new MockService("service-b");

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
        dependencies: ["service-b"],
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      await expect(serviceManager.startAll()).rejects.toThrow(
        "Circular dependency detected",
      );
    });

    it("should handle start failures", async () => {
      const service = new MockService("test-service", async () => {
        throw new Error("Start failed");
      });

      serviceManager.register(service, {
        name: "test-service",
        version: "1.0.0",
      });

      await expect(serviceManager.startAll()).rejects.toThrow("Start failed");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should stop services in reverse dependency order", async () => {
      const stopOrder: string[] = [];
      const serviceA = new MockService(
        "service-a",
        async () => {},
        async () => {
          stopOrder.push("service-a");
        },
      );
      const serviceB = new MockService(
        "service-b",
        async () => {},
        async () => {
          stopOrder.push("service-b");
        },
      );

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      await serviceManager.startAll();
      await serviceManager.stopAll();

      expect(stopOrder).toEqual(["service-b", "service-a"]);
      expect(mockLogger.info).toHaveBeenCalledWith("Stopping all services");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "All services stopped successfully",
      );
    });

    it("should handle stop failures", async () => {
      const stopOrder: string[] = [];
      const serviceA = new MockService(
        "service-a",
        async () => {},
        async () => {
          stopOrder.push("service-a");
          throw new Error("Stop failed for A");
        },
      );
      const serviceB = new MockService(
        "service-b",
        async () => {},
        async () => {
          stopOrder.push("service-b");
        },
      );

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      await serviceManager.startAll();
      await expect(serviceManager.stopAll()).rejects.toThrow(
        "Stop failed for A",
      );

      expect(stopOrder).toEqual(["service-b", "service-a"]);
      expect(serviceManager.getServiceMetadata("service-a").status).toBe(
        ServiceStatus.ERROR,
      );
      expect(serviceManager.getServiceMetadata("service-b").status).toBe(
        ServiceStatus.STOPPED,
      );
    });

    it("should handle multiple stop failures", async () => {
      const stopOrder: string[] = [];
      const serviceA = new MockService(
        "service-a",
        async () => {},
        async () => {
          stopOrder.push("service-a");
          throw new Error("Stop failed for A");
        },
      );
      const serviceB = new MockService(
        "service-b",
        async () => {},
        async () => {
          stopOrder.push("service-b");
          throw new Error("Stop failed for B");
        },
      );

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
      });

      await serviceManager.startAll();
      await expect(serviceManager.stopAll()).rejects.toThrow(/Stop failed/);

      expect(stopOrder).toContain("service-a");
      expect(stopOrder).toContain("service-b");
      expect(serviceManager.getServiceMetadata("service-a").status).toBe(
        ServiceStatus.ERROR,
      );
      expect(serviceManager.getServiceMetadata("service-b").status).toBe(
        ServiceStatus.ERROR,
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it("should handle cascading failures in dependency chain", async () => {
      const serviceA = new MockService("service-a", async () => {
        throw new Error("Service A failed");
      });
      const serviceB = new MockService("service-b");
      const serviceC = new MockService("service-c");

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });
      serviceManager.register(serviceC, {
        name: "service-c",
        version: "1.0.0",
        dependencies: ["service-b"],
      });

      await expect(serviceManager.startAll()).rejects.toThrow(
        "Service A failed",
      );

      // Verify all services are in error state
      expect(serviceManager.getServiceMetadata("service-a").status).toBe(
        ServiceStatus.ERROR,
      );
      expect(serviceManager.getServiceMetadata("service-b").isActive).toBe(
        false,
      );
      expect(serviceManager.getServiceMetadata("service-c").isActive).toBe(
        false,
      );
    });

    it("should handle state transition failures", async () => {
      let serviceStarted = false;
      const service = new MockService(
        "test-service",
        async () => {
          serviceStarted = true;
          throw new Error("Failed during startup");
        },
        async () => {
          if (serviceStarted) {
            throw new Error("Failed during shutdown");
          }
        },
      );

      serviceManager.register(service, {
        name: "test-service",
        version: "1.0.0",
      });

      // Test start failure
      await expect(serviceManager.startAll()).rejects.toThrow(
        "Failed during startup",
      );
      expect(serviceManager.getServiceMetadata("test-service").status).toBe(
        ServiceStatus.ERROR,
      );

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start service test-service:"),
        expect.any(Object),
      );
    });

    it("should cleanup resources after failed operations", async () => {
      const cleanupTracker = { cleaned: false };
      const service = new MockService(
        "test-service",
        async () => {
          throw new Error("Start failed");
        },
        async () => {
          cleanupTracker.cleaned = true;
        },
      );

      serviceManager.register(service, {
        name: "test-service",
        version: "1.0.0",
      });

      await expect(serviceManager.startAll()).rejects.toThrow("Start failed");
      await service.stop();

      expect(cleanupTracker.cleaned).toBe(true);
      expect(serviceManager.getServiceMetadata("test-service").isActive).toBe(
        false,
      );
    });

    it("should handle partial startup failures", async () => {
      const startOrder: string[] = [];
      const serviceA = new MockService("service-a", async () => {
        startOrder.push("service-a");
      });
      const serviceB = new MockService("service-b", async () => {
        startOrder.push("service-b");
        throw new Error("Service B failed");
      });
      const serviceC = new MockService("service-c", async () => {
        startOrder.push("service-c");
      });

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });
      serviceManager.register(serviceC, {
        name: "service-c",
        version: "1.0.0",
        dependencies: ["service-b"],
      });

      await expect(serviceManager.startAll()).rejects.toThrow(
        "Service B failed",
      );

      expect(startOrder).toEqual(["service-a", "service-b"]);
      expect(serviceManager.getServiceMetadata("service-a").isActive).toBe(
        true,
      );
      expect(serviceManager.getServiceMetadata("service-b").status).toBe(
        ServiceStatus.ERROR,
      );
      expect(serviceManager.getServiceMetadata("service-c").isActive).toBe(
        false,
      );
    });
  });

  describe("Service Metadata", () => {
    it("should return correct metadata for a service", () => {
      const service = new MockService("test-service");
      const config = {
        name: "test-service",
        version: "1.0.0",
        dependencies: ["other-service"],
      };

      serviceManager.register(service, config);

      const metadata = serviceManager.getServiceMetadata("test-service");
      expect(metadata).toEqual({
        name: "test-service",
        version: "1.0.0",
        dependencies: ["other-service"],
        isActive: false,
        status: ServiceStatus.PENDING,
      });
    });

    it("should return metadata for all services", () => {
      const serviceA = new MockService("service-a");
      const serviceB = new MockService("service-b");

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });
      serviceManager.register(serviceB, {
        name: "service-b",
        version: "2.0.0",
      });

      const metadata = serviceManager.getAllServicesMetadata();
      expect(metadata).toHaveLength(2);
      expect(metadata).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "service-a",
            version: "1.0.0",
          }),
          expect.objectContaining({
            name: "service-b",
            version: "2.0.0",
          }),
        ]),
      );
    });

    it("should throw error when getting metadata for non-existent service", () => {
      expect(() => serviceManager.getServiceMetadata("non-existent")).toThrow(
        "Service non-existent not found",
      );
    });
  });
});
