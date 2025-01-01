import type { TokenInfo } from './token.types';

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimits: {
        maxRequests: number;
        windowMs: number;
        retryAfterMs: number;
    };
}

export interface PriceData {
    value: number;
    timestamp: number;
    source: string;
}

export interface OHLCVCandle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface OHLCVData {
    data: OHLCVCandle[];
    source: string;
}

export interface OrderBookData {
    asks: Array<{
        price: number;
        size: number;
    }>;
    bids: Array<{
        price: number;
        size: number;
    }>;
    timestamp: number;
    source: string;
}

export interface MarketDataProvider {
    readonly name: string;
    readonly priority: number;
    initialize(): Promise<void>;
    validateConfig(): Promise<boolean>;
    healthCheck(): Promise<boolean>;
    getPrice(tokenAddress: string): Promise<PriceData>;
    getOHLCV(tokenAddress: string, timeFrame: TimeFrame, limit?: number): Promise<OHLCVData>;
    getOrderBook(tokenAddress: string, depth?: number): Promise<OrderBookData>;
    searchTokens(query: string): Promise<TokenInfo[]>;
}

export interface ProviderError {
    provider: string;
    operation: string;
    message: string;
    timestamp: number;
    retryable: boolean;
    retryAfter?: number;
} 