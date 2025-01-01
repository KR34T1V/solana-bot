import { BaseProviderBuilder } from './base.builder';
import { BaseProvider } from '../base.provider';
import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';
import { logger } from '$lib/server/logger';

export class JupiterProviderBuilder extends BaseProviderBuilder {
    build(config: ProviderConfig): MarketDataProvider {
        logger.info('Building Jupiter provider with config:', {
            baseUrl: config.baseUrl,
            priority: this.priority,
            cacheTTL: this.cacheTTL,
            retryAttempts: this.retryAttempts,
            maxRequests: this.maxRequests
        });

        const finalConfig = this.createConfig(config);
        return new BaseProvider('jupiter', finalConfig, this.priority, this.cacheTTL);
    }
} 