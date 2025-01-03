/**
 * @file Shared test suite for provider implementations
 * @version 1.0.0
 * @module lib/services/providers/__tests__/shared/provider.test.suite
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ManagedLoggingService } from "../../../core/managed-logging";
import { ServiceStatus } from "../../../core/service.manager";
import { ServiceError } from "../../base.provider";
import type { ManagedProviderBase } from "../../base.provider";

export interface ProviderTestContext {
  provider: ManagedProviderBase;
  logger: ManagedLoggingService;
  validTokenMint: string;
  invalidTokenMint: string;
  mockRequest?: () => Promise<any>; // For testing request cancellation
}

export interface BaseProviderTestHelpers {
  testRequestCancellation: (context: ProviderTestContext) => Promise<void>;
  testErrorHandling: (context: ProviderTestContext) => Promise<void>;
  testResourceCleanup: (context: ProviderTestContext) => Promise<void>;
  testCacheManagement: (context: ProviderTestContext) => Promise<void>;
}

export const baseProviderTestHelpers: BaseProviderTestHelpers = {
  async testRequestCancellation(context: ProviderTestContext) {
    if (!context.mockRequest) {
      throw new Error(
        "mockRequest must be provided to test request cancellation",
      );
    }

    // Start a request that will never resolve
    const requestPromise = context.mockRequest();

    // Stop the provider (should cancel pending requests)
    await context.provider.stop();

    // Request should be rejected with a cancellation error
    await expect(requestPromise).rejects.toThrow(/cancel|abort/i);
  },

  async testErrorHandling(context: ProviderTestContext) {
    // Test rate limit handling
    const requests = Array(10)
      .fill(null)
      .map(() =>
        context.provider.getPrice(context.validTokenMint).catch((error) => {
          if (
            error instanceof ServiceError &&
            (error.code === "RATE_LIMIT_EXCEEDED" || error.code === "API_ERROR")
          ) {
            throw error;
          }
          return undefined;
        }),
      );

    const results = await Promise.allSettled(requests);
    const rateLimitErrors = results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof ServiceError &&
        (result.reason.code === "RATE_LIMIT_EXCEEDED" ||
          result.reason.code === "API_ERROR"),
    );

    expect(rateLimitErrors.length).toBeGreaterThan(0);

    // Test validation error handling
    await expect(
      context.provider.getPrice(context.invalidTokenMint),
    ).rejects.toThrow(ServiceError);
  },

  async testResourceCleanup(context: ProviderTestContext) {
    await context.provider.start();
    await context.provider.stop();

    // Should be in clean state after stop
    expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
  },

  async testCacheManagement(context: ProviderTestContext) {
    // First request should hit the API
    const firstResponse = await context.provider.getPrice(
      context.validTokenMint,
    );
    expect(firstResponse).toBeDefined();
    expect(firstResponse.price).toBeGreaterThan(0);

    // Second request within cache timeout should return cached data
    const secondResponse = await context.provider.getPrice(
      context.validTokenMint,
    );
    expect(secondResponse.price).toEqual(firstResponse.price);
    expect(secondResponse.confidence).toEqual(firstResponse.confidence);

    // Wait for cache to expire (default cache timeout is 5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 5100)); // 5 seconds + 100ms buffer

    // Third request after cache expiry should hit API again
    const thirdResponse = await context.provider.getPrice(
      context.validTokenMint,
    );
    expect(thirdResponse).toBeDefined();
    expect(thirdResponse.price).toBeGreaterThan(0);
  },
};

/**
 * Runs a standardized test suite for provider implementations.
 * This suite validates common provider functionality including:
 * - Service lifecycle (start/stop)
 * - Token validation
 * - Rate limiting
 * - Error handling
 * - Resource management
 * - Cache management
 *
 * @function runProviderTestSuite
 * @description Executes a comprehensive test suite for provider implementations
 * @param {string} suiteName - The name of the provider being tested
 * @param {() => Promise<ProviderTestContext>} setupContext - Function to set up the test context before each test
 * @param {() => Promise<void>} [teardownContext] - Optional function to clean up after each test
 * @returns {void}
 */
export function runProviderTestSuite(
  suiteName: string,
  setupContext: () => Promise<ProviderTestContext>,
  teardownContext?: () => Promise<void>,
) {
  describe(`${suiteName} Base Provider Tests`, () => {
    let context: ProviderTestContext;

    beforeEach(async () => {
      context = await setupContext();
    });

    afterEach(async () => {
      if (teardownContext) {
        await teardownContext();
      }
    });

    describe("Service Lifecycle", () => {
      it("should start correctly", async () => {
        await context.provider.start();
        expect(context.provider.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should stop correctly", async () => {
        await context.provider.start();
        await context.provider.stop();
        expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should prevent double start", async () => {
        await context.provider.start();
        await expect(context.provider.start()).rejects.toThrow(ServiceError);
        expect(context.provider.getStatus()).toBe(ServiceStatus.RUNNING);
      });

      it("should prevent double stop", async () => {
        await context.provider.start();
        await context.provider.stop();
        await expect(context.provider.stop()).rejects.toThrow(ServiceError);
        expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
      });
    });

    describe("Token Validation", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      it("should reject invalid token mint format", async () => {
        await expect(
          context.provider.getPrice(context.invalidTokenMint),
        ).rejects.toThrow(ServiceError);
      });

      it("should accept valid token mint format", async () => {
        await expect(
          context.provider.getPrice(context.validTokenMint),
        ).resolves.toBeDefined();
      });
    });

    describe("Rate Limiting", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      it(
        "should enforce rate limits",
        async () => {
          await baseProviderTestHelpers.testErrorHandling(context);
        },
        { timeout: 10000 },
      );

      it("should allow requests after rate limit window", async () => {
        await context.provider.getPrice(context.validTokenMint);
        await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for rate limit window
        await expect(
          context.provider.getPrice(context.validTokenMint),
        ).resolves.toBeDefined();
      });
    });

    describe("Error Handling", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      it("should handle operation errors gracefully", async () => {
        await baseProviderTestHelpers.testErrorHandling(context);
      });

      it("should maintain service state during errors", async () => {
        try {
          await context.provider.getPrice(context.invalidTokenMint);
        } catch (error) {
          // Should maintain RUNNING state even after error
          expect(context.provider.getStatus()).toBe(ServiceStatus.RUNNING);
        }
      });
    });

    describe("Resource Management", () => {
      it("should cleanup resources on stop", async () => {
        await baseProviderTestHelpers.testResourceCleanup(context);
      });
    });

    describe("Cache Management", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      it(
        "should properly cache and invalidate responses",
        async () => {
          await baseProviderTestHelpers.testCacheManagement(context);
        },
        { timeout: 10000 },
      );
    });
  });
}
