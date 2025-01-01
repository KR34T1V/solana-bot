import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';
import { ProviderBuilder } from './provider.builder';
import { logger } from '$lib/server/logger';

export class ProviderFactory {
    private static instance: ProviderFactory;
    private builders: Map<string, ProviderBuilder>;

    private constructor() {
        this.builders = new Map();
    }

    static getInstance(): ProviderFactory {
        if (!this.instance) {
            this.instance = new ProviderFactory();
        }
        return this.instance;
    }

    registerBuilder(name: string, builder: ProviderBuilder): void {
        logger.info(`Registering builder for provider: ${name}`);
        this.builders.set(name, builder);
    }

    createProvider(name: string, config: ProviderConfig): MarketDataProvider {
        const builder = this.builders.get(name);
        if (!builder) {
            logger.error(`No builder registered for provider: ${name}`);
            throw new Error(`No builder registered for provider: ${name}`);
        }
        
        logger.info(`Creating provider: ${name}`);
        return builder.build(config);
    }

    getRegisteredProviders(): string[] {
        return Array.from(this.builders.keys());
    }

    hasBuilder(name: string): boolean {
        return this.builders.has(name);
    }
} 