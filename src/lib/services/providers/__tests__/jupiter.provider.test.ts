/**
 * @file Jupiter Provider Tests
 * @version 1.0.0
 * @description Tests for Jupiter provider implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import axios from "axios";
import { JupiterProvider } from "../jupiter.provider";
import { ServiceStatus } from "../../core/service.manager";
import type { ProviderConfig } from "../../interfaces/provider";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    })),
    isAxiosError: vi.fn(),
  },
}));

// Mock logger
vi.mock("../../logging.service", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("JupiterProvider", () => {
  let provider: JupiterProvider;
  let mockAxiosInstance: ReturnType<typeof axios.create>;
  const defaultConfig: Partial<ProviderConfig> = {
    endpoint: "https://test.jup.ag",
    apiKey: "test-key",
    timeout: 5000,
    maxRetries: 2,
    cacheTTL: 15000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = {
      get: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    } as unknown as ReturnType<typeof axios.create>;

    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    provider = new JupiterProvider(defaultConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Service Interface", () => {
    it("should implement Service interface correctly", () => {
      expect(provider.getName()).toBe("jupiter-provider");
      expect(provider.getStatus()).toBe(ServiceStatus.PENDING);
      expect(typeof provider.start).toBe("function");
      expect(typeof provider.stop).toBe("function");
    });

    it("should start service successfully", async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: "ok" });

      await provider.start();

      expect(provider.getStatus()).toBe(ServiceStatus.RUNNING);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/health");
    });

    it("should handle start errors correctly", async () => {
      vi.mocked(mockAxiosInstance.get).mockRejectedValueOnce(
        new Error("Connection failed"),
      );

      await expect(provider.start()).rejects.toThrow("Connection failed");
      expect(provider.getStatus()).toBe(ServiceStatus.ERROR);
    });

    it("should stop service successfully", async () => {
      await provider.start();
      await provider.stop();

      expect(provider.getStatus()).toBe(ServiceStatus.STOPPED);
    });
  });

  describe("Provider Interface", () => {
    it("should implement Provider interface correctly", () => {
      expect(provider.getProviderName()).toBe("Jupiter");
      expect(provider.getEndpoint()).toBe(defaultConfig.endpoint);
      expect(typeof provider.isReady).toBe("function");
      expect(typeof provider.getConfig).toBe("function");
      expect(typeof provider.clearCache).toBe("function");
    });

    it("should return correct configuration", () => {
      const config = provider.getConfig();
      expect(config).toEqual({
        endpoint: defaultConfig.endpoint,
        apiKey: defaultConfig.apiKey,
        timeout: defaultConfig.timeout,
        maxRetries: defaultConfig.maxRetries,
        cacheTTL: defaultConfig.cacheTTL,
      });
    });

    it("should handle ready state correctly", async () => {
      expect(provider.isReady()).toBe(false);

      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: "ok" });
      await provider.start();

      expect(provider.isReady()).toBe(true);

      await provider.stop();
      expect(provider.isReady()).toBe(false);
    });
  });

  describe("Price Operations", () => {
    const mockTokenMint = "mock-token-mint";
    const mockPriceResponse = {
      data: {
        data: {
          [mockTokenMint]: {
            id: mockTokenMint,
            type: "token",
            price: "1.5",
          },
        },
        timeTaken: 100,
      },
    };

    beforeEach(async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: "ok" }); // For health check

      await provider.start();
    });

    it("should fetch price successfully", async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockPriceResponse);

      const price = await provider.getPrice(mockTokenMint);

      expect(price).toEqual({
        price: 1.5,
        timestamp: expect.any(Number),
        confidence: 1,
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/price/v2?ids=${mockTokenMint}`,
      );
    });

    it("should use cached price when available", async () => {
      // First call to populate cache
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockPriceResponse);
      await provider.getPrice(mockTokenMint);
      vi.mocked(mockAxiosInstance.get).mockClear();

      // Second call should use cache
      const price = await provider.getPrice(mockTokenMint);

      expect(price).toEqual({
        price: 1.5,
        timestamp: expect.any(Number),
        confidence: 1,
      });
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it("should clear cache when requested", async () => {
      // First call to populate cache
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockPriceResponse);
      await provider.getPrice(mockTokenMint);
      vi.mocked(mockAxiosInstance.get)
        .mockClear()
        .mockResolvedValueOnce(mockPriceResponse);

      // Clear cache
      provider.clearCache();

      // Next call should fetch fresh data
      await provider.getPrice(mockTokenMint);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/price/v2?ids=${mockTokenMint}`,
      );
    });

    it("should handle rate limits", async () => {
      vi.useFakeTimers();
      const now = Date.now();

      // First request
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockPriceResponse);
      const firstRequest = provider.getPrice(mockTokenMint);

      // Advance time by 50ms (less than minRequestInterval)
      vi.advanceTimersByTime(50);

      // Second request
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce(mockPriceResponse);
      const secondRequest = provider.getPrice(mockTokenMint);

      // Advance time to complete both requests
      vi.advanceTimersByTime(150);

      await Promise.all([firstRequest, secondRequest]);

      // Verify the second request was delayed
      expect(Date.now() - now).toBeGreaterThanOrEqual(100);
    });

    it("should handle API errors correctly", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      Object.assign(rateLimitError, {
        isAxiosError: true,
        response: { status: 429 },
      });

      vi.mocked(mockAxiosInstance.get)
        .mockReset()
        .mockRejectedValueOnce(rateLimitError);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        "Rate limit exceeded",
      );
    });

    it("should require service to be running", async () => {
      await provider.stop();
      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        "Jupiter provider is not running",
      );
    });
  });

  describe("Unsupported Operations", () => {
    beforeEach(async () => {
      vi.mocked(mockAxiosInstance.get).mockResolvedValueOnce({ data: "ok" });
      await provider.start();
    });

    it("should throw for OHLCV requests", async () => {
      await expect(provider.getOHLCV("token", 1, 100)).rejects.toThrow(
        "OHLCV data not available through Jupiter API",
      );
    });

    it("should throw for order book requests", async () => {
      await expect(provider.getOrderBook("token")).rejects.toThrow(
        "Order book data not available through Jupiter",
      );
    });
  });
});
