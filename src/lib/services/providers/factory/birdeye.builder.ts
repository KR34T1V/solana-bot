import { BaseProviderBuilder } from './base.builder';
import { BaseProvider } from '../base.provider';
import type { MarketDataProvider, ProviderConfig, PriceData, OHLCVData } from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { TimeFrame } from '$lib/types/provider.enums';
import { ProviderError, ProviderErrorType } from './errors/provider.error';
import { logger } from '$lib/server/logger';

interface BirdeyeCandle {
    unixTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface BirdeyeToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    chainId: number;
}

export class BirdeyeProvider extends BaseProvider {
    protected async fetchWithRetry<T>(url: string, options: RequestInit & { params?: Record<string, string>; headers?: Record<string, string> }): Promise<Response> {
        const { params, ...rest } = options;
        const queryParams = params ? new URLSearchParams(params).toString() : '';
        const fullUrl = queryParams ? `${url}?${queryParams}` : url;

        return await fetch(fullUrl, rest);
    }

    public async verifyApiKey(): Promise<void> {
        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/public/tokenlist`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        limit: '1'
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Invalid API key', this.name);
            }

            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) {
                throw new ProviderError(ProviderErrorType.Unauthorized, 'Invalid API key', this.name);
            }
        } catch (error) {
            logger.error(`Failed to verify ${this.name} API key:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(ProviderErrorType.Unauthorized, 'Invalid API key', this.name);
        }
    }

    override async getPrice(tokenAddress: string): Promise<PriceData> {
        const cacheKey = `price:${tokenAddress}`;
        const cached = this.getCachedData<PriceData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/public/price`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        address: tokenAddress
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Failed to fetch price', this.name);
            }

            const result = await response.json();
            if (!result.success || !result.data || typeof result.data.value !== 'number') {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid price data', this.name);
            }

            const price: PriceData = {
                value: result.data.value,
                timestamp: result.data.updateUnixTime * 1000,
                source: this.name
            };

            this.setCachedData(cacheKey, price);
            return price;
        } catch (error) {
            logger.error(`Failed to fetch ${this.name} price:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }

    override async getOHLCV(
        tokenAddress: string,
        timeFrame: TimeFrame,
        limit: number = 100
    ): Promise<OHLCVData> {
        const cacheKey = `ohlcv:${tokenAddress}:${timeFrame}:${limit}`;
        const cached = this.getCachedData<OHLCVData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/public/candles`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        address: tokenAddress,
                        timeframe: timeFrame,
                        limit: limit.toString()
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, undefined, this.name);
            }

            const result = await response.json();
            if (!result.success || !Array.isArray(result.data)) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid OHLCV data', this.name);
            }

            const ohlcv: OHLCVData = {
                data: result.data.map((candle: BirdeyeCandle) => ({
                    timestamp: candle.unixTime * 1000,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume
                })),
                source: this.name
            };

            this.setCachedData(cacheKey, ohlcv);
            return ohlcv;
        } catch (error) {
            logger.error(`Failed to fetch ${this.name} OHLCV:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }

    override async searchTokens(query: string): Promise<TokenInfo[]> {
        const cacheKey = `search:${query}`;
        const cached = this.getCachedData<TokenInfo[]>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/public/tokenlist`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        search: query
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Failed to search tokens', this.name);
            }

            const result = await response.json();
            if (!result.success || !Array.isArray(result.data)) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid search results', this.name);
            }

            const tokens = result.data.map((token: BirdeyeToken) => ({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoURI: token.logoURI,
                chainId: token.chainId || 101 // Default to Solana mainnet
            }));

            this.setCachedData(cacheKey, tokens);
            return tokens;
        } catch (error) {
            logger.error(`Failed to search ${this.name} tokens:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }
}

export class BirdeyeProviderBuilder extends BaseProviderBuilder {
    build(config: ProviderConfig): MarketDataProvider {
        logger.info('Building Birdeye provider with config:', {
            baseUrl: config.baseUrl || 'https://public-api.birdeye.so',
            priority: this.priority,
            cacheTTL: this.cacheTTL,
            retryAttempts: this.retryAttempts,
            maxRequests: this.maxRequests
        });

        const finalConfig = this.createConfig({
            ...config,
            baseUrl: config.baseUrl || 'https://public-api.birdeye.so'
        });

        return new BirdeyeProvider('birdeye', finalConfig, this.priority, this.cacheTTL);
    }
} 