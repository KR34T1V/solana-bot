import { PrismaClient } from '@prisma/client';
import type { TokenPrice } from '$lib/types/birdeye.types';
import { mockBirdeyeService as birdeyeService } from '$lib/test/mocks/birdeye-service.mock';

const prisma = new PrismaClient();

export interface CreateStrategyData {
  name: string;
  type: string;
  config: string;
}

class TradingService {
  async createStrategy(userId: string, data: CreateStrategyData) {
    try {
      return await prisma.strategy.create({
        data: {
          ...data,
          userId
        }
      });
    } catch (error) {
      throw new Error('Failed to create trading strategy');
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    try {
      return await birdeyeService.getTokenPrice(tokenAddress);
    } catch (error) {
      throw new Error('Failed to fetch token price');
    }
  }
}

export const tradingService = new TradingService(); 