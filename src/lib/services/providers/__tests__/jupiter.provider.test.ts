/**
 * @file Jupiter Provider Test Implementation
 * @version 1.1.0
 * @module lib/services/providers/__tests__/jupiter.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 *
 * @description
 * Implementation of the unified test framework for the Jupiter provider.
 * Demonstrates how to extend the base framework with provider-specific
 * test cases while maintaining standardized test coverage.
 *
 * Test Categories:
 * 1. Standard Framework Tests
 *    - Lifecycle management
 *    - Error handling
 *    - State transitions
 *
 * 2. Jupiter-Specific Tests
 *    - Price discovery format
 *    - Missing data handling
 *    - Request cancellation
 *
 * Configuration:
 * - Rate limiting: 10 requests per 1000ms window
 * - Cache timeout: 5000ms
 *
 * Example Usage:
 * ```bash
 * npm test jupiter.provider
 * ```
 */

import { vi, describe, it, expect } from "vitest";
import axios from "axios";
import { JupiterProvider } from "../jupiter.provider";
import type { ProviderTestContext } from "./shared/provider.test.framework";
import { ProviderTestFramework } from "./shared/provider.test.framework";
import {
  mockData,
  createMockLogger,
  createMockConnection,
  testUtils,
} from "./shared/test.utils";

// Mock external dependencies
vi.mock("axios");
vi.mock("@solana/web3.js");

/**
 * Jupiter-specific test implementation extending the unified framework.
 * Demonstrates proper framework extension with custom test scenarios.
 *
 * @class JupiterProviderTest
 * @extends ProviderTestFramework<JupiterProvider>
 */
class JupiterProviderTest extends ProviderTestFramework<JupiterProvider> {
  /**
   * Creates a new instance of the Jupiter provider for testing.
   * Configures the provider with standard test settings.
   *
   * @method createInstance
   * @returns {JupiterProvider} Configured provider instance
   */
  protected createInstance(): JupiterProvider {
    return new JupiterProvider(
      {
        name: "jupiter-provider",
        version: "1.0.0",
        maxRequestsPerWindow: 5,
      },
      createMockLogger(),
      createMockConnection(),
    );
  }

  /**
   * Sets up the test context with Jupiter-specific mocks and data.
   * Configures mock responses and error scenarios.
   *
   * @method setupContext
   * @returns {Promise<ProviderTestContext>} Configured test context
   */
  protected async setupContext(): Promise<ProviderTestContext> {
    vi.clearAllMocks();

    // Configure mock responses
    let requestCount = 0;
    const mockResponse = {
      data: {
        data: {
          [mockData.validTokenMint]: {
            id: mockData.validTokenMint,
            type: "token",
            price: mockData.priceData.price.toString(),
          },
        },
        timeTaken: 100,
      },
    };

    // Setup rate limiting simulation
    vi.mocked(axios.get).mockImplementation(async () => {
      requestCount++;
      if (requestCount > 5) {
        const error = new Error("Rate limit exceeded") as any;
        error.isAxiosError = true;
        error.response = {
          status: 429,
          statusText: "Too Many Requests",
          data: { message: "Rate limit exceeded" },
        };
        throw error;
      }
      return mockResponse;
    });

    const provider = this.createInstance();
    return {
      provider,
      logger: createMockLogger(),
      validTokenMint: mockData.validTokenMint,
      invalidTokenMint: mockData.invalidTokenMint,
      mockRequest: () => provider.getPrice(mockData.validTokenMint),
    };
  }

  /**
   * Cleans up test resources and resets mocks.
   *
   * @method cleanupContext
   */
  protected async cleanupContext(): Promise<void> {
    vi.clearAllMocks();
  }

  /**
   * Extends the standard test suite with Jupiter-specific tests.
   *
   * @method runCustomTests
   * @param {JupiterProvider} instance - Provider instance
   * @param {ProviderTestContext} context - Test context
   */
  protected override runCustomTests(
    instance: JupiterProvider,
    context: ProviderTestContext,
  ): void {
    super.runCustomTests(instance, context);
    this.runJupiterSpecificTests(instance);
  }

  /**
   * Implements Jupiter-specific test cases.
   * Tests unique features and behaviors of the Jupiter provider.
   *
   * @private
   * @method runJupiterSpecificTests
   * @param {JupiterProvider} provider - Provider instance
   */
  private runJupiterSpecificTests(provider: JupiterProvider): void {
    describe("Jupiter-Specific Features", () => {
      describe("Price Discovery", () => {
        it("should handle Jupiter-specific price response format", async () => {
          const price = await provider.getPrice(mockData.validTokenMint);
          expect(price).toEqual({
            price: mockData.priceData.price,
            timestamp: expect.any(Number),
            confidence: mockData.priceData.confidence,
          });
        });

        it("should handle missing price data", async () => {
          vi.mocked(axios.get).mockResolvedValueOnce({
            data: { data: {} },
          });

          await expect(
            provider.getPrice(mockData.validTokenMint),
          ).rejects.toThrow();
        });
      });

      describe("Request Management", () => {
        it("should cancel pending requests on cleanup", async () => {
          const mockGet = vi.spyOn(axios, "get").mockImplementation(() => {
            return new Promise((_, reject) => {
              const abortError = new Error("Request cancelled");
              abortError.name = "AbortError";
              reject(abortError);
            });
          });

          const pricePromise = provider
            .getPrice(mockData.validTokenMint)
            .catch((error) => {
              expect(error.message).toBe("Request cancelled");
              expect(error.code).toBe("REQUEST_CANCELLED");
            });

          await testUtils.delay(100);
          await provider.stop();
          await pricePromise;
          mockGet.mockRestore();
        });
      });
    });
  }
}

// Initialize and run the test suite
new JupiterProviderTest({
  rateLimitTests: {
    requestCount: 10,
    windowMs: 1000,
  },
  cacheTests: {
    cacheTimeoutMs: 5000,
  },
}).runTests("Jupiter Provider");
