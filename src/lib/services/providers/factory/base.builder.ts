import type { ProviderBuilder } from './provider.builder';
import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';
import { logger } from '$lib/server/logger';

export abstract class BaseProviderBuilder implements ProviderBuilder {
    protected priority: number = 1;
    protected cacheTTL: number = 30000;
    protected retryAttempts: number = 3;
    protected retryDelay: number = 1000;
    protected maxRequests: number = 10;
    protected windowMs: number = 1000;

    abstract build(config: ProviderConfig): MarketDataProvider;

    withPriority(priority: number): ProviderBuilder {
        if (priority < 1) {
            logger.warn('Priority must be >= 1, using default value of 1');
            this.priority = 1;
        } else {
            this.priority = priority;
        }
        return this;
    }

    withCacheTTL(ttl: number): ProviderBuilder {
        if (ttl < 0) {
            logger.warn('Cache TTL must be >= 0, using default value of 30000');
            this.cacheTTL = 30000;
        } else {
            this.cacheTTL = ttl;
        }
        return this;
    }

    withRetryPolicy(attempts: number, delay: number): ProviderBuilder {
        if (attempts < 0) {
            logger.warn('Retry attempts must be >= 0, using default value of 3');
            this.retryAttempts = 3;
        } else {
            this.retryAttempts = attempts;
        }

        if (delay < 0) {
            logger.warn('Retry delay must be >= 0, using default value of 1000');
            this.retryDelay = 1000;
        } else {
            this.retryDelay = delay;
        }
        return this;
    }

    withRateLimits(maxRequests: number, windowMs: number): ProviderBuilder {
        if (maxRequests < 1) {
            logger.warn('Max requests must be >= 1, using default value of 10');
            this.maxRequests = 10;
        } else {
            this.maxRequests = maxRequests;
        }

        if (windowMs < 100) {
            logger.warn('Window ms must be >= 100, using default value of 1000');
            this.windowMs = 1000;
        } else {
            this.windowMs = windowMs;
        }
        return this;
    }

    protected createConfig(baseConfig: ProviderConfig): ProviderConfig {
        return {
            ...baseConfig,
            retryAttempts: this.retryAttempts,
            timeout: this.retryDelay,
            rateLimits: {
                maxRequests: this.maxRequests,
                windowMs: this.windowMs,
                retryAfterMs: this.retryDelay
            }
        };
    }
} 