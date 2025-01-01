import { BaseProviderBuilder } from './base.builder';
import { BaseProvider } from '../base.provider';
import type { MarketDataProvider, ProviderConfig, PriceData, OHLCVData } from '$lib/types/provider.types';
import type { TokenInfo } from '$lib/types/token.types';
import { TimeFrame } from '$lib/types/provider.enums';
import { ProviderError, ProviderErrorType } from './errors/provider.error';
import { logger } from '$lib/server/logger';

interface JupiterPrice {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
}

interface JupiterToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    chainId?: number;
    tags?: string[];
}

export class JupiterProvider extends BaseProvider {
    protected async fetchWithRetry<T>(url: string, options: RequestInit & { params?: Record<string, string> }): Promise<Response> {
        const { params, ...rest } = options;
        const queryParams = params ? new URLSearchParams(params).toString() : '';
        const fullUrl = queryParams ? `${url}?${queryParams}` : url;

        return await fetch(fullUrl, rest);
    }

    public async verifyApiKey(): Promise<void> {
        // Jupiter doesn't require API key verification
        return Promise.resolve();
    }

    override async getPrice(tokenAddress: string): Promise<PriceData> {
        const cacheKey = `price:${tokenAddress}`;
        const cached = this.getCachedData<PriceData>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/price`,
                {
                    params: {
                        id: tokenAddress
                    }
                }
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Failed to fetch price', this.name);
            }

            const result = await response.json();
            if (!result.data || typeof result.data.price !== 'number') {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid price data', this.name);
            }

            const price: PriceData = {
                value: result.data.price,
                timestamp: Date.now(),
                source: this.name
            };

            this.setCachedData(cacheKey, price);
            return price;
        } catch (error) {
            logger.error(`Failed to fetch ${this.name} price:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }

    override async getOHLCV(
        tokenAddress: string,
        timeFrame: TimeFrame,
        limit: number = 100
    ): Promise<OHLCVData> {
        // Jupiter doesn't provide OHLCV data
        throw new ProviderError(
            ProviderErrorType.NotImplemented,
            'OHLCV data not available from Jupiter',
            this.name
        );
    }

    override async searchTokens(query: string): Promise<TokenInfo[]> {
        const cacheKey = `search:${query}`;
        const cached = this.getCachedData<TokenInfo[]>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.fetchWithRetry(
                `${this.baseUrl}/tokens`,
                {}
            );

            if (!response.ok) {
                throw ProviderError.fromHttpStatus(response.status, 'Failed to search tokens', this.name);
            }

            const result = await response.json();
            if (!Array.isArray(result)) {
                throw new ProviderError(ProviderErrorType.ServiceUnavailable, 'Invalid search results', this.name);
            }

            const tokens = result
                .filter((token: JupiterToken) => 
                    token.name.toLowerCase().includes(query.toLowerCase()) ||
                    token.symbol.toLowerCase().includes(query.toLowerCase()) ||
                    token.address.toLowerCase() === query.toLowerCase()
                )
                .map((token: JupiterToken) => ({
                    address: token.address,
                    symbol: token.symbol,
                    name: token.name,
                    decimals: token.decimals,
                    logoURI: token.logoURI,
                    chainId: token.chainId || 101 // Default to Solana mainnet
                }));

            this.setCachedData(cacheKey, tokens);
            return tokens;
        } catch (error) {
            logger.error(`Failed to search ${this.name} tokens:`, error);
            if (error instanceof ProviderError) {
                throw error;
            }
            throw ProviderError.fromError(error as Error, this.name);
        }
    }
}

export class JupiterProviderBuilder extends BaseProviderBuilder {
    build(config: ProviderConfig): MarketDataProvider {
        logger.info('Building Jupiter provider with config:', {
            baseUrl: config.baseUrl || 'https://price.jup.ag/v4',
            priority: this.priority,
            cacheTTL: this.cacheTTL,
            retryAttempts: this.retryAttempts,
            maxRequests: this.maxRequests
        });

        const finalConfig = this.createConfig({
            ...config,
            baseUrl: config.baseUrl || 'https://price.jup.ag/v4'
        });

        return new JupiterProvider('jupiter', finalConfig, this.priority, this.cacheTTL);
    }
} 