import type { TokenInfo, TimeRange } from '$lib/components/charts/types';
import { BirdeyeService } from './birdeye.service';
import { ApiKeyService } from './api-key.service';
import { logger } from '$lib/server/logger';
import type { PrismaClient } from '@prisma/client';

export class TokenService {
  private cache: Map<string, TokenInfo> = new Map();
  private priceCache: Map<string, { timestamp: number; data: any }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private apiKey: string | null = null;

  constructor(
    private prisma: PrismaClient,
    private birdeyeService: BirdeyeService,
    private apiKeyService: ApiKeyService
  ) {}

  private async getApiKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;
    
    const key = await this.apiKeyService.getDecryptedKey('system', 'birdeye');
    if (!key) {
      throw new Error('No API key found');
    }
    
    this.apiKey = key;
    return key;
  }

  async getTokenInfo(address: string): Promise<TokenInfo> {
    const cached = this.cache.get(address);
    if (cached) return cached;

    try {
      const apiKey = await this.getApiKey();
      const price = await this.birdeyeService.getTokenPrice(address, apiKey);
      
      const token: TokenInfo = {
        address,
        symbol: 'Unknown', // Will be updated when we have token metadata
        name: 'Unknown Token',
        decimals: 9 // Default for most Solana tokens
      };

      this.cache.set(address, token);
      return token;
    } catch (error) {
      logger.error('Failed to fetch token info', { error, address });
      throw new Error(`Failed to fetch token info for ${address}`);
    }
  }

  async getHistoricalPrices(address: string, timeRange: TimeRange) {
    const cacheKey = `${address}-${timeRange}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const apiKey = await this.getApiKey();
      const ohlcv = await this.birdeyeService.getOHLCVData(
        address,
        this.convertTimeRange(timeRange),
        apiKey
      );

      const data = {
        prices: ohlcv.data.map((p: { unixTime: number; close: number }) => ({
          timestamp: p.unixTime * 1000,
          value: p.close
        }))
      };

      this.priceCache.set(cacheKey, {
        timestamp: Date.now(),
        data
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch historical prices', { error, address, timeRange });
      throw new Error(`Failed to fetch historical prices for ${address}`);
    }
  }

  private convertTimeRange(timeRange: TimeRange): '1h' | '4h' | '1d' {
    switch (timeRange) {
      case '1h':
        return '1h';
      case '4h':
        return '4h';
      case '1d':
      case '1w':
      case '1m':
        return '1d';
      default:
        return '1h';
    }
  }
} 