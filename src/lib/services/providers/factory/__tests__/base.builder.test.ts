import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseProviderBuilder } from '../base.builder';
import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Concrete implementation for testing
class TestProviderBuilder extends BaseProviderBuilder {
    build(config: ProviderConfig): MarketDataProvider {
        const finalConfig = this.createConfig(config);
        return {
            name: 'test',
            priority: this.priority,
            initialize: async () => {},
            validateConfig: async () => true,
            healthCheck: async () => true,
            getPrice: async () => ({ value: 0, timestamp: 0, source: 'test' }),
            getOHLCV: async () => ({ data: [], source: 'test' }),
            getOrderBook: async () => ({ asks: [], bids: [], timestamp: 0, source: 'test' }),
            searchTokens: async () => []
        };
    }
}

describe('BaseProviderBuilder', () => {
    let builder: TestProviderBuilder;
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
        builder = new TestProviderBuilder();
    });

    describe('withPriority', () => {
        it('should set valid priority', () => {
            builder.withPriority(2);
            const provider = builder.build(mockConfig);
            expect(provider.priority).toBe(2);
        });

        it('should use default priority for invalid value', () => {
            builder.withPriority(-1);
            const provider = builder.build(mockConfig);
            expect(provider.priority).toBe(1);
        });
    });

    describe('withCacheTTL', () => {
        it('should set valid cache TTL', () => {
            builder.withCacheTTL(60000);
            const provider = builder.build(mockConfig);
            expect(provider).toBeDefined();
        });

        it('should use default TTL for invalid value', () => {
            builder.withCacheTTL(-1);
            const provider = builder.build(mockConfig);
            expect(provider).toBeDefined();
        });
    });

    describe('withRetryPolicy', () => {
        it('should set valid retry policy', () => {
            builder.withRetryPolicy(5, 2000);
            const finalConfig = builder.build(mockConfig);
            expect(finalConfig).toBeDefined();
        });

        it('should use default values for invalid retry policy', () => {
            builder.withRetryPolicy(-1, -1);
            const finalConfig = builder.build(mockConfig);
            expect(finalConfig).toBeDefined();
        });
    });

    describe('withRateLimits', () => {
        it('should set valid rate limits', () => {
            builder.withRateLimits(20, 2000);
            const finalConfig = builder.build(mockConfig);
            expect(finalConfig).toBeDefined();
        });

        it('should use default values for invalid rate limits', () => {
            builder.withRateLimits(0, 50);
            const finalConfig = builder.build(mockConfig);
            expect(finalConfig).toBeDefined();
        });
    });

    describe('createConfig', () => {
        it('should merge base config with builder settings', () => {
            builder
                .withPriority(2)
                .withCacheTTL(60000)
                .withRetryPolicy(5, 2000)
                .withRateLimits(20, 2000);

            const provider = builder.build(mockConfig);
            expect(provider).toBeDefined();
            expect(provider.priority).toBe(2);
        });
    });
}); 