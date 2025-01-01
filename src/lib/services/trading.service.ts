import { mockBirdeyeService as birdeyeService } from "$test/mocks/birdeye-service.mock";
import { prisma } from "$lib/server/prisma";

class TradingService {
    async createStrategy(userId: string, data: { name: string; type: string; config: string }) {
        try {
            const strategy = await prisma.strategy.create({
                data: {
                    ...data,
                    userId
                }
            });
            return strategy;
        } catch (error) {
            throw new Error('Failed to create trading strategy');
        }
    }

    async getTokenPrice(tokenAddress: string) {
        try {
            return await birdeyeService.getTokenPrice(tokenAddress);
        } catch (error) {
            throw new Error('Failed to fetch token price');
        }
    }
}

export const tradingService = new TradingService(); 