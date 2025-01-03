/**
 * @file Jupiter Provider Tests
 * @version 1.0.0
 * @module lib/services/providers/__tests__/jupiter.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { vi, describe } from "vitest";
import axios from "axios";
import { JupiterProvider } from "../jupiter.provider";
import { ProviderTestFramework, type ProviderTestContext } from "./shared/provider.test.framework";
import { createMockLogger, createMockConnection } from "./shared/test.utils";

// Mock data for testing
const mockData = {
  validTokenMint: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  invalidTokenMint: "invalid-token-mint",
  priceData: {
    price: 1.23,
    confidence: 0.99,
    timestamp: Date.now(),
  },
};

// Mock axios and web3
vi.mock("axios");
vi.mock("@solana/web3.js");

class JupiterProviderTest extends ProviderTestFramework<JupiterProvider> {
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

  protected async setupContext(): Promise<ProviderTestContext> {
    vi.clearAllMocks();

    // Configure mock responses
    let requestCount = 0;
    const requestCache = new Map<string, number>();

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
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      // Check if the request is cached
      const lastRequestTime = requestCache.get(url);
      const now = Date.now();
      if (lastRequestTime && now - lastRequestTime < 5000) {
        return mockResponse;
      }

      // Update request count and cache
      requestCount++;
      requestCache.set(url, now);

      // Simulate rate limiting
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

      // Simulate a slow request for cancellation testing
      if (url.includes("slow")) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return mockResponse;
    });

    const provider = this.createInstance();
    await provider.start();

    return {
      provider,
      logger: createMockLogger(),
      validTokenMint: mockData.validTokenMint,
      invalidTokenMint: mockData.invalidTokenMint,
      mockRequest: () => provider.getPrice(mockData.validTokenMint + "-slow"),
    };
  }

  protected async cleanupContext(): Promise<void> {
    vi.clearAllMocks();
  }
}

// Run the tests
describe("Jupiter Provider", () => {
  const testSuite = new JupiterProviderTest({
    rateLimitTests: {
      requestCount: 10,
      windowMs: 1000,
    },
    cacheTests: {
      cacheTimeoutMs: 5000,
    },
  });
  testSuite.runTests("Jupiter Provider");
});
