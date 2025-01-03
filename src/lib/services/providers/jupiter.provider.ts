/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/providers/jupiter.provider
 * @author Development Team
 * @lastModified 2025-01-02
 */

import axios from "axios";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../core/managed-logging";
import type {
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
} from "../../types/provider";
import {
  ManagedProviderBase,
  type ProviderConfig,
  ServiceError,
} from "./base.provider";

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

interface JupiterOrderBookResponse {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp: number;
}

interface ExtendedProviderConfig extends ProviderConfig {
  cluster?: string;
}

export class JupiterProvider extends ManagedProviderBase {
  private connection: Connection;
  private readonly baseUrl = "https://price.jup.ag/v4";
  private pendingRequests: AbortController[] = [];

  constructor(
    config: ExtendedProviderConfig,
    logger: ManagedLoggingService,
    connection: Connection,
  ) {
    super(
      {
        ...config,
        rateLimitMs: 1000, // 1 request per second
        maxRequestsPerWindow: 60, // 60 requests per minute
        burstLimit: 5, // Allow 5 burst requests
        retryAttempts: 3, // Retry failed requests 3 times
        cacheTimeout: 5000, // Cache prices for 5 seconds
      },
      logger,
    );
    this.connection = connection;
  }

  protected override async initializeProvider(): Promise<void> {
    try {
      // Test connection
      await axios.get(`${this.baseUrl}/price`);
      this.logger.info("Jupiter API connection established");
    } catch (error) {
      const serviceError = new ServiceError(
        "Failed to initialize Jupiter API connection",
        "INITIALIZATION_ERROR",
        true, // Retryable
        { error },
      );
      this.logger.error(serviceError.message, { error });
      throw serviceError;
    }
  }

  protected override async cleanupProvider(): Promise<void> {
    try {
      // Cancel any pending requests
      this.pendingRequests.forEach((controller) => {
        try {
          controller.abort();
        } catch (error) {
          this.logger.warn("Error aborting request", { error });
        }
      });
      this.pendingRequests = [];

      // Clear cache
      this.cache.clear();

      this.logger.info("Jupiter provider cleanup completed");
    } catch (error) {
      this.logger.error("Error during Jupiter provider cleanup", { error });
      throw error;
    }
  }

  protected override async getPriceImpl(tokenMint: string): Promise<PriceData> {
    const controller = new AbortController();
    this.pendingRequests.push(controller);

    try {
      const response = await axios.get<JupiterPriceResponse>(
        `${this.baseUrl}/price`,
        {
          params: { ids: tokenMint },
          signal: controller.signal,
        },
      );

      if (!response.data?.data?.[tokenMint]) {
        throw new ServiceError(
          "Invalid Jupiter API response format",
          "INVALID_RESPONSE",
          true, // Retryable
          { tokenMint },
        );
      }

      return {
        price: Number(response.data.data[tokenMint].price),
        timestamp: Date.now(),
        confidence: 1, // Jupiter doesn't provide confidence scores
      };
    } catch (error) {
      // Handle abort errors
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceError(
          "Request cancelled",
          "REQUEST_CANCELLED",
          false,
          { tokenMint },
        );
      }
      return this.handleProviderError(error, "Jupiter price fetch", {
        tokenMint,
      });
    } finally {
      const index = this.pendingRequests.indexOf(controller);
      if (index > -1) {
        this.pendingRequests.splice(index, 1);
      }
    }
  }

  public override getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: true,
      canGetOHLCV: false,
      canGetOrderBook: true,
    };
  }

  protected override async getOrderBookImpl(
    tokenMint: string,
    limit: number = 100,
  ): Promise<MarketDepth> {
    const controller = new AbortController();
    this.pendingRequests.push(controller);

    try {
      const response = await axios.get<JupiterOrderBookResponse>(
        `${this.baseUrl}/orderbook/${tokenMint}`,
        {
          params: { limit },
          signal: controller.signal,
        },
      );

      return {
        bids: response.data.bids,
        asks: response.data.asks,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      throw new ServiceError(
        "Failed to fetch order book from Jupiter",
        axios.isAxiosError(error) ? "API_ERROR" : "UNKNOWN_ERROR",
        true, // Retryable
        { tokenMint, limit, error },
      );
    } finally {
      const index = this.pendingRequests.indexOf(controller);
      if (index > -1) {
        this.pendingRequests.splice(index, 1);
      }
    }
  }

  protected override async getOHLCVImpl(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData> {
    throw new ServiceError(
      "OHLCV data not supported by Jupiter provider",
      "UNSUPPORTED_OPERATION",
      false,
      { tokenMint, timeframe, limit },
    );
  }
}
