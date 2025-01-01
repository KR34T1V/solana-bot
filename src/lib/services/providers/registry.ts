import type { MarketDataProvider } from '$lib/types/provider.types';
import { logger } from '$lib/server/logger';

export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<string, MarketDataProvider>;
    private fallbackChain: string[];

    private constructor() {
        this.providers = new Map();
        this.fallbackChain = [];
    }

    static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    async registerProvider(provider: MarketDataProvider): Promise<void> {
        try {
            // Initialize and validate provider
            await provider.initialize();
            const isValid = await provider.validateConfig();
            
            if (!isValid) {
                logger.error('Provider validation failed:', { provider: provider.name });
                throw new Error(`Provider validation failed: ${provider.name}`);
            }

            this.providers.set(provider.name, provider);
            this.updateFallbackChain();
            
            logger.info('Provider registered successfully:', { 
                provider: provider.name,
                priority: provider.priority 
            });
        } catch (error) {
            logger.error('Failed to register provider:', { 
                provider: provider.name,
                error 
            });
            throw error;
        }
    }

    getProvider(name: string): MarketDataProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider not found: ${name}`);
        }
        return provider;
    }

    getFallbackChain(): string[] {
        return [...this.fallbackChain];
    }

    private updateFallbackChain(): void {
        this.fallbackChain = Array.from(this.providers.values())
            .sort((a, b) => b.priority - a.priority)
            .map(p => p.name);
        
        logger.info('Updated provider fallback chain:', { chain: this.fallbackChain });
    }

    async healthCheck(): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();
        
        for (const [name, provider] of this.providers) {
            try {
                results.set(name, await provider.healthCheck());
            } catch (error) {
                logger.error('Provider health check failed:', { provider: name, error });
                results.set(name, false);
            }
        }
        
        return results;
    }
} 