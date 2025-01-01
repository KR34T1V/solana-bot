import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketDataService } from '../market-data.service';
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

describe('MarketDataService', () => {
    let service: MarketDataService;
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
        service = new MarketDataService();
        vi.clearAllMocks();

        // Mock the fetch function to handle different endpoints
        (fetchWithRetry as any).mockImplementation((url: string) => {
            // API verification endpoint
            if (url.includes('/api/v1/auth/verify')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ 
                        success: true,
                        data: { verified: true }
                    })
                });
            }
            
            // For other endpoints, return a rejected promise to ensure explicit mocking
            return Promise.reject(new Error('Endpoint not mocked'));
        });
    });

    describe('registerProvider', () => {
        it('should register a provider successfully', async () => {
            await service.registerProvider('birdeye', mockConfig);
            const providers = service.getProviders();
            expect(providers).toHaveLength(1);
            expect(providers[0].name).toBe('birdeye');
        });

        it('should register multiple providers and sort by priority', async () => {
            await service.registerProvider('birdeye', mockConfig);
            await service.registerProvider('jupiter', mockConfig);
            
            const providers = service.getProviders();
            expect(providers).toHaveLength(2);
            // Jupiter should be first due to higher priority
            expect(providers[0].name).toBe('jupiter');
            expect(providers[1].name).toBe('birdeye');
        });

        it('should throw error for invalid provider', async () => {
            await expect(service.registerProvider('unknown', mockConfig))
                .rejects
                .toThrow('No builder registered for provider: unknown');
        });

        it('should handle API verification failure', async () => {
            (fetchWithRetry as any).mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            await expect(service.registerProvider('birdeye', mockConfig))
                .rejects
                .toThrow('Invalid API key');
        });
    });

    describe('getPrice', () => {
        it('should get price from primary provider', async () => {
            await service.registerProvider('birdeye', mockConfig);
            
            // Override the mock for price endpoint only
            (fetchWithRetry as any).mockImplementationOnce((url: string) => {
                if (url.includes('/api/v1/token/price/')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            data: {
                                price: 100,
                                timestamp: Date.now(),
                                source: 'birdeye'
                            }
                        })
                    });
                }
                // Fall back to default mock for other endpoints
                return (fetchWithRetry as any).getMockImplementation()(url);
            });

            const price = await service.getPrice('test-token');
            expect(price.value).toBe(100);
            expect(price.source).toBe('birdeye');
        });

        it('should fallback to secondary provider on error', async () => {
            await service.registerProvider('birdeye', mockConfig);
            await service.registerProvider('jupiter', mockConfig);
            
            // Mock Birdeye price request failure
            (fetchWithRetry as any).mockImplementationOnce((url: string) => {
                if (url.includes('/api/v1/token/price/')) {
                    return Promise.reject(new Error('Failed'));
                }
                return (fetchWithRetry as any).getMockImplementation()(url);
            });
            
            // Mock Jupiter price request success
            (fetchWithRetry as any).mockImplementationOnce((url: string) => {
                if (url.includes('/api/v1/token/price/')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            data: {
                                price: 101,
                                timestamp: Date.now(),
                                source: 'jupiter'
                            }
                        })
                    });
                }
                return (fetchWithRetry as any).getMockImplementation()(url);
            });

            const price = await service.getPrice('test-token');
            expect(price.value).toBe(101);
            expect(price.source).toBe('jupiter');
        });

        it('should throw if all providers fail', async () => {
            await service.registerProvider('birdeye', mockConfig);
            await service.registerProvider('jupiter', mockConfig);
            
            // Mock both providers failing
            (fetchWithRetry as any)
                .mockRejectedValueOnce(new Error('Failed'))
                .mockRejectedValueOnce(new Error('Failed'));

            await expect(service.getPrice('test-token'))
                .rejects
                .toThrow('Failed to fetch price from all providers');
        });
    });

    describe('searchTokens', () => {
        it('should merge and deduplicate results from multiple providers', async () => {
            await service.registerProvider('birdeye', mockConfig);
            await service.registerProvider('jupiter', mockConfig);
            
            // Mock search responses
            (fetchWithRetry as any)
                .mockImplementationOnce((url: string) => {
                    if (url.includes('/api/v1/token/search')) {
                        return Promise.resolve({
                            ok: true,
                            json: async () => ({
                                success: true,
                                data: [
                                    { address: 'token1', name: 'Token 1', symbol: 'TK1', source: 'birdeye' },
                                    { address: 'token2', name: 'Token 2', symbol: 'TK2', source: 'birdeye' }
                                ]
                            })
                        });
                    }
                    return (fetchWithRetry as any).getMockImplementation()(url);
                })
                .mockImplementationOnce((url: string) => {
                    if (url.includes('/api/v1/token/search')) {
                        return Promise.resolve({
                            ok: true,
                            json: async () => ({
                                success: true,
                                data: [
                                    { address: 'token2', name: 'Token 2', symbol: 'TK2', source: 'jupiter' },
                                    { address: 'token3', name: 'Token 3', symbol: 'TK3', source: 'jupiter' }
                                ]
                            })
                        });
                    }
                    return (fetchWithRetry as any).getMockImplementation()(url);
                });

            const tokens = await service.searchTokens('test');
            expect(tokens).toHaveLength(3);
            expect(tokens.map(t => t.address)).toEqual(['token1', 'token2', 'token3']);
        });
    });
}); 