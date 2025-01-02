/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/providers/__tests__/base.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ManagedLoggingService } from "../../core/managed-logging";
import type {
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
} from "../../../types/provider";
import { ManagedProviderBase, type ProviderConfig } from "../base.provider";
import { ServiceStatus } from "../../core/service.manager";

class TestProvider extends ManagedProviderBase {
  constructor(config: ProviderConfig, logger: ManagedLoggingService) {
    super(config, logger);
  }

  protected override async initializeProvider(): Promise<void> {
    // Test implementation
  }

  protected override async cleanupProvider(): Promise<void> {
    // Test implementation
  }

  protected override async getPriceImpl(
    _tokenMint: string,
  ): Promise<PriceData> {
    return {
      price: 1.0,
      timestamp: Date.now(),
      confidence: 1,
    };
  }

  protected override async getOrderBookImpl(
    _tokenMint: string,
    _limit: number,
  ): Promise<MarketDepth> {
    return {
      bids: [[1.0, 1.0]],
      asks: [[1.1, 1.0]],
      timestamp: Date.now(),
    };
  }

  protected override async getOHLCVImpl(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<OHLCVData> {
    const now = Date.now();
    return {
      open: 1.0,
      high: 1.1,
      low: 0.9,
      close: 1.0,
      volume: 1000,
      timestamp: now,
    };
  }

  public override getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: true,
      canGetOHLCV: true,
      canGetOrderBook: true,
    };
  }
}

describe("Base Provider", () => {
  let provider: TestProvider;
  let mockLogger: ManagedLoggingService;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      getName: () => "test-logger",
      getStatus: () => ServiceStatus.RUNNING,
      start: vi.fn(),
      stop: vi.fn(),
    } as unknown as ManagedLoggingService;

    provider = new TestProvider(
      {
        name: "test-provider",
        version: "1.0.0",
      },
      mockLogger,
    );
  });

  describe("Service Lifecycle", () => {
    it("should start correctly", async () => {
      expect(provider.getStatus()).toBe(ServiceStatus.PENDING);
      await provider.start();
      expect(provider.getStatus()).toBe(ServiceStatus.RUNNING);
    });

    it("should stop correctly", async () => {
      await provider.start();
      await provider.stop();
      expect(provider.getStatus()).toBe(ServiceStatus.STOPPED);
    });
  });

  describe("Provider Operations", () => {
    beforeEach(async () => {
      await provider.start();
    });

    it("should get price", async () => {
      const price = await provider.getPrice("test-token");
      expect(price).toEqual({
        price: 1.0,
        timestamp: expect.any(Number),
        confidence: 1,
      });
    });

    it("should get order book", async () => {
      const orderBook = await provider.getOrderBook("test-token");
      expect(orderBook).toEqual({
        bids: [[1.0, 1.0]],
        asks: [[1.1, 1.0]],
        timestamp: expect.any(Number),
      });
    });

    it("should get OHLCV data", async () => {
      const ohlcv = await provider.getOHLCV("test-token", 3600, 100);
      expect(ohlcv).toEqual({
        open: 1.0,
        high: 1.1,
        low: 0.9,
        close: 1.0,
        volume: 1000,
        timestamp: expect.any(Number),
      });
    });
  });
});
