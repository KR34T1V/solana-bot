import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';

export abstract class BaseProviderBuilder {
    protected priority: number = 0;
    protected cacheTTL: number = 60 * 1000; // 1 minute default
    protected retryAttempts: number = 3;
    protected maxRequests: number = 100;
    protected retryDelay: number = 1000;
    protected rateLimitWindow: number = 60000;

    withPriority(priority: number): this {
        this.priority = priority > 0 ? priority : 1;
        return this;
    }

    withCacheTTL(ttl: number): this {
        this.cacheTTL = ttl > 0 ? ttl : 60 * 1000;
        return this;
    }

    withRetryAttempts(attempts: number): this {
        this.retryAttempts = attempts > 0 ? attempts : 3;
        return this;
    }

    withMaxRequests(maxRequests: number): this {
        this.maxRequests = maxRequests > 0 ? maxRequests : 100;
        return this;
    }

    withRetryPolicy(attempts: number, delay: number): this {
        this.retryAttempts = attempts > 0 ? attempts : 3;
        this.retryDelay = delay > 0 ? delay : 1000;
        return this;
    }

    withRateLimits(maxRequests: number, windowMs: number): this {
        this.maxRequests = maxRequests > 0 ? maxRequests : 100;
        this.rateLimitWindow = windowMs > 0 ? windowMs : 60000;
        return this;
    }

    protected createConfig(config: ProviderConfig): ProviderConfig {
        return {
            ...config,
            retryAttempts: this.retryAttempts,
            maxRequests: this.maxRequests,
            rateLimits: {
                maxRequests: this.maxRequests,
                windowMs: this.rateLimitWindow,
                retryAfterMs: this.retryDelay
            }
        };
    }

    abstract build(config: ProviderConfig): MarketDataProvider;
} 