import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JupiterProvider } from '../jupiter.builder';
import { ProviderError, ProviderErrorType } from '../errors/provider.error';
import { TimeFrame } from '$lib/types/provider.enums';

// Test-specific provider class that exposes protected methods
class TestJupiterProvider extends JupiterProvider {
    public async testVerifyApiKey(): Promise<void> {
        return this.verifyApiKey();
    }
}

describe('JupiterProvider', () => {
    let provider: TestJupiterProvider;
    const mockConfig = {
        baseUrl: 'https://price.jup.ag/v4'
    };

    beforeEach(() => {
        provider = new TestJupiterProvider('jupiter', mockConfig, 2, 30000);
        vi.clearAllMocks();
    });

    describe('verifyApiKey', () => {
        it('should resolve immediately (no API key required)', async () => {
            await expect(provider.testVerifyApiKey()).resolves.toBeUndefined();
        });
    });

    describe('getPrice', () => {
        const tokenAddress = 'So11111111111111111111111111111111111111112';

        it('should fetch price successfully', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: {
                        price: 1.23
                    }
                })
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.getPrice(tokenAddress);
            expect(result).toEqual({
                value: 1.23,
                timestamp: expect.any(Number),
                source: 'jupiter'
            });
        });

        it('should throw error for invalid response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: null
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

        it('should throw NotImplemented error', async () => {
            await expect(provider.getOHLCV(tokenAddress, TimeFrame.ONE_HOUR)).rejects.toThrow(ProviderError);
            await expect(provider.getOHLCV(tokenAddress, TimeFrame.ONE_HOUR)).rejects.toMatchObject({
                type: ProviderErrorType.NotImplemented,
                message: 'OHLCV data not available from Jupiter'
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
                logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                chainId: 101
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue([mockToken])
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.searchTokens(query);
            expect(result).toEqual([{
                address: mockToken.address,
                symbol: mockToken.symbol,
                name: mockToken.name,
                decimals: mockToken.decimals,
                logoURI: mockToken.logoURI,
                chainId: mockToken.chainId
            }]);
        });

        it('should filter tokens by query', async () => {
            const mockTokens = [
                {
                    address: 'So11111111111111111111111111111111111111112',
                    symbol: 'SOL',
                    name: 'Wrapped SOL',
                    decimals: 9,
                    chainId: 101
                },
                {
                    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    symbol: 'USDC',
                    name: 'USD Coin',
                    decimals: 6,
                    chainId: 101
                }
            ];

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue(mockTokens)
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await provider.searchTokens('SOL');
            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe('SOL');
        });

        it('should throw error for invalid response', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue(null)
            };

            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            await expect(provider.searchTokens(query)).rejects.toThrow(ProviderError);
            await expect(provider.searchTokens(query)).rejects.toMatchObject({
                type: ProviderErrorType.ServiceUnavailable
            });
        });
    });
}); 