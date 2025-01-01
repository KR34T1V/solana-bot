import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseProvider } from '../../base.provider';
import { ProviderError, ProviderErrorType } from '../errors/provider.error';
import type { ProviderConfig, TimeFrame } from '$lib/types/provider.types';
import { fetchWithRetry } from '$lib/utils/fetch';

// Mock fetch utility
vi.mock('$lib/utils/fetch', () => ({
    fetchWithRetry: vi.fn()
}));

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

describe('BaseProvider', () => {
    let provider: BaseProvider;
    const mockConfig: ProviderConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        timeout: 5000,
        retryAttempts: 3,
        rateLimits: {
            maxRequests: 10,
            windowMs: 1000,
            retryAfterMs: 1000
        }
    };

    beforeEach(() => {
        provider = new BaseProvider('test', mockConfig, 1);
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(provider.name).toBe('test');
            expect(provider.priority).toBe(1);
        });

        it('should validate configuration', async () => {
            const isValid = await provider.validateConfig();
            expect(isValid).toBe(true);
        });

        it('should fail validation with missing config', async () => {
            provider = new BaseProvider('test', { ...mockConfig, baseUrl: '' }, 1);
            const isValid = await provider.validateConfig();
            expect(isValid).toBe(false);
        });
    });

    describe('API key verification', () => {
        it('should verify valid API key', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({ 
                    success: true,
                    data: { verified: true }
                }),
                { status: 200 }
            ));

            await expect(provider.initialize()).resolves.not.toThrow();
        });

        it('should handle invalid API key', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                'Unauthorized',
                { status: 401 }
            ));

            await expect(provider.initialize()).rejects.toThrow('Invalid API key');
        });

        it('should handle API errors', async () => {
            vi.mocked(fetchWithRetry).mockRejectedValueOnce(new Error('Network error'));

            await expect(provider.initialize()).rejects.toThrow('Invalid API key');
        });
    });

    describe('caching', () => {
        it('should cache and retrieve data', () => {
            const testData = { value: 100 };
            provider['setCachedData']('test-key', testData);
            
            const cached = provider['getCachedData']('test-key');
            expect(cached).toEqual(testData);
        });

        it('should respect cache TTL', () => {
            const testData = { value: 100 };
            provider['setCachedData']('test-key', testData);
            
            // Mock Date.now to be after TTL
            const realDateNow = Date.now;
            Date.now = vi.fn(() => realDateNow() + 31000);
            
            const cached = provider['getCachedData']('test-key');
            expect(cached).toBeNull();
            
            // Restore Date.now
            Date.now = realDateNow;
        });
    });

    describe('error handling', () => {
        it('should handle HTTP errors correctly', () => {
            const error = ProviderError.fromHttpStatus(404, 'Not found', 'test');
            expect(error.type).toBe(ProviderErrorType.NotFound);
            expect(error.message).toBe('Not found');
            expect(error.provider).toBe('test');
        });

        it('should handle general errors correctly', () => {
            const originalError = new Error('Test error');
            const error = ProviderError.fromError(originalError, 'test');
            expect(error.type).toBe(ProviderErrorType.Unknown);
            expect(error.message).toBe('Test error');
            expect(error.provider).toBe('test');
        });
    });

    describe('price fetching', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';
        
        it('should fetch price data successfully', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        price: 100.50,
                        timestamp: Date.now(),
                        source: 'test-provider'
                    }
                }),
                { status: 200 }
            ));

            const price = await provider.getPrice(tokenAddress);
            expect(price.value).toBe(100.50);
            expect(price.source).toBe('test-provider');
            expect(price.timestamp).toBeDefined();
        });

        it('should use cached price data', async () => {
            const mockPrice = {
                value: 100.50,
                timestamp: Date.now(),
                source: 'test-provider'
            };

            provider['setCachedData'](`price:${tokenAddress}`, mockPrice);
            const price = await provider.getPrice(tokenAddress);
            
            expect(price).toEqual(mockPrice);
            expect(fetchWithRetry).not.toHaveBeenCalled();
        });

        it('should handle invalid response data', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid token'
                }),
                { status: 200 }
            ));

            await expect(provider.getPrice(tokenAddress))
                .rejects
                .toThrow('Invalid price data');
        });

        it('should handle API errors', async () => {
            vi.mocked(fetchWithRetry).mockRejectedValueOnce(
                new Error('Network error')
            );

            await expect(provider.getPrice(tokenAddress))
                .rejects
                .toThrow('Network error');
        });

        it('should handle rate limiting', async () => {
            const rateLimitResponse = new Response(
                'Rate limit exceeded',
                { 
                    status: 429,
                    statusText: 'Too Many Requests'
                }
            );

            // Mock both calls to return the same rate limit response
            vi.mocked(fetchWithRetry)
                .mockResolvedValueOnce(rateLimitResponse)
                .mockResolvedValueOnce(rateLimitResponse);

            await expect(provider.getPrice(tokenAddress))
                .rejects
                .toThrow(ProviderError);
            
            const error = await provider.getPrice(tokenAddress).catch(e => e);
            expect(error).toBeInstanceOf(ProviderError);
            expect(error.type).toBe(ProviderErrorType.RateLimited);
        });
    });

    describe('OHLCV data fetching', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';
        const timeFrame: TimeFrame = '1h';
        
        it('should fetch OHLCV data successfully', async () => {
            const mockCandles = [
                {
                    timestamp: Date.now() - 3600000,
                    open: 100,
                    high: 105,
                    low: 98,
                    close: 102,
                    volume: 1000
                },
                {
                    timestamp: Date.now(),
                    open: 102,
                    high: 108,
                    low: 101,
                    close: 107,
                    volume: 1500
                }
            ];

            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: mockCandles
                }),
                { status: 200 }
            ));

            const ohlcv = await provider.getOHLCV(tokenAddress, timeFrame);
            expect(ohlcv.data).toHaveLength(2);
            expect(ohlcv.source).toBe('test');
            expect(ohlcv.data[0]).toEqual(mockCandles[0]);
            expect(ohlcv.data[1]).toEqual(mockCandles[1]);
        });

        it('should use cached OHLCV data', async () => {
            const mockOHLCV = {
                data: [{
                    timestamp: Date.now(),
                    open: 100,
                    high: 105,
                    low: 98,
                    close: 102,
                    volume: 1000
                }],
                source: 'test'
            };

            provider['setCachedData'](`ohlcv:${tokenAddress}:${timeFrame}:100`, mockOHLCV);
            const ohlcv = await provider.getOHLCV(tokenAddress, timeFrame);
            
            expect(ohlcv).toEqual(mockOHLCV);
            expect(fetchWithRetry).not.toHaveBeenCalled();
        });

        it('should handle invalid response data', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid token'
                }),
                { status: 200 }
            ));

            await expect(provider.getOHLCV(tokenAddress, timeFrame))
                .rejects
                .toThrow('Invalid OHLCV data');
        });

        it('should handle non-array response data', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: { invalid: 'format' }
                }),
                { status: 200 }
            ));

            await expect(provider.getOHLCV(tokenAddress, timeFrame))
                .rejects
                .toThrow('Invalid OHLCV data');
        });

        it('should respect limit parameter', async () => {
            const limit = 50;
            const mockCandles = [{
                timestamp: Date.now(),
                open: 100,
                high: 105,
                low: 98,
                close: 102,
                volume: 1000
            }];

            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: mockCandles
                }),
                { status: 200 }
            ));

            await provider.getOHLCV(tokenAddress, timeFrame, limit);
            
            expect(fetchWithRetry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        limit: limit.toString()
                    })
                })
            );
        });
    });

    describe('order book data fetching', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';
        
        it('should fetch order book data successfully', async () => {
            const mockOrderBook = {
                asks: [
                    { price: 105, size: 10 },
                    { price: 106, size: 15 }
                ],
                bids: [
                    { price: 103, size: 12 },
                    { price: 102, size: 8 }
                ],
                timestamp: Date.now()
            };

            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: mockOrderBook
                }),
                { status: 200 }
            ));

            const orderBook = await provider.getOrderBook(tokenAddress);
            expect(orderBook.asks).toHaveLength(2);
            expect(orderBook.bids).toHaveLength(2);
            expect(orderBook.source).toBe('test');
            expect(orderBook.timestamp).toBeDefined();
            expect(orderBook.asks[0]).toEqual(mockOrderBook.asks[0]);
            expect(orderBook.bids[0]).toEqual(mockOrderBook.bids[0]);
        });

        it('should use cached order book data', async () => {
            const mockOrderBook = {
                asks: [{ price: 105, size: 10 }],
                bids: [{ price: 103, size: 12 }],
                timestamp: Date.now(),
                source: 'test'
            };

            provider['setCachedData'](`orderbook:${tokenAddress}:100`, mockOrderBook);
            const orderBook = await provider.getOrderBook(tokenAddress);
            
            expect(orderBook).toEqual(mockOrderBook);
            expect(fetchWithRetry).not.toHaveBeenCalled();
        });

        it('should handle invalid response data', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid token'
                }),
                { status: 200 }
            ));

            await expect(provider.getOrderBook(tokenAddress))
                .rejects
                .toThrow('Invalid order book data');
        });

        it('should handle missing order book data', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: { timestamp: Date.now() }
                }),
                { status: 200 }
            ));

            await expect(provider.getOrderBook(tokenAddress))
                .rejects
                .toThrow('Invalid order book data');
        });

        it('should respect depth parameter', async () => {
            const depth = 50;
            const mockOrderBook = {
                asks: [{ price: 105, size: 10 }],
                bids: [{ price: 103, size: 12 }],
                timestamp: Date.now()
            };

            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                JSON.stringify({
                    success: true,
                    data: mockOrderBook
                }),
                { status: 200 }
            ));

            await provider.getOrderBook(tokenAddress, depth);
            
            expect(fetchWithRetry).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        depth: depth.toString()
                    })
                })
            );
        });

        it('should handle rate limiting', async () => {
            vi.mocked(fetchWithRetry).mockResolvedValueOnce(new Response(
                'Rate limit exceeded',
                { 
                    status: 429,
                    statusText: 'Too Many Requests'
                }
            ));

            const error = await provider.getOrderBook(tokenAddress).catch(e => e);
            expect(error).toBeInstanceOf(ProviderError);
            expect(error.type).toBe(ProviderErrorType.RateLimited);
        });
    });
}); 