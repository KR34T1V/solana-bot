import { describe, it, expect, beforeAll } from 'vitest';
import type { MarketDataProvider, ProviderConfig } from '$lib/types/provider.types';
import { mockFetch, resetMocks, createMockResponse } from './setup';
import { logger } from '$lib/server/logger';

export enum ProviderErrorType {
    NotFound = 'NotFound',
    BadRequest = 'BadRequest',
    Unauthorized = 'Unauthorized',
    ServiceUnavailable = 'ServiceUnavailable',
    BadGateway = 'BadGateway',
    Unknown = 'Unknown'
}

export class ProviderError extends Error {
    constructor(
        public readonly type: ProviderErrorType,
        message: string,
        public readonly provider: string
    ) {
        super(message);
        this.name = 'ProviderError';
    }

    static fromHttpStatus(status: number, message?: string, provider?: string): ProviderError {
        let type: ProviderErrorType;
        let defaultMessage: string;

        switch (status) {
            case 400:
                type = ProviderErrorType.BadRequest;
                defaultMessage = 'Bad Request';
                break;
            case 401:
            case 403:
                type = ProviderErrorType.Unauthorized;
                defaultMessage = 'Unauthorized';
                break;
            case 404:
                type = ProviderErrorType.NotFound;
                defaultMessage = 'Not Found';
                break;
            case 502:
                type = ProviderErrorType.BadGateway;
                defaultMessage = 'Bad Gateway';
                break;
            case 503:
                type = ProviderErrorType.ServiceUnavailable;
                defaultMessage = 'Service Unavailable';
                break;
            default:
                type = ProviderErrorType.Unknown;
                defaultMessage = 'Unknown Error';
        }

        return new ProviderError(
            type,
            message || defaultMessage,
            provider || 'unknown'
        );
    }

    static fromError(error: Error, provider: string): ProviderError {
        if (error instanceof ProviderError) {
            return error;
        }

        logger.error(`Provider error from ${provider}:`, error);
        return new ProviderError(
            ProviderErrorType.Unknown,
            error.message || 'Unknown error',
            provider
        );
    }
}

export interface MockData {
    price: {
        success: {
            value: number;
            timestamp: number;
        };
        error: {
            status: number;
            message: string;
        };
    };
    ohlcv: {
        success: Array<{
            timestamp: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        }>;
        error: {
            status: number;
            message: string;
        };
    };
    orderBook: {
        success: {
            asks: Array<{
                price: number;
                size: number;
            }>;
            bids: Array<{
                price: number;
                size: number;
            }>;
            timestamp: number;
        };
        error: {
            status: number;
            message: string;
        };
    };
    tokenSearch: {
        success: Array<{
            address: string;
            chainId: number;
            decimals: number;
            name: string;
            symbol: string;
            logoURI?: string;
        }>;
        error: {
            status: number;
            message: string;
        };
    };
}

export interface ProviderTestConfig {
    name: string;
    mockConfig: {
        baseUrl: string;
        apiKey: string;
    };
    mockData: MockData;
    createProvider: () => any;
}

export class ProviderTestFactory {
    constructor(private readonly config: ProviderTestConfig) {}

    async runInitializationTests(): Promise<void> {
        describe(`${this.config.name} Provider Initialization`, () => {
            it('should initialize successfully with valid config', async () => {
                const provider = this.config.createProvider();
                await expect(provider.initialize()).resolves.not.toThrow();
            });

            it('should validate config successfully', async () => {
                const provider = this.config.createProvider();
                const isValid = await provider.validateConfig();
                expect(isValid).toBe(true);
            });

            it('should pass health check', async () => {
                const provider = this.config.createProvider();
                const isHealthy = await provider.healthCheck();
                expect(isHealthy).toBe(true);
            });
        });
    }

    async runPriceTests(): Promise<void> {
        describe(`${this.config.name} Provider Price Tests`, () => {
            it('should fetch price successfully', async () => {
                const provider = this.config.createProvider();
                const mockData = this.config.mockData.price.success;
                const result = await provider.getPrice('mock-token-address');
                expect(result).toEqual({
                    value: mockData.value,
                    timestamp: mockData.timestamp,
                    source: this.config.name
                });
            });

            it('should handle price fetch error', async () => {
                const provider = this.config.createProvider();
                const mockError = this.config.mockData.price.error;
                await expect(provider.getPrice('invalid-token')).rejects.toThrow(
                    new ProviderError(
                        ProviderErrorType.NotFound,
                        mockError.message,
                        this.config.name
                    )
                );
            });
        });
    }

    async runOHLCVTests(): Promise<void> {
        describe(`${this.config.name} Provider OHLCV Tests`, () => {
            it('should fetch OHLCV data successfully', async () => {
                const provider = this.config.createProvider();
                const mockData = this.config.mockData.ohlcv.success;
                const result = await provider.getOHLCV('mock-token-address', '1h');
                expect(result).toEqual({
                    data: mockData,
                    source: this.config.name
                });
            });

            it('should handle OHLCV fetch error', async () => {
                const provider = this.config.createProvider();
                const mockError = this.config.mockData.ohlcv.error;
                await expect(provider.getOHLCV('invalid-token', '1h')).rejects.toThrow(
                    new ProviderError(
                        ProviderErrorType.BadRequest,
                        mockError.message,
                        this.config.name
                    )
                );
            });
        });
    }

    async runOrderBookTests(): Promise<void> {
        describe(`${this.config.name} Provider Order Book Tests`, () => {
            it('should fetch order book successfully', async () => {
                const provider = this.config.createProvider();
                const mockData = this.config.mockData.orderBook.success;
                const result = await provider.getOrderBook('mock-token-address');
                expect(result).toEqual({
                    asks: mockData.asks,
                    bids: mockData.bids,
                    timestamp: mockData.timestamp,
                    source: this.config.name
                });
            });

            it('should handle order book fetch error', async () => {
                const provider = this.config.createProvider();
                const mockError = this.config.mockData.orderBook.error;
                await expect(provider.getOrderBook('invalid-token')).rejects.toThrow(
                    new ProviderError(
                        ProviderErrorType.ServiceUnavailable,
                        mockError.message,
                        this.config.name
                    )
                );
            });
        });
    }

    async runTokenSearchTests(): Promise<void> {
        describe(`${this.config.name} Provider Token Search Tests`, () => {
            it('should search tokens successfully', async () => {
                const provider = this.config.createProvider();
                const mockData = this.config.mockData.tokenSearch.success;
                const result = await provider.searchTokens('mock-query');
                expect(result).toEqual(mockData);
            });

            it('should handle token search error', async () => {
                const provider = this.config.createProvider();
                const mockError = this.config.mockData.tokenSearch.error;
                await expect(provider.searchTokens('invalid-query')).rejects.toThrow(
                    new ProviderError(
                        ProviderErrorType.BadGateway,
                        mockError.message,
                        this.config.name
                    )
                );
            });
        });
    }

    async runAllTests(): Promise<void> {
        describe(`${this.config.name} Provider Tests`, () => {
            beforeAll(async () => {
                await this.runInitializationTests();
                await this.runPriceTests();
                await this.runOHLCVTests();
                await this.runOrderBookTests();
                await this.runTokenSearchTests();
            });
        });
    }
} 