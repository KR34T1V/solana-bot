import { describe, it, expect, beforeEach } from 'vitest';
import { JupiterProvider } from '../jupiter.provider';
import type { ProviderConfig } from '$lib/types/provider.types';
import { mockFetch, resetMocks, createMockResponse, mockProviderResponses } from './setup';

const mockConfig: ProviderConfig = {
    baseUrl: 'https://test.api',
    apiKey: 'test-api-key',
    timeout: 5000,
    retryAttempts: 3,
    rateLimits: {
        maxRequests: 10,
        windowMs: 1000,
        retryAfterMs: 1000
    }
};

describe('Jupiter Provider', () => {
    let provider: JupiterProvider;

    beforeEach(() => {
        resetMocks();
        provider = new JupiterProvider(mockConfig);
    });

    describe('Initialization', () => {
        it('should initialize successfully with valid config', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.auth.success)
            );

            await expect(provider.initialize()).resolves.not.toThrow();
        });

        it('should validate config successfully', async () => {
            const isValid = await provider.validateConfig();
            expect(isValid).toBe(true);
        });

        it('should pass health check', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.auth.success)
            );

            const isHealthy = await provider.healthCheck();
            expect(isHealthy).toBe(true);
        });

        it('should fail health check with invalid API key', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.auth.error, { status: 401 })
            );

            const isHealthy = await provider.healthCheck();
            expect(isHealthy).toBe(false);
        });
    });

    describe('Price', () => {
        it('should fetch price successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.price.success)
            );

            const result = await provider.getPrice('mock-token-address');
            expect(result).toEqual({
                value: mockProviderResponses.jupiter.price.success.price,
                timestamp: mockProviderResponses.jupiter.price.success.timestamp,
                source: 'jupiter'
            });
        });

        it('should handle price fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.price.error, { status: 404 })
            );

            await expect(provider.getPrice('invalid-token')).rejects.toThrow();
        });
    });

    describe('OHLCV', () => {
        it('should fetch OHLCV data successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.ohlcv.success)
            );

            const result = await provider.getOHLCV('mock-token-address', '1h');
            expect(result).toEqual({
                data: mockProviderResponses.jupiter.ohlcv.success.map(candle => ({
                    timestamp: candle.timestamp,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume
                })),
                source: 'jupiter'
            });
        });

        it('should handle OHLCV fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.ohlcv.error, { status: 400 })
            );

            await expect(provider.getOHLCV('invalid-token', '1h')).rejects.toThrow();
        });
    });

    describe('Order Book', () => {
        it('should fetch order book successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.orderBook.success)
            );

            const result = await provider.getOrderBook('mock-token-address');
            expect(result).toEqual({
                asks: mockProviderResponses.jupiter.orderBook.success.asks,
                bids: mockProviderResponses.jupiter.orderBook.success.bids,
                timestamp: mockProviderResponses.jupiter.orderBook.success.timestamp,
                source: 'jupiter'
            });
        });

        it('should handle order book fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.orderBook.error, { status: 503 })
            );

            await expect(provider.getOrderBook('invalid-token')).rejects.toThrow();
        });
    });

    describe('Token Search', () => {
        it('should search tokens successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.tokenSearch.success)
            );

            const result = await provider.searchTokens('mock-query');
            expect(result).toEqual(mockProviderResponses.jupiter.tokenSearch.success);
        });

        it('should handle token search error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.jupiter.tokenSearch.error, { status: 502 })
            );

            await expect(provider.searchTokens('invalid-query')).rejects.toThrow();
        });
    });
}); 