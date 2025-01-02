/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/providers/__tests__/raydium.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../core/managed-logging";
import { RaydiumProvider } from "../raydium.provider";
import { ServiceStatus } from "../../core/service.manager";

describe("Raydium Provider", () => {
  let provider: RaydiumProvider;
  let mockLogger: ManagedLoggingService;
  let mockConnection: Connection;

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

    mockConnection = {
      getSlot: vi.fn().mockResolvedValue(1),
    } as unknown as Connection;

    provider = new RaydiumProvider(
      {
        name: "raydium-provider",
        version: "1.0.0",
      },
      mockLogger,
      mockConnection,
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

    it("should throw not implemented for price", async () => {
      await expect(provider.getPrice("test-token")).rejects.toThrow(
        "Not implemented",
      );
    });

    it("should throw not implemented for order book", async () => {
      await expect(provider.getOrderBook("test-token")).rejects.toThrow(
        "Not implemented",
      );
    });

    it("should throw not implemented for OHLCV", async () => {
      await expect(provider.getOHLCV("test-token", 3600, 100)).rejects.toThrow(
        "Not implemented",
      );
    });
  });
});
