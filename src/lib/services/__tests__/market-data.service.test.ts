import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketDataService } from '../market-data.service';
import type { 
    MarketDataProvider,
    PriceData,
    OHLCVData,
    OrderBookData,
    ProviderConfig 
} from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import type { TimeFrame } from '$lib/types';

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn()
    }
}));

class MockProvider implements MarketDataProvider {
    constructor(
        public readonly name: string,
        public readonly priority: number,
        public readonly config: ProviderConfig,
        private mockResponses: {
            price?: PriceData;
            ohlcv?: OHLCVData;
            orderBook?: OrderBookData;
            tokens?: TokenInfo[];
        } = {}
    ) {}

    async initialize(): Promise<void> {}
    async validateConfig(): Promise<boolean> { return true; }
    async healthCheck(): Promise<boolean> { return true; }

    async getPrice(): Promise<PriceData> {
        if (!this.mockResponses.price) throw new Error('Mock price not set');
        return this.mockResponses.price;
    }

    async getOHLCV(): Promise<OHLCVData> {
        if (!this.mockResponses.ohlcv) throw new Error('Mock OHLCV not set');
        return this.mockResponses.ohlcv;
    }

    async getOrderBook(): Promise<OrderBookData> {
        if (!this.mockResponses.orderBook) throw new Error('Mock order book not set');
        return this.mockResponses.orderBook;
    }

    async searchTokens(): Promise<TokenInfo[]> {
        if (!this.mockResponses.tokens) throw new Error('Mock tokens not set');
        return this.mockResponses.tokens;
    }
}

describe('MarketDataService', () => {
    let service: MarketDataService;
    let primaryProvider: MockProvider;
    let fallbackProvider: MockProvider;

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

    beforeEach(async () => {
        service = new MarketDataService();

        // Create providers with different priorities
        primaryProvider = new MockProvider('primary', 2, mockConfig, {
            price: {
                value: 100,
                timestamp: Date.now(),
                source: 'primary'
            }
        });

        fallbackProvider = new MockProvider('fallback', 1, mockConfig, {
            price: {
                value: 101,
                timestamp: Date.now(),
                source: 'fallback'
            }
        });

        // Register providers
        await service.registerProvider(primaryProvider);
        await service.registerProvider(fallbackProvider);
    });

    describe('getPrice', () => {
        it('should get price from primary provider', async () => {
            const price = await service.getPrice('test-token');
            expect(price.value).toBe(100);
            expect(price.source).toBe('primary');
        });

        it('should fallback to secondary provider on error', async () => {
            // Make primary provider fail
            vi.spyOn(primaryProvider, 'getPrice').mockRejectedValueOnce(new Error('Failed'));

            const price = await service.getPrice('test-token');
            expect(price.value).toBe(101);
            expect(price.source).toBe('fallback');
        });

        it('should throw if all providers fail', async () => {
            // Make both providers fail
            vi.spyOn(primaryProvider, 'getPrice').mockRejectedValueOnce(new Error('Failed'));
            vi.spyOn(fallbackProvider, 'getPrice').mockRejectedValueOnce(new Error('Failed'));

            await expect(service.getPrice('test-token')).rejects.toThrow('Failed to fetch price');
        });
    });

    describe('searchTokens', () => {
        beforeEach(async () => {
            // Update mock responses for token search
            primaryProvider = new MockProvider('primary', 2, mockConfig, {
                tokens: [{
                    address: 'token1',
                    chainId: 101,
                    decimals: 9,
                    name: 'Token One',
                    symbol: 'ONE'
                }]
            });

            fallbackProvider = new MockProvider('fallback', 1, mockConfig, {
                tokens: [{
                    address: 'token2',
                    chainId: 101,
                    decimals: 9,
                    name: 'Token Two',
                    symbol: 'TWO'
                }]
            });

            // Re-register providers with new mock data
            service = new MarketDataService();
            await service.registerProvider(primaryProvider);
            await service.registerProvider(fallbackProvider);
        });

        it('should merge results from multiple providers', async () => {
            const tokens = await service.searchTokens('token');
            expect(tokens).toHaveLength(2);
            expect(tokens.map(t => t.symbol)).toContain('ONE');
            expect(tokens.map(t => t.symbol)).toContain('TWO');
        });

        it('should deduplicate tokens by address', async () => {
            // Update fallback provider to return a token with same address
            fallbackProvider = new MockProvider('fallback', 1, mockConfig, {
                tokens: [{
                    address: 'token1', // Same as primary provider
                    chainId: 101,
                    decimals: 9,
                    name: 'Token One Duplicate',
                    symbol: 'ONE_DUP'
                }]
            });

            service = new MarketDataService();
            await service.registerProvider(primaryProvider);
            await service.registerProvider(fallbackProvider);

            const tokens = await service.searchTokens('token');
            expect(tokens).toHaveLength(1);
            expect(tokens[0].symbol).toBe('ONE'); // Should keep primary provider's version
        });

        it('should handle empty results', async () => {
            // Make both providers return empty arrays
            primaryProvider = new MockProvider('primary', 2, mockConfig, { tokens: [] });
            fallbackProvider = new MockProvider('fallback', 1, mockConfig, { tokens: [] });

            service = new MarketDataService();
            await service.registerProvider(primaryProvider);
            await service.registerProvider(fallbackProvider);

            const tokens = await service.searchTokens('nonexistent');
            expect(tokens).toHaveLength(0);
        });
    });

    describe('provider management', () => {
        it('should register new providers', async () => {
            const newProvider = new MockProvider('new', 3, mockConfig);
            await service.registerProvider(newProvider);

            // The new provider should be used first due to higher priority
            vi.spyOn(newProvider, 'getPrice').mockResolvedValueOnce({
                value: 102,
                timestamp: Date.now(),
                source: 'new'
            });

            const price = await service.getPrice('test-token');
            expect(price.value).toBe(102);
            expect(price.source).toBe('new');
        });

        it('should handle provider health checks', async () => {
            const healthStatus = await service.healthCheck();
            expect(healthStatus.get('primary')).toBe(true);
            expect(healthStatus.get('fallback')).toBe(true);
        });

        it('should handle provider initialization failures', async () => {
            const failingProvider = new MockProvider('failing', 1, mockConfig);
            vi.spyOn(failingProvider, 'initialize').mockRejectedValueOnce(new Error('Init failed'));

            await expect(service.registerProvider(failingProvider)).rejects.toThrow();
        });
    });
}); 