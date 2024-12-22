import { prisma } from '../database';
import type { Strategy, Trade } from '@prisma/client';

export class DatabaseService {
  // Strategy operations
  static async createStrategy(name: string, description?: string, config?: Record<string, any>) {
    return prisma.strategy.create({
      data: {
        name,
        description,
        configJson: config ? JSON.stringify(config) : null,
      },
    });
  }

  static async getActiveStrategies() {
    const strategies = await prisma.strategy.findMany({
      where: { isActive: true },
      include: { trades: true },
    });

    return strategies.map(strategy => ({
      ...strategy,
      config: strategy.configJson ? JSON.parse(strategy.configJson) : null,
    }));
  }

  // Trade operations
  static async createTrade(data: {
    symbol: string;
    entryPrice: number;
    quantity: number;
    side: string;
    strategyId: number;
  }) {
    return prisma.trade.create({
      data: {
        ...data,
        status: 'OPEN',
      },
    });
  }

  static async closeTrade(tradeId: number, exitPrice: number) {
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error('Trade not found');

    const profitLoss = (exitPrice - trade.entryPrice) * trade.quantity;
    
    return prisma.trade.update({
      where: { id: tradeId },
      data: {
        exitPrice,
        status: 'CLOSED',
        profitLoss,
      },
    });
  }

  // Settings operations
  static async getSetting(key: string) {
    const setting = await prisma.settings.findUnique({
      where: { key },
    });
    return setting?.value;
  }

  static async setSetting(key: string, value: string) {
    return prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // Statistics
  static async getTradeStats() {
    const trades = await prisma.trade.findMany({
      where: { status: 'CLOSED' },
    });

    const totalTrades = trades.length;
    const profitableTrades = trades.filter(trade => (trade.profitLoss || 0) > 0).length;
    const totalProfitLoss = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

    return {
      totalTrades,
      successRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      profitLoss: totalProfitLoss,
    };
  }
} 