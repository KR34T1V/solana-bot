/**
 * @file Managed Token Sniper Tests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ManagedTokenSniper } from "./managed-token-sniper";
import { ServiceStatus } from "../core/service.manager";
import type { SniperConfig } from "./types";

// Mock web3 connection
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation(() => ({
    onProgramAccountChange: vi.fn().mockReturnValue(1),
    removeProgramAccountChangeListener: vi.fn(),
    getAccountInfo: vi.fn().mockResolvedValue({
      data: Buffer.from("mock-data"),
      owner: "mock-owner",
    }),
  })),
  PublicKey: vi.fn().mockImplementation((key: string) => ({
    toString: () => key,
    toBase58: () => key,
  })),
}));

// Mock provider factory
vi.mock("../providers/provider.factory", () => ({
  ProviderFactory: {
    create: vi.fn().mockImplementation(() => ({
      getPrice: vi.fn().mockResolvedValue(1.0),
      getLiquidity: vi.fn().mockResolvedValue({
        sol: 1000,
        token: 500000,
        price: 0.002,
      }),
      validatePool: vi.fn().mockResolvedValue(true),
      executeTrade: vi.fn().mockResolvedValue({
        txHash: "mock-tx-hash",
        status: "success",
      }),
    })),
  },
  ProviderType: {
    RAYDIUM: "raydium",
    JUPITER: "jupiter",
  },
}));

// Mock logger
vi.mock("../logging.service", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("ManagedTokenSniper", () => {
  let sniper: ManagedTokenSniper;
  let config: SniperConfig;

  beforeEach(() => {
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

    sniper = new ManagedTokenSniper(config);
  });

  describe("Service Interface", () => {
    it("should implement Service interface correctly", () => {
      expect(sniper.getName()).toBe("token-sniper");
      expect(sniper.getStatus()).toBe(ServiceStatus.PENDING);
      expect(typeof sniper.start).toBe("function");
      expect(typeof sniper.stop).toBe("function");
    });

    it("should start service successfully", async () => {
      await sniper.start();
      expect(sniper.getStatus()).toBe(ServiceStatus.RUNNING);
    });

    it("should stop service successfully", async () => {
      await sniper.start();
      await sniper.stop();
      expect(sniper.getStatus()).toBe(ServiceStatus.STOPPED);
    });

    it("should handle start errors correctly", async () => {
      const mockConnection = {
        onProgramAccountChange: vi.fn().mockImplementation(() => {
          throw new Error("Connection error");
        }),
      };
      vi.spyOn(sniper as any, "connection", "get").mockReturnValue(
        mockConnection,
      );

      await expect(sniper.start()).rejects.toThrow("Connection error");
      expect(sniper.getStatus()).toBe(ServiceStatus.ERROR);
    });

    it("should handle stop errors correctly", async () => {
      const mockConnection = {
        onProgramAccountChange: vi.fn().mockReturnValue(1),
        removeProgramAccountChangeListener: vi.fn().mockImplementation(() => {
          throw new Error("Cleanup error");
        }),
      };
      vi.spyOn(sniper as any, "connection", "get").mockReturnValue(
        mockConnection,
      );

      await sniper.start();
      await expect(sniper.stop()).rejects.toThrow("Cleanup error");
      expect(sniper.getStatus()).toBe(ServiceStatus.ERROR);
    });
  });

  describe("Performance Metrics", () => {
    it("should return default metrics for no trades", () => {
      const metrics = sniper.getPerformanceMetrics();
      expect(metrics.winRate).toBe(0);
      expect(metrics.averageReturn).toBe(0);
      expect(metrics.riskRewardRatio).toBe(0);
      expect(metrics.maxDrawdown).toBe(0);
    });
  });

  describe("System Status", () => {
    it("should return correct system status", async () => {
      await sniper.start();
      const status = sniper.getSystemStatus();
      expect(status.isActive).toBe(true);
      expect(status.isPaused).toBe(false);
      expect(status.isCircuitBroken).toBe(false);
      expect(status.errors.count).toBe(0);
      expect(status.performance.successRate).toBe(1);
    });
  });
});
