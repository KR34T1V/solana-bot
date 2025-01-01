import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';

export interface ProviderBuilder {
    /**
     * Build a provider instance with the current configuration
     */
    build(config: ProviderConfig): MarketDataProvider;

    /**
     * Set the provider's priority in the fallback chain
     */
    withPriority(priority: number): ProviderBuilder;

    /**
     * Set the cache TTL in milliseconds
     */
    withCacheTTL(ttl: number): ProviderBuilder;

    /**
     * Configure retry policy
     */
    withRetryPolicy(attempts: number, delay: number): ProviderBuilder;

    /**
     * Configure rate limiting
     */
    withRateLimits(maxRequests: number, windowMs: number): ProviderBuilder;
} 