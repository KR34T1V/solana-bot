import { describe, it, expect, beforeEach } from 'vitest';
import { BirdeyeProvider } from '../birdeye.provider';
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

describe('BirdEye Provider', () => {
    let provider: BirdeyeProvider;

    beforeEach(() => {
        resetMocks();
        provider = new BirdeyeProvider(mockConfig);
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
                createMockResponse(mockProviderResponses.birdeye.price.success)
            );

            const result = await provider.getPrice('mock-token-address');
            expect(result).toEqual({
                value: mockProviderResponses.birdeye.price.success.value,
                timestamp: mockProviderResponses.birdeye.price.success.updateUnixTime * 1000,
                source: 'birdeye'
            });
        });

        it('should handle price fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.price.error, { status: 404 })
            );

            await expect(provider.getPrice('invalid-token')).rejects.toThrow();
        });
    });

    describe('OHLCV', () => {
        it('should fetch OHLCV data successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.ohlcv.success)
            );

            const result = await provider.getOHLCV('mock-token-address', '1h');
            expect(result).toEqual({
                data: mockProviderResponses.birdeye.ohlcv.success.map(candle => ({
                    timestamp: candle.unixTime * 1000,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume
                })),
                source: 'birdeye'
            });
        });

        it('should handle OHLCV fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.ohlcv.error, { status: 400 })
            );

            await expect(provider.getOHLCV('invalid-token', '1h')).rejects.toThrow();
        });
    });

    describe('Order Book', () => {
        it('should fetch order book successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.orderBook.success)
            );

            const result = await provider.getOrderBook('mock-token-address');
            expect(result).toEqual({
                asks: mockProviderResponses.birdeye.orderBook.success.asks,
                bids: mockProviderResponses.birdeye.orderBook.success.bids,
                timestamp: mockProviderResponses.birdeye.orderBook.success.updateUnixTime * 1000,
                source: 'birdeye'
            });
        });

        it('should handle order book fetch error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.orderBook.error, { status: 503 })
            );

            await expect(provider.getOrderBook('invalid-token')).rejects.toThrow();
        });
    });

    describe('Token Search', () => {
        it('should search tokens successfully', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.tokenSearch.success)
            );

            const result = await provider.searchTokens('mock-query');
            expect(result).toEqual(mockProviderResponses.birdeye.tokenSearch.success);
        });

        it('should handle token search error', async () => {
            mockFetch.mockImplementationOnce(() => 
                createMockResponse(mockProviderResponses.birdeye.tokenSearch.error, { status: 502 })
            );

            await expect(provider.searchTokens('invalid-query')).rejects.toThrow();
        });
    });
}); 