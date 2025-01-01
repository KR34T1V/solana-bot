import type { 
    MarketDataProvider,
    PriceData,
    OHLCVData,
    OrderBookData,
    ProviderConfig,
    TimeFrame
} from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { logger } from '$lib/server/logger';
import { fetchWithRetry } from '$lib/utils/fetch';
import { ProviderError, ProviderErrorType } from './factory/errors/provider.error';

export class BaseProvider implements MarketDataProvider {
    public readonly name: string;
    public readonly priority: number;
    protected readonly baseUrl: string;
    protected readonly apiKey: string;
    protected readonly cache: Map<string, { data: any; timestamp: number }> = new Map();
    protected readonly cacheTTL: number;

    constructor(
        name: string,
        config: ProviderConfig,
        priority: number,
        cacheTTL: number = 30000
    ) {
        this.name = name;
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.priority = priority;
        this.cacheTTL = cacheTTL;
    }

    async initialize(): Promise<void> {
        await this.verifyApiKey();
    }

    async validateConfig(): Promise<boolean> {
        if (!this.baseUrl || !this.apiKey) {
            logger.error(`${this.name} provider missing required configuration`);
            return false;
        }
        return true;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.verifyApiKey();
            return true;
        } catch (error) {
            logger.error(`${this.name} health check failed:`, error);
            return false;
        }
    }

    protected async verifyApiKey(): Promise<void> {
        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/api/v1/auth/verify`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Invalid API key', this.name);
            }

            const data = await response.json();
            if (!data.success || !data.data || !data.data.verified) {
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

    protected getCachedData<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data as T;
        }
        return null;
    }

    protected setCachedData<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async getPrice(tokenAddress: string): Promise<PriceData> {
        const cacheKey = `price:${tokenAddress}`;
        const cached = this.getCachedData<PriceData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/api/v1/token/price/${tokenAddress}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Failed to fetch price', this.name);
            }

            const result = await response.json();
            if (!result.success || !result.data) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid price data', this.name);
            }

            const price: PriceData = {
                value: result.data.price,
                timestamp: result.data.timestamp,
                source: result.data.source || this.name
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

    async getOHLCV(
        tokenAddress: string,
        timeFrame: TimeFrame,
        limit: number = 100
    ): Promise<OHLCVData> {
        const cacheKey = `ohlcv:${tokenAddress}:${timeFrame}:${limit}`;
        const cached = this.getCachedData<OHLCVData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/api/v1/token/ohlcv/${tokenAddress}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        interval: timeFrame,
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
                data: result.data.map(candle => ({
                    timestamp: candle.timestamp,
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

    async getOrderBook(
        tokenAddress: string,
        depth: number = 100
    ): Promise<OrderBookData> {
        const cacheKey = `orderbook:${tokenAddress}:${depth}`;
        const cached = this.getCachedData<OrderBookData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/api/v1/token/orderbook/${tokenAddress}`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        depth: depth.toString()
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, undefined, this.name);
            }

            const result = await response.json();
            if (!result.success || !result.data || !result.data.asks || !result.data.bids) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid order book data', this.name);
            }

            const orderBook: OrderBookData = {
                asks: result.data.asks,
                bids: result.data.bids,
                timestamp: result.data.timestamp,
                source: this.name
            };

            this.setCachedData(cacheKey, orderBook);
            return orderBook;
        } catch (error) {
            logger.error(`Failed to fetch ${this.name} order book:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }

    async searchTokens(query: string): Promise<TokenInfo[]> {
        const cacheKey = `search:${query}`;
        const cached = this.getCachedData<TokenInfo[]>(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/api/v1/token/search`,
                {
                    headers: {
                        'X-API-KEY': this.apiKey
                    },
                    params: {
                        query
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

            const tokens = result.data;
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