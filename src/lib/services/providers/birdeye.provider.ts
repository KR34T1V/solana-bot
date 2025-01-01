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
import { ProviderError, ProviderErrorType } from './__tests__/factory';

interface BirdeyeTokenPrice {
    value: number;
    updateUnixTime: number;
    updateTime: string;
}

interface BirdeyeOHLCV {
    unixTime: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface BirdeyeOrderBook {
    asks: Array<{
        price: number;
        size: number;
    }>;
    bids: Array<{
        price: number;
        size: number;
    }>;
    updateUnixTime: number;
}

interface BirdeyeToken {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI?: string;
    coingeckoId?: string;
    tags?: string[];
}

export class BirdeyeProvider implements MarketDataProvider {
    public readonly name = 'birdeye';
    public readonly priority: number;
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly cache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly cacheTTL = 30000; // 30 seconds

    constructor(
        config: ProviderConfig,
        priority: number = 1
    ) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.priority = priority;
    }

    async initialize(): Promise<void> {
        // Verify API key on initialization
        await this.verifyApiKey();
    }

    async validateConfig(): Promise<boolean> {
        if (!this.baseUrl || !this.apiKey) {
            logger.error('BirdEye provider missing required configuration');
            return false;
        }
        return true;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.verifyApiKey();
            return true;
        } catch (error) {
            logger.error('BirdEye health check failed:', error);
            return false;
        }
    }

    private async verifyApiKey(): Promise<void> {
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
            if (!data.success) {
                throw new ProviderError(ProviderErrorType.Unauthorized, 'Invalid API key', this.name);
            }
        } catch (error) {
            logger.error('Failed to verify BirdEye API key:', error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(ProviderErrorType.Unauthorized, 'Invalid API key', this.name);
        }
    }

    private getCachedData<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data as T;
        }
        return null;
    }

    private setCachedData<T>(key: string, data: T): void {
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
                throw ProviderError.fromHttpStatus(response.status, undefined, this.name);
            }

            const data: BirdeyeTokenPrice = await response.json();
            const price: PriceData = {
                value: data.value,
                timestamp: data.updateUnixTime * 1000,
                source: this.name
            };

            this.setCachedData(cacheKey, price);
            return price;
        } catch (error) {
            logger.error('Failed to fetch BirdEye price:', error);
            if (error instanceof Error) {
                throw ProviderError.fromError(error, this.name);
            }
            throw new ProviderError(ProviderErrorType.Unknown, 'Unknown error', this.name);
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

            const data: BirdeyeOHLCV[] = await response.json();
            const ohlcv: OHLCVData = {
                data: data.map(candle => ({
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
            logger.error('Failed to fetch BirdEye OHLCV:', error);
            if (error instanceof Error) {
                throw ProviderError.fromError(error, this.name);
            }
            throw new ProviderError(ProviderErrorType.Unknown, 'Unknown error', this.name);
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

            const data = await response.json();
            if (!data || !data.asks || !data.bids) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid order book data', this.name);
            }

            const orderBook: OrderBookData = {
                asks: data.asks,
                bids: data.bids,
                timestamp: data.updateUnixTime * 1000,
                source: this.name
            };

            this.setCachedData(cacheKey, orderBook);
            return orderBook;
        } catch (error) {
            logger.error('Failed to fetch BirdEye order book:', error);
            if (error instanceof Error) {
                throw ProviderError.fromError(error, this.name);
            }
            throw new ProviderError(ProviderErrorType.Unknown, 'Unknown error', this.name);
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
                throw ProviderError.fromHttpStatus(response.status, undefined, this.name);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new ProviderError(ProviderErrorType.BadGateway, 'Invalid token data', this.name);
            }

            const tokens: TokenInfo[] = data.map(token => ({
                address: token.address,
                chainId: token.chainId,
                decimals: token.decimals,
                name: token.name,
                symbol: token.symbol,
                logoURI: token.logoURI
            }));

            this.setCachedData(cacheKey, tokens);
            return tokens;
        } catch (error) {
            logger.error('Failed to search BirdEye tokens:', error);
            if (error instanceof Error) {
                throw ProviderError.fromError(error, this.name);
            }
            throw new ProviderError(ProviderErrorType.Unknown, 'Unknown error', this.name);
        }
    }
} 