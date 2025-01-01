import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BirdeyeProvider } from '../birdeye.builder';
import { ProviderError, ProviderErrorType } from '../errors/provider.error';
import { TimeFrame } from '$lib/types/provider.enums';

// Test-specific provider class that exposes protected methods
class TestBirdeyeProvider extends BirdeyeProvider {
    public async testVerifyApiKey(): Promise<void> {
        return this.verifyApiKey();
    }
}

describe('BirdeyeProvider', () => {
    let provider: TestBirdeyeProvider;
    const mockConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://public-api.birdeye.so'
    };

    beforeEach(() => {
        provider = new TestBirdeyeProvider('birdeye', mockConfig, 1, 60000);
        vi.clearAllMocks();
    });

    describe('verifyApiKey', () => {
        it('should verify valid API key', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    data: []
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.testVerifyApiKey()).resolves.toBeUndefined();
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/public/tokenlist?limit=1'),
                expect.objectContaining({
                    headers: { 'X-API-KEY': 'test-key' }
                })
            );
        });

        it('should throw error for invalid API key', async () => {
            const mockResponse = {
                ok: false,
                status: 401
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.testVerifyApiKey()).rejects.toThrow(ProviderError);
            await expect(provider.testVerifyApiKey()).rejects.toMatchObject({
                type: ProviderErrorType.Unauthorized
            });
        });
    });

    describe('getPrice', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';

        it('should fetch price successfully', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    data: {
                        value: 1.23,
                        updateUnixTime: 1234567890
                    }
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.getPrice(tokenAddress);
            expect(result).toEqual({
                value: 1.23,
                timestamp: 1234567890 * 1000,
                source: 'birdeye'
            });
        });

        it('should throw error for invalid response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: false
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.getPrice(tokenAddress)).rejects.toThrow(ProviderError);
            await expect(provider.getPrice(tokenAddress)).rejects.toMatchObject({
                type: ProviderErrorType.ServiceUnavailable
            });
        });
    });

    describe('getOHLCV', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';

        it('should fetch OHLCV data successfully', async () => {
            const mockCandle = {
                unixTime: 1234567890,
                open: 1.0,
                high: 1.5,
                low: 0.5,
                close: 1.2,
                volume: 1000
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    data: [mockCandle]
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.getOHLCV(tokenAddress, TimeFrame.ONE_HOUR);
            expect(result).toEqual({
                data: [{
                    timestamp: mockCandle.unixTime * 1000,
                    open: mockCandle.open,
                    high: mockCandle.high,
                    low: mockCandle.low,
                    close: mockCandle.close,
                    volume: mockCandle.volume
                }],
                source: 'birdeye'
            });
        });

        it('should throw error for invalid response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: false
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.getOHLCV(tokenAddress, TimeFrame.ONE_HOUR)).rejects.toThrow(ProviderError);
            await expect(provider.getOHLCV(tokenAddress, TimeFrame.ONE_HOUR)).rejects.toMatchObject({
                type: ProviderErrorType.ServiceUnavailable
            });
        });
    });

    describe('searchTokens', () => {
        const query = 'SOL';

        it('should search tokens successfully', async () => {
            const mockToken = {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                name: 'Wrapped SOL',
                decimals: 9,
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    data: [mockToken]
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.searchTokens(query);
            expect(result).toEqual([{
                address: mockToken.address,
                symbol: mockToken.symbol,
                name: mockToken.name,
                decimals: mockToken.decimals,
                logoURI: mockToken.logoURI,
                chainId: 101
            }]);
        });

        it('should throw error for invalid response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: false
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.searchTokens(query)).rejects.toThrow(ProviderError);
            await expect(provider.searchTokens(query)).rejects.toMatchObject({
                type: ProviderErrorType.ServiceUnavailable
            });
        });
    });
}); 