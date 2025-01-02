/**
 * @file Jupiter API provider implementation
 * @version 1.0.0
 * @description Provider implementation for Jupiter Price API V2
 */

import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import type { BaseProvider, PriceData } from "../../types/provider";
import { logger } from "../logging.service";

interface JupiterPriceResponse {
  data: {
    [tokenMint: string]: {
      id: string;
      type: string;
      price: string;
    };
  };
  timeTaken: number;
}

type CachedPrice = Required<PriceData>;

class PriceCache {
  private cache: Map<string, CachedPrice>;
  private readonly cacheDuration: number;

  constructor(cacheDuration = 30000) {
    // 30 seconds default cache duration
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
  }

  isValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.timestamp < this.cacheDuration;
  }

  get(key: string): CachedPrice | null {
    if (!this.isValid(key)) {
      this.cache.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  set(key: string, data: CachedPrice): void {
    this.cache.set(key, data);
  }
}

export class JupiterProvider implements BaseProvider {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 100; // 100ms minimum between requests
  private readonly cache: PriceCache;

  constructor(baseUrl = "https://api.jup.ag") {
    this.baseUrl = baseUrl;
    this.cache = new PriceCache();

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 10000, // 10 second timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          logger.error("Jupiter API error response:", {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          logger.error("Jupiter API no response:", { request: error.request });
        } else {
          logger.error("Jupiter API error:", { message: error.message });
        }
        return Promise.reject(error);
      },
    );
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest),
      );
    }

    this.lastRequestTime = Date.now();
  }

  async getPrice(tokenMint: string): Promise<PriceData> {
    // Check cache first
    const cachedPrice = this.cache.get(tokenMint);
    if (cachedPrice) {
      logger.debug("Returning cached price", { tokenMint });
      return cachedPrice;
    }

    try {
      await this.rateLimit();

      logger.info("Fetching price from Jupiter...", { tokenMint });

      const response = await this.client.get<JupiterPriceResponse>(
        `/price/v2?ids=${tokenMint}`,
      );
      const priceData = response.data.data[tokenMint];

      if (!priceData || !priceData.price) {
        throw new Error(`Invalid price data received for token: ${tokenMint}`);
      }

      const result: CachedPrice = {
        price: parseFloat(priceData.price),
        timestamp: Date.now(),
        confidence: 1, // Jupiter provides accurate on-chain prices
      };

      // Cache the result
      this.cache.set(tokenMint, result);

      return result;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;

        if (status === 429) {
          logger.warn("Jupiter API rate limit exceeded", { tokenMint });
          throw new Error("Rate limit exceeded");
        }
        if (status === 404) {
          logger.warn("Token not found on Jupiter", { tokenMint });
          throw new Error(`Token not found: ${tokenMint}`);
        }
        if (status === 400) {
          logger.warn("Invalid request to Jupiter API", { tokenMint });
          throw new Error("Invalid request parameters");
        }
        if (status >= 500) {
          logger.error("Jupiter API server error", { tokenMint });
          throw new Error("Jupiter API server error");
        }
      }

      logger.error("Failed to fetch price from Jupiter", {
        error: error instanceof Error ? error.message : "Unknown error",
        tokenMint,
      });
      throw error;
    }
  }

  async getOHLCV(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<never> {
    throw new Error("OHLCV data not available through Jupiter API");
  }
}
