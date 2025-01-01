import type { TokenInfo } from './token.types';

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface ProviderConfig {
    baseUrl?: string;
    apiKey?: string;
    retryAttempts?: number;
    maxRequests?: number;
    timeout?: number;
    rateLimits?: {
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

export interface OHLCVData {
    data: {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];
    source: string;
}

export interface MarketDataProvider {
    readonly name: string;
    readonly priority: number;
    readonly cacheTTL: number;

    verifyApiKey(): Promise<void>;
    getPrice(tokenAddress: string): Promise<PriceData>;
    getOHLCV(tokenAddress: string, timeFrame: string, limit?: number): Promise<OHLCVData>;
    searchTokens(query: string): Promise<import('./token.types').TokenInfo[]>;
}

export interface ProviderError {
    provider: string;
    operation: string;
    message: string;
    timestamp: number;
    retryable: boolean;
    retryAfter?: number;
} 