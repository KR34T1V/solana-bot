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
                const error = new Error('Invalid API key');
                error.name = 'InvalidApiKeyError';
                throw error;
            }

            const data = await response.json();
            if (!data.success) {
                const error = new Error('Invalid API key');
                error.name = 'InvalidApiKeyError';
                throw error;
            }
        } catch (error) {
            logger.error('Failed to verify BirdEye API key:', error);
            if (error instanceof Error && error.name === 'InvalidApiKeyError') {
                throw error;
            }
            throw new Error('Invalid API key');
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
                throw new Error(response.statusText || 'Not Found');
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
                const message = error.message.includes('HTTP error!') ? 'Not Found' : error.message;
                throw new Error(`Failed to fetch price: ${message}`);
            }
            throw new Error('Failed to fetch price: Unknown error');
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
                throw new Error(response.statusText || 'Bad Request');
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
                const message = error.message.includes('HTTP error!') ? 'Bad Request' : error.message;
                throw new Error(`Failed to fetch OHLCV: ${message}`);
            }
            throw new Error('Failed to fetch OHLCV: Unknown error');
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
                throw new Error(response.statusText || 'Service Unavailable');
            }

            const data = await response.json();
            if (!data || !data.asks || !data.bids) {
                throw new Error('Service Unavailable');
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
                throw new Error(`Failed to fetch order book: ${error.message}`);
            }
            throw new Error('Failed to fetch order book: Unknown error');
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
                throw new Error(response.statusText || 'Bad Gateway');
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Bad Gateway');
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
                throw new Error(`Failed to search tokens: ${error.message}`);
            }
            throw new Error('Failed to search tokens: Unknown error');
        }
    }
} 