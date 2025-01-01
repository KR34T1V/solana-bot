import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';
import { BirdeyeProviderBuilder } from './birdeye.builder';
import { JupiterProviderBuilder } from './jupiter.builder';
import { logger } from '$lib/server/logger';

export class ProviderFactory {
    private static instance: ProviderFactory;
    private providers: Map<string, MarketDataProvider> = new Map();

    private constructor() {}

    static getInstance(): ProviderFactory {
        if (!ProviderFactory.instance) {
            ProviderFactory.instance = new ProviderFactory();
        }
        return ProviderFactory.instance;
    }

    registerProvider(name: string, config: ProviderConfig): void {
        const normalizedName = name.toLowerCase();
        if (this.providers.has(normalizedName)) {
            logger.warn(`Provider ${name} already registered, skipping...`);
            return;
        }

        let provider: MarketDataProvider;
        switch (normalizedName) {
            case 'birdeye':
                provider = new BirdeyeProviderBuilder()
                    .withPriority(1)
                    .withCacheTTL(60 * 1000) // 1 minute
                    .withRetryAttempts(3)
                    .withMaxRequests(100)
                    .build(config);
                break;
            case 'jupiter':
                provider = new JupiterProviderBuilder()
                    .withPriority(2)
                    .withCacheTTL(30 * 1000) // 30 seconds
                    .withRetryAttempts(3)
                    .withMaxRequests(200)
                    .build(config);
                break;
            default:
                logger.error(`Unknown provider: ${name}`);
                return;
        }

        this.providers.set(normalizedName, provider);
        logger.info(`Registered provider: ${name}`);
    }

    getProvider(name: string): MarketDataProvider | undefined {
        return this.providers.get(name.toLowerCase());
    }

    getAllProviders(): MarketDataProvider[] {
        return Array.from(this.providers.values())
            .sort((a, b) => a.priority - b.priority);
    }

    removeProvider(name: string): void {
        if (this.providers.delete(name.toLowerCase())) {
            logger.info(`Removed provider: ${name}`);
        }
    }

    clearProviders(): void {
        this.providers.clear();
        logger.info('Cleared all providers');
    }
} 