import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Connection } from "@solana/web3.js";
import {
  LiquidityAnalyzer,
  type LiquidityConfig,
  type PoolInfo,
  LiquidityWarningType,
} from "../liquidity-analyzer";
import { logger } from "../../logging.service";

// Mock the logger
vi.mock("../../logging.service", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LiquidityAnalyzer", () => {
  let analyzer: LiquidityAnalyzer;
  let connection: Connection;

  const defaultConfig: LiquidityConfig = {
    minLiquidityUSD: 10000,
    maxInitialMCap: 1000000,
    minLPTokenLocked: 80,
    maxCreatorTokens: 20,
    monitorDuration: 3600000,
    suspiciousChanges: {
      maxLiquidityRemoval: 20,
      minTimelock: 15552000,
    },
  };

  // Sample pool data for testing
  const mockPoolAddress = "DxPf9pCq6jX9cXFvxrr77k8PmwBFYkCxwUXtpkR4VY8F";
  const mockTokenMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const mockBaseTokenMint = "So11111111111111111111111111111111111111112"; // SOL

  const mockPoolInfo: PoolInfo = {
    poolAddress: mockPoolAddress,
    tokenMint: mockTokenMint,
    baseTokenMint: mockBaseTokenMint,
    liquidity: {
      tokenAmount: 1000000,
      baseTokenAmount: 100,
      usdValue: 50000, // $50k liquidity
    },
    lpTokens: {
      totalSupply: 1000,
      locked: 900, // 90% locked
      lockDuration: 15552000, // 180 days
    },
    creatorInfo: {
      address: "Cre8or11111111111111111111111111111111111111",
      tokenBalance: 100000,
      percentageOwned: 10, // 10% owned by creator
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    connection = {
      onLogs: vi.fn(),
      removeOnLogsListener: vi.fn(),
      getParsedAccountInfo: vi.fn(),
    } as unknown as Connection;

    analyzer = new LiquidityAnalyzer(connection, defaultConfig);

    // Mock getPoolInfo to return our test data
    vi.spyOn(analyzer as any, "getPoolInfo").mockResolvedValue(mockPoolInfo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("pool monitoring", () => {
    it("should start monitoring a new pool", async () => {
      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      expect(onAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          pool: expect.objectContaining({
            poolAddress: mockPoolAddress,
            tokenMint: mockTokenMint,
          }),
          riskScore: expect.any(Number),
          warnings: expect.any(Array),
          confidence: expect.any(Number),
        }),
      );
    });

    it("should not start monitoring if pool is already monitored", async () => {
      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );
      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        "Pool is already being monitored:",
        { poolAddress: mockPoolAddress },
      );
    });

    it("should stop monitoring after duration", async () => {
      vi.useFakeTimers();

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      // Fast forward past monitor duration
      vi.advanceTimersByTime(defaultConfig.monitorDuration + 1000);

      expect(logger.info).toHaveBeenCalledWith("Stopped monitoring pool:", {
        poolAddress: mockPoolAddress,
      });

      vi.useRealTimers();
    });
  });

  describe("risk analysis", () => {
    it("should detect low liquidity", async () => {
      const lowLiquidityPool: PoolInfo = {
        ...mockPoolInfo,
        liquidity: {
          ...mockPoolInfo.liquidity,
          usdValue: 5000, // Below minimum
        },
      };

      vi.spyOn(analyzer as any, "getPoolInfo").mockResolvedValue(
        lowLiquidityPool,
      );

      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      expect(onAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.objectContaining({
              type: LiquidityWarningType.LOW_LIQUIDITY,
              severity: "high",
            }),
          ]),
        }),
      );
    });

    it("should detect low LP token lock", async () => {
      const lowLockPool: PoolInfo = {
        ...mockPoolInfo,
        lpTokens: {
          ...mockPoolInfo.lpTokens,
          locked: 500, // 50% locked, below minimum
        },
      };

      vi.spyOn(analyzer as any, "getPoolInfo").mockResolvedValue(lowLockPool);

      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      expect(onAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.objectContaining({
              type: LiquidityWarningType.LOW_LP_LOCKED,
              severity: "high",
            }),
          ]),
        }),
      );
    });

    it("should detect high creator ownership", async () => {
      const highOwnershipPool: PoolInfo = {
        ...mockPoolInfo,
        creatorInfo: {
          ...mockPoolInfo.creatorInfo,
          percentageOwned: 30, // Above maximum
        },
      };

      vi.spyOn(analyzer as any, "getPoolInfo").mockResolvedValue(
        highOwnershipPool,
      );

      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      expect(onAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.objectContaining({
              type: LiquidityWarningType.HIGH_CREATOR_OWNERSHIP,
              severity: "medium",
            }),
          ]),
        }),
      );
    });
  });

  describe("confidence calculation", () => {
    it("should have high confidence for good pools", async () => {
      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      const result = onAnalysis.mock.calls[0][0];
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should have low confidence for suspicious pools", async () => {
      const suspiciousPool: PoolInfo = {
        ...mockPoolInfo,
        liquidity: {
          ...mockPoolInfo.liquidity,
          usdValue: 5000,
        },
        lpTokens: {
          ...mockPoolInfo.lpTokens,
          locked: 400,
        },
        creatorInfo: {
          ...mockPoolInfo.creatorInfo,
          percentageOwned: 40,
        },
      };

      vi.spyOn(analyzer as any, "getPoolInfo").mockResolvedValue(
        suspiciousPool,
      );

      const onAnalysis = vi.fn();
      analyzer.on("analysis", onAnalysis);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      const result = onAnalysis.mock.calls[0][0];
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe("error handling", () => {
    it("should handle pool analysis errors", async () => {
      const error = new Error("Failed to analyze pool");
      vi.spyOn(analyzer as any, "getPoolInfo").mockRejectedValue(error);

      const onError = vi.fn();
      analyzer.on("error", onError);

      await expect(
        analyzer.startPoolAnalysis(
          mockPoolAddress,
          mockTokenMint,
          mockBaseTokenMint,
        ),
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to start pool analysis:",
        { error: "Failed to analyze pool", poolAddress: mockPoolAddress },
      );
    });

    it("should handle monitoring errors gracefully", async () => {
      vi.useFakeTimers();

      // First call succeeds, subsequent calls fail
      vi.spyOn(analyzer as any, "getPoolInfo")
        .mockResolvedValueOnce(mockPoolInfo)
        .mockRejectedValue(new Error("Monitoring error"));

      const onError = vi.fn();
      analyzer.on("error", onError);

      await analyzer.startPoolAnalysis(
        mockPoolAddress,
        mockTokenMint,
        mockBaseTokenMint,
      );

      // Wait for the next monitoring interval
      await vi.advanceTimersByTimeAsync(30000);

      expect(logger.error).toHaveBeenCalledWith("Error monitoring pool:", {
        error: "Monitoring error",
        poolAddress: mockPoolAddress,
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));

      vi.useRealTimers();
    });
  });
});
