/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/providers/__tests__/jupiter.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection } from "@solana/web3.js";
import axios from "axios";
import { JupiterProvider } from "../jupiter.provider";
import { ManagedLoggingService } from "../../core/managed-logging";
import { runProviderTestSuite } from "./shared/provider.test.suite";

// Constants for testing
const SOL_MINT = "So11111111111111111111111111111111111111112";
const INVALID_MINT = "invalid-mint";

// Mock modules
vi.mock("axios");

vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getSlot: vi.fn().mockResolvedValue(1),
  })),
}));

vi.mock("../../core/managed-logging", () => ({
  ManagedLoggingService: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("Jupiter Provider", () => {
  // Run base provider test suite
  runProviderTestSuite("Jupiter", async () => {
    // Setup test context
    vi.clearAllMocks();

    // Track request count for rate limiting
    let requestCount = 0;
    const mockResponse = {
      data: {
        data: {
          [SOL_MINT]: {
            id: SOL_MINT,
            type: "token",
            price: "1.0",
          },
        },
        timeTaken: 100,
      },
    };

    vi.mocked(axios.get).mockImplementation(async () => {
      requestCount++;
      if (requestCount > 5) {
        // Rate limit after 5 requests
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

    const mockLogger = new ManagedLoggingService({
      serviceName: "test-jupiter",
      level: "info",
      logDir: "./logs",
    });
    const mockConnection = new Connection(
      "https://api.mainnet-beta.solana.com",
    );
    const provider = new JupiterProvider(
      {
        name: "jupiter-provider",
        version: "1.0.0",
        maxRequestsPerWindow: 5, // Set rate limit to match mock
      },
      mockLogger,
      mockConnection,
    );

    return {
      provider,
      logger: mockLogger,
      validTokenMint: SOL_MINT,
      invalidTokenMint: INVALID_MINT,
      mockRequest: () => provider.getPrice(SOL_MINT), // For request cancellation testing
    };
  });

  // Jupiter-specific tests
  describe("Jupiter-Specific Features", () => {
    let provider: JupiterProvider;
    let mockLogger: ManagedLoggingService;
    let mockConnection: Connection;

    beforeEach(async () => {
      vi.clearAllMocks();

      // Setup axios mock
      const mockResponse = {
        data: {
          data: {
            [SOL_MINT]: {
              id: SOL_MINT,
              type: "token",
              price: "1.0",
            },
          },
          timeTaken: 100,
        },
      };
      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      mockLogger = new ManagedLoggingService({
        serviceName: "test-jupiter",
        level: "info",
        logDir: "./logs",
      });
      mockConnection = new Connection("https://api.mainnet-beta.solana.com");
      provider = new JupiterProvider(
        {
          name: "jupiter-provider",
          version: "1.0.0",
        },
        mockLogger,
        mockConnection,
      );

      await provider.start();
    });

    describe("Price Discovery", () => {
      it("should handle Jupiter-specific price response format", async () => {
        const price = await provider.getPrice(SOL_MINT);
        expect(price).toEqual({
          price: 1.0,
          timestamp: expect.any(Number),
          confidence: 1,
        });
      });

      it("should handle missing price data", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
          data: { data: {} },
        });

        await expect(provider.getPrice(SOL_MINT)).rejects.toThrow();
      });
    });

    describe("Request Management", () => {
      it("should cancel pending requests on cleanup", async () => {
        // Mock a request that never resolves but can be aborted
        const mockGet = vi.spyOn(axios, "get").mockImplementation(() => {
          return new Promise((_, reject) => {
            // The request will be aborted by the provider's cleanup
            const abortError = new Error("Request cancelled");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });

        // Start a request that will be cancelled
        const pricePromise = provider.getPrice(SOL_MINT).catch((error) => {
          // Ensure we're getting the right error
          expect(error.message).toBe("Request cancelled");
          expect(error.code).toBe("REQUEST_CANCELLED");
        });

        // Wait a bit to ensure the request has started
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Stop the provider which should cancel the request
        await provider.stop();

        // Wait for the promise to complete
        await pricePromise;

        // Cleanup
        mockGet.mockRestore();
      });
    });
  });
});
