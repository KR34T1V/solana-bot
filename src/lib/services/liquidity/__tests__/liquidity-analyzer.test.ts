/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/liquidity/__tests__/liquidity-analyzer.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../core/managed-logging";
import { ServiceStatus } from "../../core/service.manager";
import { LiquidityAnalyzer, LiquidityWarningType } from "../liquidity-analyzer";
import type { TokenBalances } from "../types";

describe("Liquidity Analyzer", () => {
  let analyzer: LiquidityAnalyzer;
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

    analyzer = new LiquidityAnalyzer(mockConnection, mockLogger);
  });

  describe("Token Distribution Analysis", () => {
    it("should calculate Gini coefficient and top holder percentage", () => {
      const mockBalances: TokenBalances = {
        mint: "token" as any,
        holders: [
          { address: "holder1" as any, balance: BigInt(1000), percentage: 50 },
          { address: "holder2" as any, balance: BigInt(500), percentage: 25 },
          { address: "holder3" as any, balance: BigInt(500), percentage: 25 },
        ],
        totalSupply: BigInt(2000),
      };

      const result = (analyzer as any).analyzeTokenDistribution(mockBalances);

      expect(result).toEqual({
        gini: expect.any(Number),
        top10Percentage: expect.any(Number),
        holderCount: 3,
      });
      expect(result.gini).toBeGreaterThan(0);
      expect(result.gini).toBeLessThan(1);
      expect(result.top10Percentage).toBe(100);
    });

    it("should handle empty holder list", () => {
      const mockBalances: TokenBalances = {
        mint: "token" as any,
        holders: [],
        totalSupply: BigInt(0),
      };

      const result = (analyzer as any).analyzeTokenDistribution(mockBalances);

      expect(result).toEqual({
        gini: 0,
        top10Percentage: 0,
        holderCount: 0,
      });
    });

    it("should handle single holder", () => {
      const mockBalances: TokenBalances = {
        mint: "token" as any,
        holders: [
          { address: "holder1" as any, balance: BigInt(1000), percentage: 100 },
        ],
        totalSupply: BigInt(1000),
      };

      const result = (analyzer as any).analyzeTokenDistribution(mockBalances);

      expect(result).toEqual({
        gini: 0,
        top10Percentage: 100,
        holderCount: 1,
      });
    });
  });

  describe("Event Emission", () => {
    it("should emit analysis events", () => {
      const mockAnalysis = {
        pool: {
          poolAddress: "pool",
          tokenMint: "token",
          baseTokenMint: "base",
          liquidity: {
            tokenAmount: 1000,
            baseTokenAmount: 1000,
            usdValue: 2000,
            priceImpact: {
              percentageIn: 1,
              percentageOut: 1,
              slippage: 1,
              depth: [],
            },
            distribution: null,
          },
          lpTokens: {
            totalSupply: 1000,
            locked: 800,
            lockDuration: 15552000,
          },
          creatorInfo: {
            address: "creator",
            tokenBalance: 100,
            percentageOwned: 10,
            verificationStatus: "VERIFIED",
          },
          timestamp: Date.now(),
        },
        riskScore: 20,
        warnings: [],
        confidence: 0.8,
      };

      const listener = vi.fn();
      analyzer.on("analysis", listener);
      analyzer.emit("analysis", mockAnalysis);

      expect(listener).toHaveBeenCalledWith(mockAnalysis);
    });

    it("should emit warning events", () => {
      const mockWarning = {
        type: LiquidityWarningType.LOW_LIQUIDITY,
        severity: "high" as const,
        details: "Low liquidity detected",
      };

      const listener = vi.fn();
      analyzer.on("warning", listener);
      analyzer.emit("warning", mockWarning);

      expect(listener).toHaveBeenCalledWith(mockWarning);
    });

    it("should emit error events", () => {
      const mockError = new Error("Test error");

      const listener = vi.fn();
      analyzer.on("error", listener);
      analyzer.emit("error", mockError);

      expect(listener).toHaveBeenCalledWith(mockError);
    });
  });
});
