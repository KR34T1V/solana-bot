import type { MarketDataProvider, ProviderConfig, PriceData, OHLCVData } from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { TimeFrame } from '$lib/types/provider.enums';
import { ProviderError, ProviderErrorType } from './factory/errors/provider.error';
import { logger } from '$lib/server/logger';

export abstract class BaseProvider implements MarketDataProvider {
    private cache: Map<string, { data: any; expiry: number }> = new Map();
    private initialized: boolean = false;

    constructor(
        public readonly name: string,
        protected readonly config: ProviderConfig,
        public readonly priority: number,
        public readonly cacheTTL: number
    ) {}

    protected get apiKey(): string {
        return this.config.apiKey || '';
    }

    protected get baseUrl(): string {
        return this.config.baseUrl || '';
    }

    protected getCachedData<T>(key: string): T | undefined {
        const cached = this.cache.get(key);
        if (!cached) return undefined;

        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        return cached.data as T;
    }

    protected setCachedData<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.cacheTTL
        });
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;
        
        await this.validateConfig();
        await this.verifyApiKey();
        
        this.initialized = true;
    }

    public async validateConfig(): Promise<boolean> {
        if (!this.baseUrl) {
            logger.error(`${this.name}: Base URL is required`);
            return false;
        }

        if (this.config.retryAttempts !== undefined && this.config.retryAttempts < 0) {
            logger.error(`${this.name}: Invalid retry attempts`);
            return false;
        }

        if (this.config.maxRequests !== undefined && this.config.maxRequests < 1) {
            logger.error(`${this.name}: Invalid max requests`);
            return false;
        }

        return true;
    }

    abstract verifyApiKey(): Promise<void>;
    abstract getPrice(tokenAddress: string): Promise<PriceData>;
    abstract getOHLCV(tokenAddress: string, timeFrame: TimeFrame, limit?: number): Promise<OHLCVData>;
    abstract searchTokens(query: string): Promise<TokenInfo[]>;

    protected async fetchWithRetry<T>(url: string, options: RequestInit & { params?: Record<string, string>; headers?: Record<string, string> }): Promise<Response> {
        const maxAttempts = this.config.retryAttempts || 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const { params, headers, ...rest } = options;
                const queryParams = params ? new URLSearchParams(params).toString() : '';
                const fullUrl = queryParams ? `${url}?${queryParams}` : url;

                const response = await fetch(fullUrl, {
                    ...rest,
                    headers: {
                        ...headers,
                        'User-Agent': 'SolanaBot/1.0'
                    }
                });

                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    throw new ProviderError(
                        ProviderErrorType.RateLimitExceeded,
                        `Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds`,
                        this.name
                    );
                }

                return response;
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError || new Error('Unknown error occurred');
    }
} 