import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock } from '$test/setup';
import { createMockUser } from '$test/factories/user.factory';
import { mockBirdeyeService } from '$test/mocks/birdeye-service.mock';
import type { User } from '@prisma/client';
import { tradingService } from '../trading.service';

describe('TradingService', () => {
  let mockUser: User;

  beforeEach(() => {
    mockUser = createMockUser();
    mockBirdeyeService.setupMockResponses();
  });

  describe('createTradingStrategy', () => {
    it('should create a new trading strategy', async () => {
      // Arrange
      const strategyData = {
        name: 'Test Strategy',
        type: 'MOMENTUM',
        config: JSON.stringify({
          timeframe: '1H',
          threshold: 0.05
        })
      };

      const mockStrategy = {
        id: 'mock-strategy-id',
        userId: mockUser.id,
        currentVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...strategyData
      };

      prismaMock.strategy.create.mockResolvedValue(mockStrategy);

      // Act
      const result = await tradingService.createStrategy(mockUser.id, strategyData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(strategyData.name);
      expect(result.type).toBe(strategyData.type);
      expect(prismaMock.strategy.create).toHaveBeenCalledWith({
        data: {
          ...strategyData,
          userId: mockUser.id
        }
      });
    });
  });

  describe('getTokenPrice', () => {
    it('should fetch and return token price', async () => {
      // Arrange
      const tokenAddress = 'mock-token-address';
      const mockPrice = {
        value: 100.0,
        updateUnixTime: Date.now(),
        updateHour: new Date().getHours()
      };

      mockBirdeyeService.getTokenPrice.mockResolvedValue(mockPrice);

      // Act
      const result = await tradingService.getTokenPrice(tokenAddress);

      // Assert
      expect(result).toEqual(mockPrice);
      expect(mockBirdeyeService.getTokenPrice).toHaveBeenCalledWith(tokenAddress);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const tokenAddress = 'invalid-token';
      mockBirdeyeService.getTokenPrice.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(tradingService.getTokenPrice(tokenAddress))
        .rejects
        .toThrow('Failed to fetch token price');
    });
  });
}); 