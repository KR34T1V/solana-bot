import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, MockResponses } from '../../utils/test-utils';

// Mock implementation of TradingService for testing
class TradingService {
  async submitOrder(order: any) {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error('Failed to submit order');
    return response.json();
  }
}

describe('TradingService', () => {
  let tradingService: TradingService;
  
  beforeEach(() => {
    tradingService = new TradingService();
    // Reset all mocks before each test
    vi.resetAllMocks();
  });

  describe('submitOrder', () => {
    it('should successfully submit a valid order', async () => {
      // Arrange
      const mockOrder = TestDataFactory.createMockOrder();
      const expectedResponse = { ...mockOrder, status: 'accepted' };
      global.fetch = MockResponses.mockFetchSuccess(expectedResponse);

      // Act
      const result = await tradingService.submitOrder(mockOrder);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(fetch).toHaveBeenCalledWith('/api/orders', {
        method: 'POST',
        body: JSON.stringify(mockOrder),
      });
    });

    it('should throw an error when order submission fails', async () => {
      // Arrange
      const mockOrder = TestDataFactory.createMockOrder();
      global.fetch = MockResponses.mockFetchError('Invalid order');

      // Act & Assert
      await expect(tradingService.submitOrder(mockOrder))
        .rejects
        .toThrow('Failed to submit order');
    });
  });
}); 