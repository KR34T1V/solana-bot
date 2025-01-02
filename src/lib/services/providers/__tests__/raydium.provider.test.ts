import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { PublicKey } from "@solana/web3.js";
import { RaydiumProvider } from "../raydium.provider";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

// Mock external dependencies
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation((endpoint, commitmentOrConfig) => ({
    getAccountInfo: vi.fn(),
    getTokenAccountBalance: vi.fn(),
    getProgramAccounts: vi.fn(),
    endpoint,
    commitment:
      typeof commitmentOrConfig === "string"
        ? commitmentOrConfig
        : commitmentOrConfig?.commitment,
  })),
  PublicKey: vi.fn().mockImplementation((key) => ({
    toString: () => key,
    toBase58: () => key,
    equals: (other: any) => key === other.toString(),
  })),
}));

vi.mock("@raydium-io/raydium-sdk", () => {
  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );

  return {
    TOKEN_PROGRAM_ID,
    Percent: vi.fn().mockImplementation((numerator, denominator) => ({
      numerator,
      denominator,
      toString: () => `${numerator}/${denominator}`,
    })),
    Liquidity: {
      computeAmountOut: vi.fn().mockReturnValue({
        amountOut: { toFixed: () => "2.0" },
        minAmountOut: { toFixed: () => "1.98" },
        currentPrice: { toFixed: () => "2.0" },
        priceImpact: { toFixed: () => "0.01" },
      }),
      fetchInfo: vi.fn().mockResolvedValue({
        status: { toNumber: () => 1 },
        baseReserve: { toNumber: () => 1000 },
        quoteReserve: { toNumber: () => 2000 },
      }),
    },
    Token: vi.fn().mockImplementation((programId, mint, decimals, symbol) => ({
      programId,
      mint,
      decimals,
      symbol,
    })),
    TokenAmount: vi.fn().mockImplementation((token, amount) => ({
      token,
      amount,
      toFixed: () => amount,
    })),
  };
});

// Mock pool data
const mockPool = {
  id: "pool1",
  version: 3,
  baseMint: "TokenMintAddress123",
  quoteMint: "USDC",
  lpMint: "lpMint123",
  baseDecimals: 9,
  quoteDecimals: 6,
  baseReserve: 1000,
  quoteReserve: 2000,
  lpSupply: 1414,
  status: 1,
  price: "2.0",
  lookupTableAccount: "lookupTable123",
  marketProgramId: "marketProgramId123",
  marketId: "marketId123",
  marketBaseVault: "baseVault123",
  marketQuoteVault: "quoteVault123",
  marketBids: "bids123",
  marketAsks: "asks123",
  marketEventQueue: "eventQueue123",
};

describe("RaydiumProvider", () => {
  let provider: RaydiumProvider;
  const mockTokenMint = "TokenMintAddress123";
  let axiosGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup axios mock
    axiosGet = vi.fn().mockImplementation((url) => {
      if (url.includes("ammV3/ammPools")) {
        return Promise.resolve({
          data: [mockPool],
          success: true,
        });
      }
      if (url.includes("main/pairs")) {
        return Promise.resolve({
          data: {
            official: [{ ...mockPool, version: 2 }],
            success: true,
          },
        });
      }
      if (url.includes("ammV3/pool/")) {
        return Promise.resolve({
          data: {
            ...mockPool,
            success: true,
            programId: "programId123",
            authority: "authority123",
            lpDecimals: 9,
          },
        });
      }
      if (url.includes("ammV3/positionLine")) {
        return Promise.resolve({
          data: {
            positions: [
              {
                price: 1.0,
                liquidity: 1000,
                baseAmount: 1000,
                quoteAmount: 1000,
              },
              {
                price: 1.1,
                liquidity: 2000,
                baseAmount: 2000,
                quoteAmount: 2200,
              },
            ],
            success: true,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const mockAxiosCreate = axios.create as unknown as ReturnType<typeof vi.fn>;
    mockAxiosCreate.mockReturnValue({ get: axiosGet });

    provider = new RaydiumProvider();
  });

  describe("getPrice", () => {
    it("should fetch and return price data for a token", async () => {
      const result = await provider.getPrice(mockTokenMint);
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should throw error when no pool is found", async () => {
      axiosGet.mockResolvedValueOnce({ data: [], success: true });

      await expect(provider.getPrice(mockTokenMint)).rejects.toThrow(
        "No liquidity pool found for token",
      );
    });
  });

  describe("getOrderBook", () => {
    it("should return market depth data for v3 pools", async () => {
      const result = await provider.getOrderBook(mockTokenMint);
      expect(result).toBeDefined();
      expect(result.bids).toBeDefined();
      expect(result.asks).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("getLiquidityInfo", () => {
    it("should return liquidity information for a pool", async () => {
      const result = await provider.getLiquidityInfo(mockTokenMint);
      expect(result).toBeDefined();
      expect(result?.poolId).toBe(mockPool.id);
      expect(result?.baseSize).toBe(mockPool.baseReserve);
      expect(result?.quoteSize).toBe(mockPool.quoteReserve);
      expect(result?.version).toBe(mockPool.version);
      expect(result?.lpRatio).toBeDefined();
    });
  });
});
