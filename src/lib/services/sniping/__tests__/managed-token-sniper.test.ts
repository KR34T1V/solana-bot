/**
 * @file Managed Token Sniper Tests
 * @version 1.0.0
 */

// Mock modules must be defined before any imports
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn(() => ({
    onProgramAccountChange: vi.fn(() => 123),
    removeProgramAccountChangeListener: vi.fn(),
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
  })),
}));

vi.mock("../../logging.service", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../providers/provider.factory", () => ({
  ProviderFactory: {
    getProvider: vi.fn(() => ({
      getPrice: vi.fn().mockResolvedValue({
        price: 1.0,
        timestamp: Date.now(),
        confidence: 0.95,
      }),
      getOrderBook: vi.fn().mockResolvedValue({
        bids: [[1.0, 1000]],
        asks: [[1.1, 1000]],
        timestamp: Date.now(),
      }),
    })),
  },
  ProviderType: {
    JUPITER: "jupiter",
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection } from "@solana/web3.js";
import { ManagedTokenSniper } from "../managed/token-sniper";
import type {
  TokenValidation,
  EntryConditions,
  RiskParameters,
} from "../types";
import { logger } from "../../logging.service";

interface SniperConfig {
  validation: TokenValidation;
  entry: EntryConditions;
  risk: RiskParameters;
}

describe("ManagedTokenSniper", () => {
  let sniper: ManagedTokenSniper;
  let mockConnection: Connection;
  let config: SniperConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection = new Connection("https://api.mainnet-beta.solana.com");
    config = {
      validation: {
        creatorWalletAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        creatorTransactions: 100,
        creatorLiquidity: 10,
        initialLiquidity: 25,
      },
      entry: {
        minLiquidity: 25,
        maxMintAge: 5 * 60 * 1000, // 5 minutes
        maxPriceImpact: 0.02,
        minHolders: 10,
        maxTaxRate: 0.05,
        minDEXPairs: 2,
      },
      risk: {
        maxPositionSize: 0.02,
        maxDailyExposure: 0.1,
        stopLossLevel: 0.07,
        profitTargets: {
          quick: 0.2,
          target: 0.5,
          moon: 1.0,
        },
      },
    };
    sniper = new ManagedTokenSniper(config, mockConnection);
  });

  describe("Service Interface", () => {
    it("should implement Service interface correctly", () => {
      expect(sniper.start).toBeDefined();
      expect(sniper.stop).toBeDefined();
      expect(sniper.getStatus).toBeDefined();
      expect(sniper.getPerformanceMetrics).toBeDefined();
    });

    it("should start service successfully", async () => {
      await sniper.start();
      expect(mockConnection.onProgramAccountChange).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Starting token monitoring...");
    });

    it("should stop service successfully", async () => {
      await sniper.start();
      await sniper.stop();
      expect(
        mockConnection.removeProgramAccountChangeListener,
      ).toHaveBeenCalledWith(123);
    });

    it("should handle start errors correctly", async () => {
      vi.mocked(mockConnection.onProgramAccountChange).mockImplementationOnce(
        () => {
          throw new Error("Failed to start");
        },
      );

      await expect(sniper.start()).rejects.toThrow("Failed to start");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle stop errors correctly", async () => {
      vi.mocked(
        mockConnection.removeProgramAccountChangeListener,
      ).mockImplementationOnce(() => {
        throw new Error("Failed to stop");
      });

      await sniper.start();
      await expect(sniper.stop()).rejects.toThrow("Failed to stop");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("Performance Metrics", () => {
    it("should return correct performance metrics", () => {
      const metrics = sniper.getPerformanceMetrics();
      expect(metrics).toEqual({
        winRate: 0,
        averageReturn: 0,
        riskRewardRatio: 0,
        maxDrawdown: 0,
      });
    });
  });

  describe("System Status", () => {
    it("should return correct system status", async () => {
      await sniper.start();
      const status = sniper.getSystemStatus();
      expect(status).toEqual({
        isActive: true,
        isPaused: false,
        isCircuitBroken: false,
        errors: {
          count: 0,
          lastError: undefined,
        },
        performance: {
          latency: 0,
          successRate: 1,
          uptime: expect.any(Number),
        },
      });
    });
  });
});
