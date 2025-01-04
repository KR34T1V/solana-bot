/**
 * @file Jupiter Provider Tests
 * @version 1.0.0
 * @module lib/services/providers/__tests__/jupiter.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { beforeEach, describe, expect, it } from "vitest";
import { JupiterProvider } from "../../providers/jupiter.provider";
import { ProviderTestFramework, TestContext } from "./shared/provider.test.framework";
import { ServiceError, type ProviderConfig } from "../../providers/base.provider";
import type { Alert, PriceData, TestEndpoint } from "../../../../types/test.types";
import { createMockLogger } from "./shared/test.utils";
import { Connection } from "@solana/web3.js";

class JupiterProviderTest extends ProviderTestFramework<JupiterProvider> {
  protected provider!: JupiterProvider;

  protected override createInstance(config?: Partial<ProviderConfig>): JupiterProvider {
    const provider = new JupiterProvider({
      name: "jupiter-test",
      version: "1.0.0",
      rateLimitMs: 100,
      maxRequestsPerWindow: 10,
      circuitBreakerThreshold: 3,
      healthCheckIntervalMs: 1000,
      adaptiveRateLimiting: true,
      batchingEnabled: true,
      ...config
    }, createMockLogger(), new Connection("http://localhost:8899"));

    // Store original methods
    const originalStart = provider.start.bind(provider);
    const originalStop = provider.stop.bind(provider);
    const originalGetPrice = provider.getPrice.bind(provider);

    // Override methods to make them accessible
    provider.start = originalStart;
    provider.stop = originalStop;
    provider.getPrice = originalGetPrice;

    return provider;
  }

  protected override async setupContext(): Promise<TestContext> {
    const context = new TestContext();
    context.addEndpoint({
      url: "https://api.jupiter.test/v1",
      weight: 2,
      latency: 100,
      errorRate: 0
    } as TestEndpoint);
    context.addEndpoint({
      url: "https://api.jupiter.test/v2",
      weight: 1,
      latency: 150,
      errorRate: 0
    } as TestEndpoint);
    return context;
  }

  protected override async cleanupContext(): Promise<void> {
    if (this.provider) {
      await this.provider.stop();
    }
  }

  // Make protected methods accessible for testing
  public async startProvider(): Promise<void> {
    await this.provider.start();
  }

  public async getPrice(token: string): Promise<PriceData> {
    return this.provider.getPrice(token);
  }
}

describe("JupiterProvider", () => {
  let testFramework: JupiterProviderTest;

  beforeEach(async () => {
    testFramework = new JupiterProviderTest();
    await testFramework.setup();
    await testFramework.startProvider();
  });

  describe("Load Balancing", () => {
    it("should distribute requests across endpoints", async () => {
      const requests = Array(10).fill(null).map(() => 
        testFramework.getPrice("SOL")
      );
      
      await Promise.allSettled(requests);
      
      const metrics = testFramework.getEndpointMetrics();
      expect(metrics["https://api.jupiter.test/v1"].requestCount).toBeGreaterThan(0);
      expect(metrics["https://api.jupiter.test/v2"].requestCount).toBeGreaterThan(0);
    });

    it("should failover to backup endpoints", async () => {
      testFramework.setEndpointFailure("https://api.jupiter.test/v1", true);
      
      const result = await testFramework.getPrice("SOL");
      expect(result).toBeDefined();
      
      const metrics = testFramework.getEndpointMetrics();
      expect(metrics["https://api.jupiter.test/v2"].requestCount).toBeGreaterThan(0);
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after consecutive failures", async () => {
      testFramework.setEndpointFailure("https://api.jupiter.test/v1", true);
      
      const requests = Array(5).fill(null).map(() => 
        testFramework.getPrice("SOL").catch((error: Error) => error)
      );
      
      const results = await Promise.all(requests);
      
      const circuitOpenErrors = results.filter(
        (result: Error | PriceData): result is Error => 
          result instanceof ServiceError && result.code === "CIRCUIT_OPEN"
      );
      expect(circuitOpenErrors.length).toBeGreaterThan(0);
    });

    it("should attempt recovery after circuit opens", async () => {
      testFramework.setEndpointFailure("https://api.jupiter.test/v1", true);
      
      const requests = Array(5).fill(null).map(() => 
        testFramework.getPrice("SOL").catch((error: Error) => error)
      );
      await Promise.all(requests);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      testFramework.setEndpointFailure("https://api.jupiter.test/v1", false);
      
      const recoveryAttempts = testFramework.getEndpointRecoveryAttempts("https://api.jupiter.test/v1");
      expect(recoveryAttempts).toBeGreaterThan(0);
    });
  });

  describe("Request Optimization", () => {
    it("should coalesce identical requests", async () => {
      const requests = Array(3).fill(null).map(() => 
        testFramework.getPrice("SOL")
      );
      
      await Promise.all(requests);
      
      const metrics = testFramework.getEndpointMetrics();
      const totalRequests = Object.values(metrics).reduce(
        (sum, metric) => sum + metric.requestCount, 0
      );
      expect(totalRequests).toBeLessThan(3);
    });

    it("should batch similar requests", async () => {
      const requests = [
        testFramework.getPrice("SOL"),
        testFramework.getPrice("RAY"),
        testFramework.getPrice("SRM")
      ];
      
      await Promise.all(requests);
      
      const metrics = testFramework.getEndpointMetrics();
      const totalRequests = Object.values(metrics).reduce(
        (sum, metric) => sum + metric.requestCount, 0
      );
      expect(totalRequests).toBeLessThan(3);
    });
  });

  describe("Health Monitoring", () => {
    it("should track health metrics", async () => {
      const requests = Array(5).fill(null).map(() => 
        testFramework.getPrice("SOL")
      );
      await Promise.all(requests);
      
      const metrics = testFramework.getEndpointMetrics();
      expect(metrics["https://api.jupiter.test/v1"].latency).toBeDefined();
      expect(metrics["https://api.jupiter.test/v1"].errorRate).toBeDefined();
      expect(metrics["https://api.jupiter.test/v1"].successRate).toBeDefined();
    });

    it("should raise alerts on high error rates", async () => {
      testFramework.setEndpointFailure("https://api.jupiter.test/v1", true);
      
      const requests = Array(10).fill(null).map(() => 
        testFramework.getPrice("SOL").catch((error: Error) => error)
      );
      
      await Promise.all(requests);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = testFramework.getAlerts();
      const errorRateAlerts = alerts.filter((alert: Alert) => 
        alert.message.includes("High error rate")
      );
      expect(errorRateAlerts.length).toBeGreaterThan(0);
    });
  });
});
