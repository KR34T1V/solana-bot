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

interface JupiterTokenPrice {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
    timestamp: number;
}

interface JupiterOHLCV {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface JupiterOrderBook {
    market: string;
    timestamp: number;
    asks: Array<{
        price: number;
        size: number;
    }>;
    bids: Array<{
        price: number;
        size: number;
    }>;
}

interface JupiterToken {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    logoURI?: string;
    tags?: string[];
    extensions?: {
        coingeckoId?: string;
    };
}

export class JupiterProvider implements MarketDataProvider {
    public readonly name = 'jupiter';
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
        // Verify API key and connection
        await this.verifyConnection();
    }

    async validateConfig(): Promise<boolean> {
        if (!this.baseUrl || !this.apiKey) {
            logger.error('Jupiter provider missing required configuration');
            return false;
        }
        return true;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.verifyConnection();
            return true;
        } catch (error) {
            logger.error('Jupiter health check failed:', error);
            return false;
        }
    }

    private async verifyConnection(): Promise<void> {
        try {
            const response = await fetchWithRetry(
                `${this.baseUrl}/v4/health`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            if (!response.ok) {
                const error = new Error('Failed to connect to Jupiter API');
                error.name = 'ConnectionError';
                throw error;
            }

            const data = await response.json();
            if (data.status !== 'ok') {
                const error = new Error('Failed to connect to Jupiter API');
                error.name = 'ConnectionError';
                throw error;
            }
        } catch (error) {
            logger.error('Failed to verify Jupiter connection:', error);
            if (error instanceof Error && error.name === 'ConnectionError') {
                throw error;
            }
            throw new Error('Failed to connect to Jupiter API');
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
                `${this.baseUrl}/v4/price/${tokenAddress}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(response.statusText || 'Not Found');
            }

            const data: JupiterTokenPrice = await response.json();
            const price: PriceData = {
                value: data.price,
                timestamp: data.timestamp,
                source: this.name
            };

            this.setCachedData(cacheKey, price);
            return price;
        } catch (error) {
            logger.error('Failed to fetch Jupiter price:', error);
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
                `${this.baseUrl}/v4/candles/${tokenAddress}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
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

            const data: JupiterOHLCV[] = await response.json();
            const ohlcv: OHLCVData = {
                data: data.map(candle => ({
                    timestamp: candle.time,
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
            logger.error('Failed to fetch Jupiter OHLCV:', error);
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
                `${this.baseUrl}/v4/orderbook/${tokenAddress}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
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
                timestamp: data.timestamp,
                source: this.name
            };

            this.setCachedData(cacheKey, orderBook);
            return orderBook;
        } catch (error) {
            logger.error('Failed to fetch Jupiter order book:', error);
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
                `${this.baseUrl}/v4/tokens/search`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
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
            logger.error('Failed to search Jupiter tokens:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to search tokens: ${error.message}`);
            }
            throw new Error('Failed to search tokens: Unknown error');
        }
    }
} 