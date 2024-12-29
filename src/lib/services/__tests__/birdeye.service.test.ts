import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BirdeyeService } from '../birdeye.service';
import { mockFetch } from '../../../test/setup';
import type { BirdeyeOHLCVResponse, BirdeyePriceResponse } from '$lib/types/birdeye.types';

const TEST_API_KEY = 'test-api-key';

describe('BirdeyeService', () => {
  let service: BirdeyeService;
  
  beforeEach(() => {
    service = new BirdeyeService();
    vi.clearAllMocks();
  });

  describe('verifyApiKey', () => {
    it('should verify valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await service.verifyApiKey(TEST_API_KEY);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/defi/price'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': TEST_API_KEY
          })
        })
      );
    });

    it('should reject invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await service.verifyApiKey(TEST_API_KEY);
      expect(result).toBe(false);
    });
  });

  describe('getTokenPrice', () => {
    const mockPrice: BirdeyePriceResponse = {
      success: true,
      data: {
        value: 1.23,
        updateUnixTime: Date.now()
      }
    };

    it('should fetch price for valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrice)
      });

      const result = await service.getTokenPrice('token123', TEST_API_KEY);
      expect(result).toEqual(mockPrice);
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(service.getTokenPrice('token123', TEST_API_KEY)).rejects.toThrow('API Error');
    });

    it('should use cached price when available', async () => {
      // First call - actual API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrice)
      });

      await service.getTokenPrice('token123', TEST_API_KEY);

      // Second call - should use cache
      const result = await service.getTokenPrice('token123', TEST_API_KEY);
      
      expect(result).toEqual(mockPrice);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOHLCVData', () => {
    const mockOHLCV: BirdeyeOHLCVResponse = {
      success: true,
      data: {
        items: [{
          unixTime: Date.now(),
          open: 1.0,
          high: 1.5,
          low: 0.9,
          close: 1.2,
          volume: 1000
        }]
      }
    };

    it('should fetch OHLCV data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOHLCV)
      });

      const result = await service.getOHLCVData('token123', '1h', TEST_API_KEY);
      expect(result).toEqual(mockOHLCV);
    });

    it('should handle invalid timeframe', async () => {
      await expect(
        service.getOHLCVData('token123', 'invalid' as any, TEST_API_KEY)
      ).rejects.toThrow('Invalid timeframe');
    });
  });
}); 