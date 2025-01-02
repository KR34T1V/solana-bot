import { describe, it, expect, vi, beforeEach } from "vitest";
import { RaydiumProvider } from "../raydium.provider";
import {
  Liquidity,
  type LiquidityPoolInfo,
  type TokenAmount,
  type Price,
  type Percent,
  type CurrencyAmount,
} from "@raydium-io/raydium-sdk";
import type { MarketDepth } from "$lib/types/provider";
import axios, { type AxiosInstance } from "axios";

// Mock external dependencies
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn(),
}));

vi.mock("@raydium-io/raydium-sdk", () => ({
  Liquidity: {
    fetchInfo: vi.fn(),
    computeAmountOut: vi.fn(),
  },
  Token: vi.fn(),
  TokenAmount: vi.fn(),
}));

vi.mock("axios");

describe("RaydiumProvider", () => {
  let provider: RaydiumProvider;
  const mockTokenMint = "TokenMintAddress123";

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new RaydiumProvider();
  });

  describe("getPrice", () => {
    it("should fetch and return price data for a token", async () => {
      // Mock axios response for pool data
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 2000,
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [mockPool] }),
      } as unknown as AxiosInstance);

      // Mock SDK responses
      const mockPoolInfo: LiquidityPoolInfo = {
        status: true,
        baseDecimals: 9,
        quoteDecimals: 6,
        lpDecimals: 9,
        baseReserve: "1000000000",
        quoteReserve: "2000000",
        lpSupply: "1414213562",
        startTime: Date.now(),
      };

      vi.mocked(Liquidity.fetchInfo).mockResolvedValue(mockPoolInfo);

      const mockAmountOut = {
        toFixed: () => "2.5",
        token: {} as any,
        add: vi.fn(),
        subtract: vi.fn(),
        currency: {} as any,
        toSignificant: vi.fn(),
      } as unknown as TokenAmount;

      const mockPrice = {
        numerator: BigInt(1),
        denominator: BigInt(1),
        toSignificant: vi.fn(),
        toFixed: vi.fn(),
      } as unknown as Price;

      const mockPercent = {
        numerator: BigInt(1),
        denominator: BigInt(100),
        toSignificant: vi.fn(),
        toFixed: vi.fn(),
      } as unknown as Percent;

      vi.mocked(Liquidity.computeAmountOut).mockResolvedValue({
        amountOut: mockAmountOut,
        minAmountOut: mockAmountOut,
        currentPrice: mockPrice,
        executionPrice: mockPrice,
        priceImpact: mockPercent,
        fee: mockAmountOut as CurrencyAmount,
      });

      const result = await provider.getPrice(mockTokenMint);

      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should throw error when no pool is found", async () => {
      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [] }),
      } as unknown as AxiosInstance);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow();
    });
  });

  describe("getOrderBook", () => {
    it("should return market depth data for v3 pools", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        version: 3,
      };

      const mockPositions = {
        data: {
          positions: [
            { price: 1.0, liquidity: 1000 },
            { price: 1.1, liquidity: 2000 },
          ],
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce(mockPositions),
      } as unknown as AxiosInstance);

      const result = await provider.getOrderBook(mockTokenMint);

      expect(result).toBeDefined();
      expect(result.bids).toBeDefined();
      expect(result.asks).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("should return market depth data for v2 pools", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        version: 2,
        marketId: "market1",
      };

      const mockMarketData = {
        data: {
          bids: [[1.0, 1000]],
          asks: [[1.1, 2000]],
        },
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce(mockMarketData),
      } as unknown as AxiosInstance);

      const result = await provider.getOrderBook(mockTokenMint);

      expect(result).toBeDefined();
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getLiquidityInfo", () => {
    it("should return liquidity information for a pool", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 2000,
        lpSupply: 1414, // sqrt(1000 * 2000)
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [mockPool] }),
      } as unknown as AxiosInstance);

      const result = await provider.getLiquidityInfo(mockTokenMint);

      expect(result).toBeDefined();
      expect(result?.poolId).toBe(mockPool.id);
      expect(result?.baseSize).toBe(mockPool.baseReserve);
      expect(result?.quoteSize).toBe(mockPool.quoteReserve);
      expect(result?.version).toBe(mockPool.version);
      expect(result?.lpRatio).toBeDefined();
    });

    it("should return null when no pool is found", async () => {
      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [] }),
      } as unknown as AxiosInstance);

      const result = await provider.getLiquidityInfo(mockTokenMint);
      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error("API Error")),
      } as unknown as AxiosInstance);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow();
      await expect(provider.getOrderBook(mockTokenMint)).rejects.toThrow();
      const liquidityResult = await provider.getLiquidityInfo(mockTokenMint);
      expect(liquidityResult).toBeNull();
    });
  });

  describe("getPoolKeys", () => {
    it("should return V3 pool keys", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        lpMint: "LP_MINT",
        baseDecimals: 9,
        quoteDecimals: 6,
        version: 3,
      };

      const mockV3PoolData = {
        programId: "PROGRAM_ID",
        authority: "AUTHORITY",
        lpDecimals: 9,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce({ data: mockV3PoolData }),
      } as unknown as AxiosInstance);

      const result = await provider.getPrice(mockTokenMint);
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });

    it("should return V2 pool keys", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        lpMint: "LP_MINT",
        baseDecimals: 9,
        quoteDecimals: 6,
        version: 2,
        ammId: "AMM_ID",
        marketId: "MARKET_ID",
      };

      const mockV2PoolData = {
        programId: "PROGRAM_ID",
        authority: "AUTHORITY",
        lpDecimals: 9,
        openOrders: "OPEN_ORDERS",
        targetOrders: "TARGET_ORDERS",
        baseVault: "BASE_VAULT",
        quoteVault: "QUOTE_VAULT",
        withdrawQueue: "WITHDRAW_QUEUE",
        lpVault: "LP_VAULT",
        marketProgramId: "MARKET_PROGRAM_ID",
        marketAuthority: "MARKET_AUTHORITY",
        marketBaseVault: "MARKET_BASE_VAULT",
        marketQuoteVault: "MARKET_QUOTE_VAULT",
        marketBids: "MARKET_BIDS",
        marketAsks: "MARKET_ASKS",
        marketEventQueue: "MARKET_EVENT_QUEUE",
        lookupTableAccount: "LOOKUP_TABLE_ACCOUNT",
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce({ data: mockV2PoolData }),
      } as unknown as AxiosInstance);

      const result = await provider.getPrice(mockTokenMint);
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });

    it("should throw error when V2 pool is missing required data", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        lpMint: "LP_MINT",
        baseDecimals: 9,
        quoteDecimals: 6,
        version: 2, // V2 pool without ammId and marketId
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [mockPool] }),
      } as unknown as AxiosInstance);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        /Missing required V2 pool data/,
      );
    });

    it("should throw error when V2 pool is missing lookupTableAccount", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        lpMint: "LP_MINT",
        baseDecimals: 9,
        quoteDecimals: 6,
        version: 2,
        ammId: "AMM_ID",
        marketId: "MARKET_ID",
      };

      const mockV2PoolData = {
        programId: "PROGRAM_ID",
        authority: "AUTHORITY",
        // Missing lookupTableAccount
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce({ data: mockV2PoolData }),
      } as unknown as AxiosInstance);

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        /Missing lookupTableAccount/,
      );
    });
  });

  describe("transformPositionsToDepth", () => {
    it("should transform position data into order book format", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        version: 3,
      };

      const mockPositions = {
        positions: [
          { price: 1.0, liquidity: 1000, baseAmount: 1000, quoteAmount: 1000 },
          { price: 1.1, liquidity: 2000, baseAmount: 2000, quoteAmount: 2200 },
          { price: 0.9, liquidity: 1500, baseAmount: 1500, quoteAmount: 1350 },
          { price: 1.2, liquidity: 1800, baseAmount: 1800, quoteAmount: 2160 },
        ],
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce({ data: mockPositions }),
      } as unknown as AxiosInstance);

      const result = await provider.getOrderBook(mockTokenMint);

      // Verify basic structure
      expect(result.bids).toBeDefined();
      expect(result.asks).toBeDefined();
      expect(result.bids.length).toBeGreaterThan(0);
      expect(result.asks.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();

      // Verify each bid and ask has correct structure
      result.bids.forEach((bid) => {
        expect(Array.isArray(bid)).toBe(true);
        expect(bid.length).toBe(2);
        expect(typeof bid[0]).toBe("number");
        expect(typeof bid[1]).toBe("number");
      });

      result.asks.forEach((ask) => {
        expect(Array.isArray(ask)).toBe(true);
        expect(ask.length).toBe(2);
        expect(typeof ask[0]).toBe("number");
        expect(typeof ask[1]).toBe("number");
      });

      // Verify ordering
      const isSortedDescending = (arr: MarketDepth["bids"]) => {
        for (let i = 1; i < arr.length; i++) {
          if (arr[i][0] > arr[i - 1][0]) return false;
        }
        return true;
      };

      const isSortedAscending = (arr: MarketDepth["asks"]) => {
        for (let i = 1; i < arr.length; i++) {
          if (arr[i][0] < arr[i - 1][0]) return false;
        }
        return true;
      };

      expect(isSortedDescending(result.bids)).toBe(true);
      expect(isSortedAscending(result.asks)).toBe(true);

      // Verify spread
      if (result.bids.length > 0 && result.asks.length > 0) {
        expect(result.bids[0][0]).toBeLessThan(result.asks[0][0]);
      }
    });

    it("should handle empty position data", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        version: 3,
      };

      const mockPositions = { positions: [] };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [mockPool] })
          .mockResolvedValueOnce({ data: mockPositions }),
      } as unknown as AxiosInstance);

      const result = await provider.getOrderBook(mockTokenMint);
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
    });
  });

  describe("pool caching", () => {
    it("should cache pool data for 10 seconds", async () => {
      const mockPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 2000,
        version: 3,
      };

      const mockApiCall = vi.fn().mockResolvedValue({ data: [mockPool] });
      vi.mocked(axios.create).mockReturnValue({
        get: mockApiCall,
      } as unknown as AxiosInstance);

      // First call should fetch data
      await provider.getPrice(mockTokenMint);
      expect(mockApiCall).toHaveBeenCalledTimes(1);

      // Second immediate call should use cache
      await provider.getPrice(mockTokenMint);
      expect(mockApiCall).toHaveBeenCalledTimes(1);

      // Advance time by 11 seconds
      vi.advanceTimersByTime(11000);

      // Call after cache expiry should fetch new data
      await provider.getPrice(mockTokenMint);
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });
  });

  describe("price confidence calculation", () => {
    it("should calculate higher confidence for balanced pools", async () => {
      const balancedPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 1000,
        version: 3,
      };

      const unbalancedPool = {
        id: "pool2",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 10000,
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi
          .fn()
          .mockResolvedValueOnce({ data: [balancedPool] })
          .mockResolvedValueOnce({ data: [unbalancedPool] }),
      } as unknown as AxiosInstance);

      const balancedResult = await provider.getPrice(mockTokenMint);
      vi.clearAllMocks();
      const unbalancedResult = await provider.getPrice(mockTokenMint);

      expect(balancedResult.confidence).toBeGreaterThan(
        unbalancedResult.confidence,
      );
    });

    it("should cap confidence at 1.0", async () => {
      const perfectPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1000,
        quoteReserve: 1000,
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [perfectPool] }),
      } as unknown as AxiosInstance);

      const result = await provider.getPrice(mockTokenMint);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("liquidity info edge cases", () => {
    it("should handle zero liquidity pools", async () => {
      const zeroLiquidityPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 0,
        quoteReserve: 0,
        lpSupply: 0,
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [zeroLiquidityPool] }),
      } as unknown as AxiosInstance);

      const result = await provider.getLiquidityInfo(mockTokenMint);
      expect(result).toBeDefined();
      expect(result?.lpRatio).toBe(0);
    });

    it("should handle extremely imbalanced pools", async () => {
      const imbalancedPool = {
        id: "pool1",
        baseMint: mockTokenMint,
        quoteMint: "USDC",
        baseReserve: 1,
        quoteReserve: 1000000,
        lpSupply: 1000,
        version: 3,
      };

      vi.mocked(axios.create).mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: [imbalancedPool] }),
      } as unknown as AxiosInstance);

      const result = await provider.getLiquidityInfo(mockTokenMint);
      expect(result).toBeDefined();
      expect(result?.price).toBeGreaterThan(0);
      expect(Number.isFinite(result?.lpRatio)).toBe(true);
    });
  });
});
