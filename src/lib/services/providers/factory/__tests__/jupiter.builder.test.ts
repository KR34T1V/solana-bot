import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JupiterProviderBuilder } from '../jupiter.builder';
import type { ProviderConfig } from '$lib/types/provider.types';
import { fetchWithRetry } from '$lib/utils/fetch';

// Mock logger
vi.mock('$lib/server/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Mock fetch utility
vi.mock('$lib/utils/fetch', () => ({
    fetchWithRetry: vi.fn()
}));

describe('JupiterProviderBuilder', () => {
    let builder: JupiterProviderBuilder;
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
        builder = new JupiterProviderBuilder();
        // Mock successful API verification
        (fetchWithRetry as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });
    });

    describe('build', () => {
        it('should create Jupiter provider with default settings', () => {
            const provider = builder.build(mockConfig);
            expect(provider).toBeDefined();
            expect(provider.name).toBe('jupiter');
            expect(provider.priority).toBe(1);
        });

        it('should create Jupiter provider with custom settings', () => {
            const provider = builder
                .withPriority(2)
                .withCacheTTL(60000)
                .withRetryPolicy(5, 2000)
                .withRateLimits(20, 2000)
                .build(mockConfig);

            expect(provider).toBeDefined();
            expect(provider.name).toBe('jupiter');
            expect(provider.priority).toBe(2);
        });

        it('should validate provider configuration', async () => {
            const provider = builder.build(mockConfig);
            const isValid = await provider.validateConfig();
            expect(isValid).toBe(true);
        });

        it('should initialize provider successfully', async () => {
            const provider = builder.build(mockConfig);
            await expect(provider.initialize()).resolves.not.toThrow();
        });

        it('should handle API verification failure', async () => {
            // Mock API verification failure
            (fetchWithRetry as any).mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            const provider = builder.build(mockConfig);
            await expect(provider.initialize()).rejects.toThrow('Invalid API key');
        });
    });
}); 