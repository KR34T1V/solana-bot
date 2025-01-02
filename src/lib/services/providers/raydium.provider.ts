/**
 * @file Raydium DEX Provider Implementation
 * @version 1.0.0
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  Liquidity,
  type LiquidityPoolKeys,
  Token,
  TokenAmount,
  Percent,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import type { AxiosInstance } from "axios";
import axios from "axios";
import type { BaseProvider, PriceData, MarketDepth } from "$lib/types/provider";
import { logger } from "../logging.service";

// API Endpoints
const API_V2_BASE = "https://api.raydium.io/v2";

interface RaydiumPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  baseReserve: number;
  quoteReserve: number;
  lpSupply: number;
  startTime: number;
  version: number; // v3 or v2
  ammId?: string;
  marketId?: string;
  fees?: {
    tradeFee: number;
    ownerTradeFee: number;
  };
}

interface RaydiumLiquidity {
  poolId: string;
  baseSize: number;
  quoteSize: number;
  price: number;
  lpRatio: number;
  version: number;
  locked?: {
    amount: number;
    duration: number;
    endTime: number;
  };
}

export class RaydiumProvider implements BaseProvider {
  private readonly connection: Connection;
  private readonly poolCache: Map<string, RaydiumPool>;
  private readonly liquidityCache: Map<string, RaydiumLiquidity>;
  private lastUpdate: number;
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    );
    this.poolCache = new Map();
    this.liquidityCache = new Map();
    this.lastUpdate = 0;

    // Initialize API client
    this.apiClient = axios.create({
      timeout: 10000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  async getPrice(tokenMint: string): Promise<PriceData> {
    try {
      await this.updatePoolData();
      const pool = await this.findBestPool(tokenMint);

      if (!pool) {
        throw new Error(`No liquidity pool found for token: ${tokenMint}`);
      }

      // Get real-time price using SDK for v3 pools
      if (pool.version === 3) {
        const price = await this.getV3Price(pool);
        return {
          price,
          timestamp: Date.now(),
          confidence: this.calculatePriceConfidence(pool),
        };
      }

      // Fallback to v2 pool calculation
      const price = pool.quoteReserve / pool.baseReserve;
      return {
        price,
        timestamp: Date.now(),
        confidence: this.calculatePriceConfidence(pool),
      };
    } catch (error) {
      logger.error("Failed to fetch Raydium price:", { error, tokenMint });
      throw error;
    }
  }

  async getOrderBook(tokenMint: string, _limit = 100): Promise<MarketDepth> {
    try {
      const pool = await this.findBestPool(tokenMint);
      if (!pool) {
        throw new Error(`No liquidity pool found for token: ${tokenMint}`);
      }

      // Use SDK to get market depth for v3 pools
      if (pool.version === 3) {
        const depth = await this.getV3MarketDepth(pool);
        return {
          bids: depth.bids,
          asks: depth.asks,
          timestamp: Date.now(),
        };
      }

      // Fallback to v2 API
      const depth = await this.getV2MarketDepth(pool);
      return {
        bids: depth.bids,
        asks: depth.asks,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error("Failed to fetch Raydium orderbook:", { error, tokenMint });
      throw error;
    }
  }

  async getLiquidityInfo(tokenMint: string): Promise<RaydiumLiquidity | null> {
    try {
      const pool = await this.findBestPool(tokenMint);
      if (!pool) return null;

      const liquidity = this.liquidityCache.get(pool.id);
      if (!liquidity || Date.now() - this.lastUpdate > 10000) {
        const newLiquidity = await this.fetchPoolLiquidity(pool);
        this.liquidityCache.set(pool.id, newLiquidity);
        return newLiquidity;
      }

      return liquidity;
    } catch (error) {
      logger.error("Failed to fetch Raydium liquidity:", { error, tokenMint });
      return null;
    }
  }

  private async updatePoolData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < 10000) return; // 10 second cache

    try {
      // Fetch V3 (CL) pools
      const v3Pools = await this.apiClient.get(`${API_V2_BASE}/ammV3/ammPools`);

      // Fetch V2 (CP) pools
      const v2Pools = await this.apiClient.get(`${API_V2_BASE}/main/pairs`);

      // Combine and cache pools
      [...v3Pools.data, ...v2Pools.data].forEach((pool) => {
        this.poolCache.set(pool.id, {
          ...pool,
          version: "ammId" in pool ? 2 : 3, // Determine version based on structure
        });
      });

      this.lastUpdate = now;
    } catch (error) {
      logger.error("Failed to update Raydium pool data:", { error });
      throw error;
    }
  }

  private async findBestPool(tokenMint: string): Promise<RaydiumPool | null> {
    await this.updatePoolData();

    let bestPool: RaydiumPool | null = null;
    let maxLiquidity = 0;

    for (const pool of this.poolCache.values()) {
      if (pool.baseMint === tokenMint || pool.quoteMint === tokenMint) {
        const liquidity = Math.min(pool.baseReserve, pool.quoteReserve);
        if (liquidity > maxLiquidity) {
          maxLiquidity = liquidity;
          bestPool = pool;
        }
      }
    }

    return bestPool;
  }

  private calculatePriceConfidence(pool: RaydiumPool): number {
    // Calculate confidence based on:
    // 1. Pool liquidity depth
    // 2. Recent volume
    // 3. Price impact
    const minReserve = Math.min(pool.baseReserve, pool.quoteReserve);
    const maxReserve = Math.max(pool.baseReserve, pool.quoteReserve);
    const ratio = minReserve / maxReserve;

    // Return confidence score between 0 and 1
    return Math.min(ratio * 1.5, 1);
  }

  private async getV3Price(pool: RaydiumPool): Promise<number> {
    try {
      const poolKeys = await this.getPoolKeys(pool);
      const poolInfo = await Liquidity.fetchInfo({
        connection: this.connection,
        poolKeys,
      });

      // Calculate price using SDK
      const baseToken = new Token(
        TOKEN_PROGRAM_ID,
        new PublicKey(pool.baseMint),
        pool.baseDecimals,
        "BASE",
      );

      const quoteToken = new Token(
        TOKEN_PROGRAM_ID,
        new PublicKey(pool.quoteMint),
        pool.quoteDecimals,
        "QUOTE",
      );

      const baseAmount = new TokenAmount(baseToken, "1");
      const { amountOut } = await Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: baseAmount,
        currencyOut: quoteToken,
        slippage: new Percent(1, 100), // 1% slippage tolerance
      });

      return Number(amountOut.toFixed());
    } catch (error) {
      logger.error("Failed to get V3 price:", { error, poolId: pool.id });
      throw error;
    }
  }

  private async getV3MarketDepth(
    _pool: RaydiumPool,
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    try {
      const response = await this.apiClient.get(
        `${API_V2_BASE}/ammV3/positionLine`,
        {
          params: { pool_id: _pool.id },
        },
      );

      // Transform position data into order book format
      return this.transformPositionsToDepth(response.data);
    } catch (error) {
      logger.error("Failed to get V3 market depth:", {
        error,
        poolId: _pool.id,
      });
      return { bids: [], asks: [] };
    }
  }

  private async getV2MarketDepth(
    pool: RaydiumPool,
  ): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    if (!pool.marketId) {
      return { bids: [], asks: [] };
    }

    try {
      const response = await this.apiClient.get(`${API_V2_BASE}/main/market`, {
        params: { market: pool.marketId },
      });

      return {
        bids: response.data.bids || [],
        asks: response.data.asks || [],
      };
    } catch (error) {
      logger.error("Failed to get V2 market depth:", {
        error,
        poolId: pool.id,
      });
      return { bids: [], asks: [] };
    }
  }

  private async getPoolKeys(_pool: RaydiumPool): Promise<LiquidityPoolKeys> {
    // Implement pool keys retrieval based on pool version
    // This is a placeholder - implement actual logic
    return {} as LiquidityPoolKeys;
  }

  private transformPositionsToDepth(_positions: unknown): {
    bids: [number, number][];
    asks: [number, number][];
  } {
    // Transform position data into order book format
    // This is a placeholder - implement actual transformation
    return {
      bids: [],
      asks: [],
    };
  }

  private async fetchPoolLiquidity(
    pool: RaydiumPool,
  ): Promise<RaydiumLiquidity> {
    return {
      poolId: pool.id,
      baseSize: pool.baseReserve,
      quoteSize: pool.quoteReserve,
      price: pool.quoteReserve / pool.baseReserve,
      lpRatio: pool.lpSupply / Math.sqrt(pool.baseReserve * pool.quoteReserve),
      version: pool.version,
    };
  }

  // Required by BaseProvider interface but not implemented for Raydium
  async getOHLCV(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<never> {
    throw new Error("OHLCV data not available through Raydium");
  }
}
