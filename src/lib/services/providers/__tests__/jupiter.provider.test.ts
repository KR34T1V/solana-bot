/**
 * @file Tests for Jupiter API provider
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { JupiterProvider } from "../jupiter.provider";

// Mock axios
vi.mock("axios", () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn(),
      },
    },
    isAxiosError: vi.fn(),
  };
  return {
    default: mockAxios,
    isAxiosError: vi.fn(),
  };
});

// Mock logger
vi.mock("../../logging.service", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("JupiterProvider", () => {
  let provider: JupiterProvider;
  let mockAxios: ReturnType<typeof axios.create>;
  const mockTokenMint = "So11111111111111111111111111111111111111112"; // SOL token mint

  beforeEach(() => {
    provider = new JupiterProvider();
    mockAxios = axios.create();
    vi.clearAllMocks();
  });

  describe("getPrice", () => {
    it("should fetch price successfully", async () => {
      const mockResponse = {
        data: {
          data: {
            [mockTokenMint]: {
              id: mockTokenMint,
              type: "derivedPrice",
              price: "100.5",
            },
          },
          timeTaken: 0.002580192,
        },
      };

      (mockAxios.get as any).mockResolvedValueOnce(mockResponse);

      const result = await provider.getPrice(mockTokenMint);

      expect(result).toEqual({
        price: 100.5,
        timestamp: expect.any(Number),
        confidence: 1,
      });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/price/v2?ids=${mockTokenMint}`,
      );
    });

    it("should handle empty response", async () => {
      const mockResponse = {
        data: {
          data: {},
          timeTaken: 0,
        },
      };

      (mockAxios.get as any).mockResolvedValueOnce(mockResponse);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        `Invalid price data received for token: ${mockTokenMint}`,
      );
    });

    it("should handle network error", async () => {
      const networkError = new Error("Network error");
      (mockAxios.get as any).mockRejectedValueOnce(networkError);
      (axios.isAxiosError as any).mockReturnValue(false);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle API error response", async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: { error: "Rate limit exceeded" },
          headers: { "retry-after": "60" },
        },
      };

      (mockAxios.get as any).mockRejectedValueOnce(errorResponse);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });

  describe("getOHLCV", () => {
    it("should throw not implemented error", async () => {
      await expect(provider.getOHLCV(mockTokenMint, 5, 100)).rejects.toThrow(
        "OHLCV data not available through Jupiter API",
      );
    });
  });
});
