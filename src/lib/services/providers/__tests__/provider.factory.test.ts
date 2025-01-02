/**
 * @file Tests for provider factory
 * @version 1.0.0
 * @description Test suite for provider factory implementation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../core/managed-logging";
import { ProviderFactory, ProviderType } from "../provider.factory";
import { ServiceStatus } from "../../core/service.manager";

describe("Provider Factory", () => {
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

    // Clear the providers map before each test
    (ProviderFactory as any).providers.clear();
  });

  describe("Provider Creation", () => {
    it("should create Jupiter provider", () => {
      const provider = ProviderFactory.getProvider(ProviderType.JUPITER, mockLogger, mockConnection);
      expect(provider).toBeDefined();
      expect(provider.getCapabilities().canGetPrice).toBe(true);
    });

    it("should create Raydium provider", () => {
      const provider = ProviderFactory.getProvider(ProviderType.RAYDIUM, mockLogger, mockConnection);
      expect(provider).toBeDefined();
      expect(provider.getCapabilities().canGetPrice).toBe(true);
    });

    it("should throw for unknown provider type", () => {
      expect(() => 
        ProviderFactory.getProvider("unknown" as ProviderType, mockLogger, mockConnection)
      ).toThrow("Unknown provider type");
    });
  });

  describe("Provider Caching", () => {
    it("should reuse existing provider instances", () => {
      const provider1 = ProviderFactory.getProvider(ProviderType.JUPITER, mockLogger, mockConnection);
      const provider2 = ProviderFactory.getProvider(ProviderType.JUPITER, mockLogger, mockConnection);
      expect(provider1).toBe(provider2);
    });

    it("should create separate instances for different types", () => {
      const jupiterProvider = ProviderFactory.getProvider(ProviderType.JUPITER, mockLogger, mockConnection);
      const raydiumProvider = ProviderFactory.getProvider(ProviderType.RAYDIUM, mockLogger, mockConnection);
      expect(jupiterProvider).not.toBe(raydiumProvider);
    });
  });
});
