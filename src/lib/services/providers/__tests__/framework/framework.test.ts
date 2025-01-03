/**
 * @file Test Framework Tests
 * @version 1.2.0
 * @module lib/services/providers/__tests__/framework/framework.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BaseTestSuite,
  Test,
  TestCategory,
  TestPriority,
  type TestContext,
  TEST_METADATA_KEY,
} from "../shared/test.framework";
import { assertions } from "../shared/test.assertions";
import { createMockLogger } from "../shared/test.utils";
import type { Service } from "../../../interfaces/service";
import { ServiceStatus } from "../../../core/service.manager";
import type { ManagedLoggingService } from "../../../core/managed-logging";
import type {
  BaseProvider,
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
} from "../../../../types/provider";
import { mockErrors } from "../shared/mock.data";

// Mock service for testing the framework
class MockService implements Service, BaseProvider {
  private status: ServiceStatus = ServiceStatus.PENDING;
  private startCount = 0;
  private stopCount = 0;

  constructor(private name: string = "mock-service") {}

  getName(): string {
    return this.name;
  }

  async start(): Promise<void> {
    this.startCount++;
    this.status = ServiceStatus.RUNNING;
  }

  async stop(): Promise<void> {
    this.stopCount++;
    this.status = ServiceStatus.STOPPED;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  getStartCount(): number {
    return this.startCount;
  }

  getStopCount(): number {
    return this.stopCount;
  }

  // BaseProvider implementation
  async getPrice(_tokenMint: string): Promise<PriceData> {
    throw new Error("Not implemented");
  }

  async getOHLCV(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<OHLCVData> {
    throw new Error("Not implemented");
  }

  async getOrderBook(
    _tokenMint: string,
    _limit?: number,
  ): Promise<MarketDepth> {
    throw new Error("Not implemented");
  }

  getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: false,
      canGetOHLCV: false,
      canGetOrderBook: false,
    };
  }
}

// Test suite for testing the framework itself
class FrameworkTestSuite extends BaseTestSuite<MockService> {
  private mockLogger!: ManagedLoggingService;

  protected async createTestContext(): Promise<TestContext> {
    this.mockLogger = createMockLogger();
    return {
      logger: this.mockLogger,
      cleanup: async () => {
        // Cleanup resources
      },
    };
  }

  protected createProvider(): MockService {
    return new MockService();
  }

  @Test({
    category: TestCategory.UNIT,
    priority: TestPriority.CRITICAL,
    description: "Test decorator should preserve metadata",
  })
  protected async testDecoratorMetadata(): Promise<void> {
    // Get metadata from the method
    const metadata = Reflect.getMetadata(
      TEST_METADATA_KEY,
      this,
      "testDecoratorMetadata",
    );

    // Verify metadata
    expect(metadata).toBeDefined();
    expect(metadata.category).toBe(TestCategory.UNIT);
    expect(metadata.priority).toBe(TestPriority.CRITICAL);
  }

  @Test({
    category: TestCategory.UNIT,
    priority: TestPriority.HIGH,
    description: "Service lifecycle methods should be called correctly",
  })
  protected async testServiceLifecycle(): Promise<void> {
    const service = this.provider as MockService;

    // Verify initial state
    expect(service.getStartCount()).toBe(1); // Called in beforeEach
    expect(service.getStopCount()).toBe(0);
    expect(service.getStatus()).toBe(ServiceStatus.RUNNING);

    // Stop service
    await service.stop();
    expect(service.getStopCount()).toBe(1);
    expect(service.getStatus()).toBe(ServiceStatus.STOPPED);

    // Restart service
    await service.start();
    expect(service.getStartCount()).toBe(2);
    expect(service.getStatus()).toBe(ServiceStatus.RUNNING);
  }

  @Test({
    category: TestCategory.ERROR_HANDLING,
    priority: TestPriority.HIGH,
    description: "Test assertions should work correctly",
  })
  protected async testAssertions(): Promise<void> {
    // Test service status assertion
    const statusResult = assertions.expectServiceStatus(
      ServiceStatus.RUNNING,
      ServiceStatus.RUNNING,
    );
    expect(statusResult.success).toBe(true);

    const invalidStatusResult = assertions.expectServiceStatus(
      ServiceStatus.RUNNING,
      ServiceStatus.STOPPED,
    );
    expect(invalidStatusResult.success).toBe(false);
    expect(invalidStatusResult.message).toBeDefined();

    // Test error assertion
    const errorPromise = Promise.reject(
      new Error(mockErrors.RATE_LIMIT.message),
    );
    const errorResult = await assertions.expectRejects(
      errorPromise,
      "RATE_LIMIT",
    );
    expect(errorResult.success).toBe(true);
  }
}

describe("Test Framework", () => {
  let testSuite: FrameworkTestSuite;

  beforeEach(async () => {
    testSuite = new FrameworkTestSuite();
    await testSuite.setup();
  });

  afterEach(async () => {
    await testSuite.teardown();
  });

  it("should handle decorator metadata correctly", async () => {
    await testSuite.runTest("testDecoratorMetadata");
  });

  it("should manage service lifecycle correctly", async () => {
    await testSuite.runTest("testServiceLifecycle");
  });

  it("should handle assertions correctly", async () => {
    await testSuite.runTest("testAssertions");
  });

  // Test the base lifecycle tests
  it("should run initialization test", async () => {
    await testSuite.runTest("testInitialization");
  });

  it("should run startup test", async () => {
    await testSuite.runTest("testStartup");
  });

  it("should run shutdown test", async () => {
    await testSuite.runTest("testShutdown");
  });
});
