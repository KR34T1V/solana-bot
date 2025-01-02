/**
 * @file Managed Token Sniper Tests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ManagedTokenSniper } from "../managed-token-sniper";
import { ServiceStatus } from "../../service.manager";
import {
  ProviderFactory,
  ProviderType,
} from "../../providers/provider.factory";
import type {
  TokenValidation,
  EntryConditions,
  RiskParameters,
} from "../types";

// Mock web3 connection
vi.mock("@solana/web3.js", () => {
  const mockGetAccountInfo = vi.fn();
  const mockGetSignaturesForAddress = vi.fn();
  const mockRemoveProgramAccountChangeListener = vi.fn();

  mockGetAccountInfo.mockImplementation((pubkey) => {
    if (pubkey.toString() === "new-creator-address") {
      return Promise.resolve({
        lamports: 1 * 1e9, // 1 SOL
      });
    }
    return Promise.resolve({
      lamports: 15 * 1e9, // 15 SOL
    });
  });

  mockGetSignaturesForAddress.mockImplementation((pubkey) => {
    if (pubkey.toString() === "new-creator-address") {
      return Promise.resolve(
        Array.from({ length: 10 }, (_, i) => ({
          blockTime:
            Math.floor((Date.now() - 1 * 24 * 60 * 60 * 1000) / 1000) - i,
        })),
      );
    }
    return Promise.resolve(
      Array.from({ length: 150 }, (_, i) => ({
        blockTime:
          Math.floor((Date.now() - 40 * 24 * 60 * 60 * 1000) / 1000) - i,
      })),
    );
  });

  return {
    Connection: vi.fn(() => ({
      onAccountChange: vi.fn(),
      onProgramAccountChange: vi.fn().mockReturnValue(1), // Return subscription ID
      getProgramAccounts: vi.fn(),
      getAccountInfo: mockGetAccountInfo,
      getSignaturesForAddress: mockGetSignaturesForAddress,
      removeProgramAccountChangeListener:
        mockRemoveProgramAccountChangeListener,
    })),
    PublicKey: vi.fn().mockImplementation((key) => ({
      toString: () => key,
      toBase58: () => key,
      equals: (other: any) => key === other.toString(),
    })),
  };
});

// Mock providers
vi.mock("../../providers/provider.factory", () => {
  const mockGetOrderBook = vi.fn();
  const mockGetPrice = vi.fn();

  // Default order book (healthy)
  const healthyOrderBook = {
    bids: [
      [1.98, 1000],
      [1.97, 2000],
      [1.96, 3000],
    ],
    asks: [
      [2.02, 1000],
      [2.03, 2000],
      [2.04, 3000],
    ],
    timestamp: Date.now(),
  };

  // Low liquidity order book
  const lowLiquidityOrderBook = {
    bids: [
      [1.98, 10],
      [1.97, 5],
      [1.96, 5],
    ],
    asks: [
      [2.02, 10],
      [2.03, 5],
      [2.04, 5],
    ],
    timestamp: Date.now(),
  };

  // Honeypot order book (large spread and low liquidity)
  const honeypotOrderBook = {
    bids: [
      [1.0, 10],
      [0.9, 5],
      [0.8, 5],
    ],
    asks: [
      [2.0, 10],
      [2.1, 5],
      [2.2, 5],
    ],
    timestamp: Date.now(),
  };

  mockGetOrderBook.mockImplementation((mint) => {
    if (mint === "low-liq-token") {
      return Promise.resolve(lowLiquidityOrderBook);
    }
    if (mint === "suspicious-token") {
      return Promise.resolve(honeypotOrderBook);
    }
    return Promise.resolve(healthyOrderBook);
  });

  mockGetPrice.mockResolvedValue({
    price: 2.0,
    timestamp: Date.now(),
    confidence: 0.95,
  });

  return {
    ProviderType: {
      JUPITER: "jupiter",
    },
    ProviderFactory: {
      getProvider: vi.fn().mockReturnValue({
        getPrice: mockGetPrice,
        getOrderBook: mockGetOrderBook,
      }),
    },
  };
});

describe("ManagedTokenSniper", () => {
  let sniper: ManagedTokenSniper;
  const mockConfig = {
    validation: {
      creatorWalletAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      creatorTransactions: 100,
      creatorLiquidity: 10, // 10 SOL
      initialLiquidity: 25, // 25 SOL
    } as TokenValidation,
    entry: {
      minLiquidity: 25,
      maxMintAge: 5 * 60 * 1000, // 5 minutes
      maxPriceImpact: 0.02, // 2%
      minHolders: 10,
      maxTaxRate: 0.05, // 5%
      minDEXPairs: 2,
    } as EntryConditions,
    risk: {
      maxPositionSize: 0.02, // 2% of portfolio
      maxDailyExposure: 0.1, // 10% of portfolio
      stopLossLevel: 0.07, // 7% stop loss
      profitTargets: {
        quick: 0.2, // 20%
        target: 0.5, // 50%
        moon: 1.0, // 100%
      },
    } as RiskParameters,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sniper = new ManagedTokenSniper(mockConfig);
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
      const connection = (sniper as any).connection;
      connection.onProgramAccountChange.mockImplementationOnce(() => {
        throw new Error("Connection error");
      });

      await expect(sniper.start()).rejects.toThrow("Connection error");
      expect(sniper.getStatus()).toBe(ServiceStatus.ERROR);
    });

    it("should cleanup subscription on stop", async () => {
      const connection = (sniper as any).connection;
      await sniper.start();
      await sniper.stop();

      expect(
        connection.removeProgramAccountChangeListener,
      ).toHaveBeenCalledWith(1);
    });
  });

  describe("Token Discovery", () => {
    it("should detect new token mints", async () => {
      const mockMint = {
        address: "mock-mint-address",
        timestamp: Date.now(),
      };

      await sniper.start();
      await sniper.onNewTokenMint(mockMint);

      expect(sniper.getDetectedTokens()).toContain(mockMint.address);
    });

    it("should filter out tokens older than maxMintAge", async () => {
      const oldMint = {
        address: "old-mint-address",
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes old
      };

      await sniper.onNewTokenMint(oldMint);
      expect(sniper.getDetectedTokens()).not.toContain(oldMint.address);
    });
  });

  describe("Safety Checks", () => {
    it("should detect honeypot tokens", async () => {
      const mockToken = {
        mint: "suspicious-token",
        transferDelay: 1000,
        sellTax: 0.2,
        buyTax: 0.1,
      };

      const safety = await sniper.checkTokenSafety(mockToken.mint);
      expect(safety.isHoneypot).toBe(true);
    });

    it("should verify liquidity locks", async () => {
      const mockToken = {
        mint: "token-mint",
        liquidityLock: {
          duration: 180 * 24 * 60 * 60, // 180 days
          amount: 25,
        },
      };

      const lockCheck = await sniper.verifyLiquidityLock(mockToken.mint);
      expect(lockCheck.isLocked).toBe(true);
      expect(lockCheck.lockDuration).toBeGreaterThan(90 * 24 * 60 * 60); // > 90 days
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

  describe("Error Handling", () => {
    it("should handle token analysis errors", async () => {
      const mockMint = {
        address: "error-token",
        timestamp: Date.now(),
      };

      const provider = ProviderFactory.getProvider(ProviderType.JUPITER);
      (provider.getPrice as Mock).mockRejectedValueOnce(new Error("API error"));

      await sniper.onNewTokenMint(mockMint);
      expect(sniper.getStatus()).toBe(ServiceStatus.PENDING);
    });

    it("should trigger circuit breaker on multiple errors", async () => {
      const provider = ProviderFactory.getProvider(ProviderType.JUPITER);
      (provider.getPrice as Mock).mockRejectedValue(new Error("API error"));

      for (let i = 0; i < 5; i++) {
        await sniper.onNewTokenMint({
          address: `error-token-${i}`,
          timestamp: Date.now(),
        });
      }

      expect(sniper.getStatus()).toBe(ServiceStatus.ERROR);
    });
  });
});
