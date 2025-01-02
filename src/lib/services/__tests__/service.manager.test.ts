/**
 * @file Tests for Service Manager
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ServiceManager,
  ServiceStatus,
  type Service,
} from "../service.manager";

// Mock service implementation
class MockService implements Service {
  private status: ServiceStatus = ServiceStatus.PENDING;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async start(): Promise<void> {
    this.status = ServiceStatus.RUNNING;
  }

  async stop(): Promise<void> {
    this.status = ServiceStatus.STOPPED;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  getName(): string {
    return this.name;
  }
}

// Mock service that fails to start
class FailingService implements Service {
  async start(): Promise<void> {
    throw new Error("Failed to start service");
  }

  async stop(): Promise<void> {
    // noop
  }

  getStatus(): ServiceStatus {
    return ServiceStatus.ERROR;
  }

  getName(): string {
    return "failing-service";
  }
}

describe("ServiceManager", () => {
  let serviceManager: ServiceManager;
  let mockService: MockService;

  beforeEach(() => {
    serviceManager = new ServiceManager();
    mockService = new MockService("test-service");
  });

  describe("Service Registration", () => {
    it("should register a service successfully", () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      const metadata = serviceManager.getServiceMetadata("test-service");
      expect(metadata.name).toBe("test-service");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.isActive).toBe(false);
      expect(metadata.status).toBe(ServiceStatus.PENDING);
    });

    it("should throw error when registering duplicate service", () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      expect(() => {
        serviceManager.register(mockService, {
          name: "test-service",
          version: "1.0.0",
        });
      }).toThrow("Service test-service is already registered");
    });
  });

  describe("Service Lifecycle", () => {
    it("should start a service successfully", async () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      await serviceManager.startAll();

      const metadata = serviceManager.getServiceMetadata("test-service");
      expect(metadata.isActive).toBe(true);
      expect(metadata.status).toBe(ServiceStatus.RUNNING);
      expect(metadata.startTime).toBeDefined();
    });

    it("should stop a service successfully", async () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      await serviceManager.startAll();
      await serviceManager.stopAll();

      const metadata = serviceManager.getServiceMetadata("test-service");
      expect(metadata.isActive).toBe(false);
      expect(metadata.status).toBe(ServiceStatus.STOPPED);
      expect(metadata.startTime).toBeUndefined();
    });

    it("should handle service start failure", async () => {
      const failingService = new FailingService();
      serviceManager.register(failingService, {
        name: "failing-service",
        version: "1.0.0",
      });

      await expect(serviceManager.startAll()).rejects.toThrow(
        "Failed to start service",
      );

      const metadata = serviceManager.getServiceMetadata("failing-service");
      expect(metadata.isActive).toBe(false);
      expect(metadata.status).toBe(ServiceStatus.ERROR);
    });
  });

  describe("Dependency Management", () => {
    it("should start services in correct dependency order", async () => {
      const serviceA = new MockService("service-a");
      const serviceB = new MockService("service-b");
      const startOrder: string[] = [];

      vi.spyOn(serviceA, "start").mockImplementation(async () => {
        startOrder.push("service-a");
      });
      vi.spyOn(serviceB, "start").mockImplementation(async () => {
        startOrder.push("service-b");
      });

      serviceManager.register(serviceB, {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      serviceManager.register(serviceA, {
        name: "service-a",
        version: "1.0.0",
      });

      await serviceManager.startAll();

      expect(startOrder).toEqual(["service-a", "service-b"]);
    });

    it("should detect circular dependencies", () => {
      serviceManager.register(new MockService("service-a"), {
        name: "service-a",
        version: "1.0.0",
        dependencies: ["service-b"],
      });

      serviceManager.register(new MockService("service-b"), {
        name: "service-b",
        version: "1.0.0",
        dependencies: ["service-a"],
      });

      expect(() => serviceManager.initialize()).toThrow(
        "Circular dependency detected",
      );
    });

    it("should throw error for missing dependencies", () => {
      serviceManager.register(new MockService("service-a"), {
        name: "service-a",
        version: "1.0.0",
        dependencies: ["non-existent-service"],
      });

      expect(() => serviceManager.initialize()).toThrow(
        "Dependency non-existent-service not found",
      );
    });
  });

  describe("Service Deregistration", () => {
    it("should deregister a service successfully", async () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      await serviceManager.deregister("test-service");

      expect(() => serviceManager.getServiceMetadata("test-service")).toThrow(
        "Service test-service not found",
      );
    });

    it("should stop active service before deregistering", async () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      await serviceManager.startAll();
      const stopSpy = vi.spyOn(mockService, "stop");

      await serviceManager.deregister("test-service");

      expect(stopSpy).toHaveBeenCalled();
    });

    it("should throw error when deregistering non-existent service", async () => {
      await expect(serviceManager.deregister("non-existent")).rejects.toThrow(
        "Service non-existent is not registered",
      );
    });
  });

  describe("Metadata Management", () => {
    it("should return correct metadata for all services", () => {
      serviceManager.register(new MockService("service-a"), {
        name: "service-a",
        version: "1.0.0",
      });

      serviceManager.register(new MockService("service-b"), {
        name: "service-b",
        version: "2.0.0",
      });

      const metadata = serviceManager.getAllServicesMetadata();
      expect(metadata).toHaveLength(2);
      expect(metadata.map((m) => m.name)).toContain("service-a");
      expect(metadata.map((m) => m.name)).toContain("service-b");
    });

    it("should return deep copy of metadata", () => {
      serviceManager.register(mockService, {
        name: "test-service",
        version: "1.0.0",
      });

      const metadata1 = serviceManager.getServiceMetadata("test-service");
      const metadata2 = serviceManager.getServiceMetadata("test-service");

      expect(metadata1).toEqual(metadata2);
      expect(metadata1).not.toBe(metadata2);
    });
  });
});
