import { vi } from 'vitest';

export type TokenPrice = {
  value: number;
  updateUnixTime: number;
  updateHour: number;
};

export const mockBirdeyeService = {
  getTokenPrice: vi.fn().mockImplementation(async (address: string): Promise<TokenPrice> => ({
    value: 0,
    updateUnixTime: 0,
    updateHour: 0
  })),
  getHistoricalPrices: vi.fn().mockImplementation(async (address: string, timeframe: string, apiKey: string): Promise<TokenPrice[]> => []),
  setupMockResponses: () => {
    mockBirdeyeService.getTokenPrice.mockResolvedValue({
      value: 100.0,
      updateUnixTime: Date.now(),
      updateHour: new Date().getHours()
    });
    mockBirdeyeService.getHistoricalPrices.mockResolvedValue([
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
  reset: () => {
    mockBirdeyeService.getTokenPrice.mockReset();
    mockBirdeyeService.getHistoricalPrices.mockReset();
  }
}; 