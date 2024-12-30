import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BirdeyeService } from '../birdeye.service';
import { mockFetch } from '../../../test/setup';
import type { BirdeyeOHLCVResponse, BirdeyePriceResponse } from '$lib/types/birdeye.types';
import { mockDeep } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock the logger
vi.mock('$lib/server/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn()
  }
}));

import { logger } from '$lib/server/logger';

const TEST_API_KEY = 'test-api-key-123456';
const TEST_ADDRESS = 'So11111111111111111111111111111111111111112';

describe('BirdeyeService', () => {
  let service: BirdeyeService;
  let mockPrisma: ReturnType<typeof mockDeep<PrismaClient>>;
  
  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new BirdeyeService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should validate Solana address format', async () => {
      const invalidAddress = '123';
      await expect(service.getTokenPrice(invalidAddress, TEST_API_KEY)).rejects.toThrow('Invalid Solana address');
      expect(logger.error).toHaveBeenCalledWith('Invalid Solana address:', { address: invalidAddress });
    });

    it('should validate API key format', async () => {
      const invalidKey = '123';
      await expect(service.getTokenPrice(TEST_ADDRESS, invalidKey)).rejects.toThrow('Invalid API key format');
      expect(logger.error).toHaveBeenCalledWith('Invalid API key:', { apiKey: '***' });
    });

    it('should handle empty API key', async () => {
      await expect(service.getTokenPrice(TEST_ADDRESS, '')).rejects.toThrow('Invalid API key format');
      expect(logger.error).toHaveBeenCalledWith('Invalid API key:', { apiKey: undefined });
    });
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
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await service.verifyApiKey(TEST_API_KEY);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('API key verification failed:', {
        status: 401,
        statusText: 'Unauthorized'
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const result = await service.verifyApiKey(TEST_API_KEY);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('API verification failed:', { error });
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

      const result = await service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY);
      expect(result).toEqual(mockPrice);
      expect(logger.info).toHaveBeenCalledWith('Cache miss for token price:', { address: TEST_ADDRESS });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      await expect(service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY)).rejects.toThrow('Failed to fetch price');
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch price:', {
        address: TEST_ADDRESS,
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);
      
      await expect(service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY)).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching token price:', {
        error,
        address: TEST_ADDRESS
      });
    });

    it('should use cached price when available', async () => {
      // First call - actual API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrice)
      });

      await service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY);
      expect(logger.info).toHaveBeenCalledWith('Cache miss for token price:', { address: TEST_ADDRESS });

      vi.clearAllMocks();

      // Second call - should use cache
      const result = await service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY);
      
      expect(result).toEqual(mockPrice);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cache hit for token price:', { address: TEST_ADDRESS });
    });

    it('should handle cache expiration', async () => {
      const mockPrice: BirdeyePriceResponse = {
        success: true,
        data: {
          value: 1.23,
          updateUnixTime: Date.now()
        }
      };

      // First call - actual API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrice)
      });

      await service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY);
      expect(logger.info).toHaveBeenCalledWith('Cache miss for token price:', { address: TEST_ADDRESS });

      vi.clearAllMocks();

      // Advance time past cache TTL
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 6000); // 6 seconds later

      // Second call - should miss cache due to TTL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPrice)
      });

      await service.getTokenPrice(TEST_ADDRESS, TEST_API_KEY);
      expect(logger.info).toHaveBeenCalledWith('Cache miss for token price:', { address: TEST_ADDRESS });
      expect(mockFetch).toHaveBeenCalled();

      // Restore Date.now
      Date.now = originalNow;
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

      const result = await service.getOHLCVData(TEST_ADDRESS, '1h', TEST_API_KEY);
      expect(result).toEqual(mockOHLCV);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle invalid timeframe', async () => {
      await expect(
        service.getOHLCVData(TEST_ADDRESS, 'invalid' as any, TEST_API_KEY)
      ).rejects.toThrow('Invalid timeframe');
      expect(logger.error).toHaveBeenCalledWith('Invalid timeframe:', {
        timeframe: 'invalid',
        validTimeframes: ['1m', '5m', '15m', '1h', '4h', '1d']
      });
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        service.getOHLCVData(TEST_ADDRESS, '1h', TEST_API_KEY)
      ).rejects.toThrow('Failed to fetch OHLCV data');
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch OHLCV data:', {
        address: TEST_ADDRESS,
        timeframe: '1h',
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      await expect(
        service.getOHLCVData(TEST_ADDRESS, '1h', TEST_API_KEY)
      ).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching OHLCV data:', {
        error,
        address: TEST_ADDRESS,
        timeframe: '1h'
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      await expect(
        service.getOHLCVData(TEST_ADDRESS, '1h', TEST_API_KEY)
      ).rejects.toThrow('Failed to fetch OHLCV data');
      expect(logger.error).toHaveBeenCalledWith('Error fetching OHLCV data:', {
        error: 'Unknown error',
        address: TEST_ADDRESS,
        timeframe: '1h'
      });
    });
  });
}); 