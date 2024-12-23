import { PrismaClient } from '@prisma/client';
import type { BotStatus } from '$lib/types';

const prisma = new PrismaClient();

export class TradingBotService {
    /**
     * Create a new trading bot
     */
    async createBot(data: {
        name: string;
        userId: string;
        strategyId: string;
        config: Record<string, any>;
    }) {
        return prisma.tradingBot.create({
            data: {
                name: data.name,
                status: 'STOPPED' as BotStatus,
                config: JSON.stringify(data.config),
                userId: data.userId,
                strategyId: data.strategyId,
                wallet: {
                    create: {
                        balance: 0,
                        totalDeposits: 0,
                        totalWithdraws: 0
                    }
                }
            },
            include: {
                wallet: true
            }
        });
    }

    /**
     * Update bot status
     */
    async updateBotStatus(botId: string, status: BotStatus) {
        return prisma.tradingBot.update({
            where: { id: botId },
            data: { status }
        });
    }

    /**
     * Get bot by ID with related data
     */
    async getBotById(botId: string) {
        return prisma.tradingBot.findUnique({
            where: { id: botId },
            include: {
                wallet: {
                    include: {
                        positions: {
                            where: {
                                status: 'OPEN'
                            }
                        }
                    }
                },
                trades: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10
                }
            }
        });
    }

    /**
     * Get all bots for a user
     */
    async getUserBots(userId: string) {
        return prisma.tradingBot.findMany({
            where: { userId },
            include: {
                wallet: true,
                strategy: true
            }
        });
    }

    /**
     * Delete a bot and all related data
     */
    async deleteBot(botId: string) {
        return prisma.tradingBot.delete({
            where: { id: botId }
        });
    }

    /**
     * Update bot configuration
     */
    async updateBotConfig(botId: string, config: Record<string, any>) {
        return prisma.tradingBot.update({
            where: { id: botId },
            data: {
                config: JSON.stringify(config)
            }
        });
    }
} 