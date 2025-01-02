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
});
