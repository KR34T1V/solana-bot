import type { 
    MarketDataProvider,
    PriceData,
    OHLCVData,
    OrderBookData,
    TimeFrame,
    ProviderConfig
} from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { logger } from '$lib/server/logger';
import { ProviderFactory } from './providers/factory/provider.factory';
import { BirdeyeProviderBuilder } from './providers/factory/birdeye.builder';
import { JupiterProviderBuilder } from './providers/factory/jupiter.builder';

export class MarketDataService {
    private providers: MarketDataProvider[] = [];
    private factory: ProviderFactory;

    constructor() {
        this.factory = ProviderFactory.getInstance();
        this.initializeProviders();
    }

    private initializeProviders(): void {
        // Register builders
        this.factory.registerBuilder('birdeye', new BirdeyeProviderBuilder()
            .withPriority(1)
            .withCacheTTL(30000)
            .withRetryPolicy(3, 1000)
            .withRateLimits(10, 1000));
            
        this.factory.registerBuilder('jupiter', new JupiterProviderBuilder()
            .withPriority(2)
            .withCacheTTL(30000)
            .withRetryPolicy(3, 1000)
            .withRateLimits(10, 1000));
    }

    private sortProviders(): void {
        this.providers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Registers a new market data provider with the service.
     * Providers are sorted by priority (highest first) after registration.
     */
    async registerProvider(name: string, config: ProviderConfig): Promise<void> {
        try {
            const provider = this.factory.createProvider(name, config);
            
            // Validate provider configuration first
            const isValid = await provider.validateConfig();
            if (!isValid) {
                throw new Error(`Invalid configuration for provider ${name}`);
            }

            // Initialize the provider
            await provider.initialize();

            // Add provider and sort by priority (highest first)
            this.providers.push(provider);
            this.sortProviders();

            logger.info(`Registered provider ${name} with priority ${provider.priority}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to register provider ${name}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Gets the current price for a token from available providers.
     * Falls back to lower priority providers if higher priority ones fail.
     */
    async getPrice(tokenAddress: string): Promise<PriceData> {
        const errors: Error[] = [];

        for (const provider of this.providers) {
            try {
                const price = await provider.getPrice(tokenAddress);
                if (!price || typeof price.value === 'undefined') {
                    logger.error(`Provider ${provider.name} returned invalid price data`);
                    continue;
                }
                return price;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to get price: ${errorMessage}`);
                errors.push(error instanceof Error ? error : new Error(errorMessage));
                continue;
            }
        }

        const errorMessages = errors.map(e => e.message).join('; ');
        throw new Error(`Failed to fetch price from all providers: ${errorMessages}`);
    }

    /**
     * Gets OHLCV data for a token from available providers.
     * Falls back to lower priority providers if higher priority ones fail.
     */
    async getOHLCV(
        tokenAddress: string, 
        timeFrame: TimeFrame, 
        limit: number = 100
    ): Promise<OHLCVData> {
        for (const provider of this.providers) {
            try {
                const ohlcv = await provider.getOHLCV(tokenAddress, timeFrame, limit);
                return ohlcv;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to get OHLCV: ${errorMessage}`);
                continue;
            }
        }
        throw new Error('Failed to fetch OHLCV from all providers');
    }

    /**
     * Gets order book data for a token from available providers.
     * Falls back to lower priority providers if higher priority ones fail.
     */
    async getOrderBook(
        tokenAddress: string, 
        depth: number = 100
    ): Promise<OrderBookData> {
        for (const provider of this.providers) {
            try {
                const orderBook = await provider.getOrderBook(tokenAddress, depth);
                return orderBook;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to get order book: ${errorMessage}`);
                continue;
            }
        }
        throw new Error('Failed to fetch order book from all providers');
    }

    /**
     * Search for tokens across all providers
     */
    async searchTokens(query: string): Promise<TokenInfo[]> {
        const results: TokenInfo[] = [];
        const seen = new Set<string>();
        const errors: Error[] = [];

        for (const provider of this.providers) {
            try {
                const tokens = await provider.searchTokens(query);
                
                // Deduplicate tokens by address
                for (const token of tokens) {
                    if (!seen.has(token.address)) {
                        seen.add(token.address);
                        results.push(token);
                    }
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to search tokens: ${errorMessage}`);
                errors.push(error instanceof Error ? error : new Error(errorMessage));
                continue;
            }
        }

        if (results.length === 0) {
            const errorMessages = errors.map(e => e.message).join('; ');
            throw new Error(`Failed to search tokens from all providers: ${errorMessages}`);
        }

        return results;
    }

    /**
     * Gets all registered providers.
     */
    getProviders(): MarketDataProvider[] {
        return [...this.providers];
    }
} 