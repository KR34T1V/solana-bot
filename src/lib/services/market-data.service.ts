import type { 
    MarketDataProvider,
    PriceData,
    OHLCVData,
    OrderBookData,
    TimeFrame
} from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { logger } from '$lib/server/logger';

export class MarketDataService {
    private providers: MarketDataProvider[] = [];

    /**
     * Registers a new market data provider with the service.
     * Providers are sorted by priority (highest first) after registration.
     */
    async registerProvider(provider: MarketDataProvider): Promise<void> {
        try {
            // Initialize the provider
            await provider.initialize();

            // Validate provider configuration
            const isValid = await provider.validateConfig();
            if (!isValid) {
                throw new Error(`Invalid configuration for provider ${provider.name}`);
            }

            // Add provider and sort by priority
            this.providers.push(provider);
            this.providers.sort((a, b) => b.priority - a.priority);

            logger.info(`Registered provider ${provider.name} with priority ${provider.priority}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to register provider ${provider.name}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Gets the current price for a token from available providers.
     * Falls back to lower priority providers if higher priority ones fail.
     */
    async getPrice(tokenAddress: string): Promise<PriceData> {
        for (const provider of this.providers) {
            try {
                const price = await provider.getPrice(tokenAddress);
                return price;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to get price: ${errorMessage}`);
                continue;
            }
        }
        throw new Error('Failed to fetch price from all providers');
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
     * Searches for tokens across all providers and merges results.
     * Deduplicates tokens by address, keeping the version from the highest priority provider.
     */
    async searchTokens(query: string): Promise<TokenInfo[]> {
        const tokenMap = new Map<string, TokenInfo>();

        for (const provider of this.providers) {
            try {
                const tokens = await provider.searchTokens(query);
                
                // Only add tokens that haven't been found by higher priority providers
                for (const token of tokens) {
                    if (!tokenMap.has(token.address)) {
                        tokenMap.set(token.address, token);
                    }
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Provider ${provider.name} failed to search tokens: ${errorMessage}`);
                continue;
            }
        }

        return Array.from(tokenMap.values());
    }

    /**
     * Performs health checks on all registered providers.
     * Returns a map of provider names to their health status.
     */
    async healthCheck(): Promise<Map<string, boolean>> {
        const healthStatus = new Map<string, boolean>();

        for (const provider of this.providers) {
            try {
                const isHealthy = await provider.healthCheck();
                healthStatus.set(provider.name, isHealthy);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Health check failed for provider ${provider.name}: ${errorMessage}`);
                healthStatus.set(provider.name, false);
            }
        }

        return healthStatus;
    }

    /**
     * Gets all registered providers.
     */
    getProviders(): MarketDataProvider[] {
        return [...this.providers];
    }
} 