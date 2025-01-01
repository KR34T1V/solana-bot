import type { 
    MarketDataProvider,
    ProviderConfig,
    PriceData,
    OHLCVData,
    OrderBookData,
    ProviderError
} from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import type { TimeFrame } from '$lib/types';
import { logger } from '$lib/server/logger';

export abstract class BaseProvider implements MarketDataProvider {
    abstract readonly name: string;
    abstract readonly priority: number;
    
    constructor(
        public readonly config: ProviderConfig,
        protected cache: Map<string, { data: any; timestamp: number }> = new Map()
    ) {}

    async initialize(): Promise<void> {
        try {
            await this.validateConfig();
            logger.info('Provider initialized:', { provider: this.name });
        } catch (error) {
            logger.error('Provider initialization failed:', { 
                provider: this.name,
                error 
            });
            throw error;
        }
    }

    async validateConfig(): Promise<boolean> {
        try {
            if (!this.config.baseUrl) {
                throw new Error('Base URL is required');
            }

            if (this.config.timeout <= 0) {
                throw new Error('Invalid timeout value');
            }

            if (this.config.retryAttempts < 0) {
                throw new Error('Invalid retry attempts value');
            }

            return true;
        } catch (error) {
            logger.error('Config validation failed:', {
                provider: this.name,
                error
            });
            return false;
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            const response = await fetch(this.config.baseUrl, {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            logger.error('Health check failed:', {
                provider: this.name,
                error
            });
            return false;
        }
    }

    protected getCached<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const { data, timestamp } = entry;
        const age = Date.now() - timestamp;

        if (age > this.config.rateLimits.windowMs) {
            this.cache.delete(key);
            return null;
        }

        return data as T;
    }

    protected setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    protected createError(
        operation: string,
        message: string,
        retryable: boolean = true,
        retryAfter?: number
    ): ProviderError {
        return {
            provider: this.name,
            operation,
            message,
            timestamp: Date.now(),
            retryable,
            retryAfter
        };
    }

    protected async fetchWithRetry(
        url: string,
        options: RequestInit = {},
        attempt: number = 1
    ): Promise<Response> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.status === 429 && attempt < this.config.retryAttempts) {
                const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.fetchWithRetry(url, options, attempt + 1);
            }

            return response;
        } catch (error) {
            if (attempt < this.config.retryAttempts) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.rateLimits.retryAfterMs)
                );
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }

    // Abstract methods that must be implemented by specific providers
    abstract getPrice(token: string): Promise<PriceData>;
    abstract getOHLCV(token: string, timeframe: TimeFrame): Promise<OHLCVData>;
    abstract getOrderBook(token: string, depth?: number): Promise<OrderBookData>;
    abstract searchTokens(query: string): Promise<TokenInfo[]>;
} 