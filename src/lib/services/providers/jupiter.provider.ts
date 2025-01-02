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
import { ManagedProviderBase, type ProviderConfig } from "./base.provider";

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

  constructor(
    config: ExtendedProviderConfig,
    logger: ManagedLoggingService,
    connection: Connection,
  ) {
    super(config, logger);
    this.connection = connection;
  }

  protected override async initializeProvider(): Promise<void> {
    try {
      // Test connection
      await axios.get(`${this.baseUrl}/price`);
      this.logger.info("Jupiter API connection established");
    } catch (error) {
      this.logger.error("Failed to initialize Jupiter API connection", {
        error,
      });
      throw error;
    }
  }

  protected override async cleanupProvider(): Promise<void> {
    // Nothing to clean up
  }

  protected override async getPriceImpl(tokenMint: string): Promise<PriceData> {
    try {
      const response = await axios.get<JupiterPriceResponse>(
        `${this.baseUrl}/price`,
        {
          params: { ids: tokenMint },
        },
      );

      if (
        !response.data ||
        !response.data.data ||
        !response.data.data[tokenMint]
      ) {
        throw new Error("Invalid response format");
      }

      return {
        price: Number(response.data.data[tokenMint].price),
        timestamp: Date.now(),
        confidence: 1, // Jupiter doesn't provide confidence scores
      };
    } catch (error) {
      this.logger.error("Failed to fetch price from Jupiter", {
        error,
        tokenMint,
      });
      throw error;
    }
  }

  // Provider Interface Implementation
  public override getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: true,
      canGetOHLCV: false,
      canGetOrderBook: true,
    };
  }

  // Protected Implementation Methods
  protected override async getOrderBookImpl(
    tokenMint: string,
    limit: number = 100,
  ): Promise<MarketDepth> {
    try {
      const response = await axios.get<JupiterOrderBookResponse>(
        `${this.baseUrl}/orderbook/${tokenMint}`,
        {
          params: { limit },
        },
      );

      return {
        bids: response.data.bids,
        asks: response.data.asks,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      this.logger.error("Failed to fetch order book from Jupiter", {
        error,
        tokenMint,
      });
      throw error;
    }
  }

  protected override async getOHLCVImpl(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<OHLCVData> {
    // This should never be called since canGetOHLCV is false
    throw new Error("This should never be called");
  }
}
