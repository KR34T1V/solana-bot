import { vi } from 'vitest';
import type { TokenPrice, TokenMetadata } from '$lib/types/birdeye.types';

export const mockBirdeyeService = {
  getTokenPrice: vi.fn<[string], Promise<TokenPrice>>(),
  getTokenMetadata: vi.fn<[string], Promise<TokenMetadata>>(),
  getHistoricalPrices: vi.fn<[string, string, string], Promise<TokenPrice[]>>(),
  
  // Helper to setup common mock responses
  setupMockResponses() {
    this.getTokenPrice.mockResolvedValue({
      value: 100.0,
      updateUnixTime: Date.now(),
      updateHour: new Date().getHours()
    });

    this.getTokenMetadata.mockResolvedValue({
      address: 'mock-token-address',
      symbol: 'MOCK',
      name: 'Mock Token',
      decimals: 9
    });

    this.getHistoricalPrices.mockResolvedValue([
      {
        value: 98.0,
        updateUnixTime: Date.now() - 3600000,
        updateHour: new Date().getHours() - 1
      },
      {
        value: 99.0,
        updateUnixTime: Date.now() - 7200000,
        updateHour: new Date().getHours() - 2
      }
    ]);
  },

  // Reset all mocks to their default state
  reset() {
    this.getTokenPrice.mockReset();
    this.getTokenMetadata.mockReset();
    this.getHistoricalPrices.mockReset();
  }
}; 