import type { PageServerLoad, Actions } from './$types';
import { DatabaseService } from '$lib/server/services/database';
import { prisma } from '$lib/server/database';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ depends }) => {
  // Add dependency on 'trades' for real-time updates
  depends('trades');
  
  const [stats, activeStrategies] = await Promise.all([
    DatabaseService.getTradeStats(),
    DatabaseService.getActiveStrategies()
  ]);

  return {
    stats: {
      totalTrades: stats.totalTrades,
      successRate: stats.successRate.toFixed(1),
      profitLoss: `${stats.profitLoss > 0 ? '+' : ''}${stats.profitLoss.toFixed(1)}%`,
      activeStrategies: activeStrategies.length
    },
    strategies: activeStrategies
  };
};

export const actions: Actions = {
  createStrategy: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const description = data.get('description')?.toString();
    const config = data.get('config')?.toString();

    if (!name) {
      return fail(400, { error: 'Strategy name is required' });
    }

    try {
      const strategy = await DatabaseService.createStrategy(
        name, 
        description,
        config ? JSON.parse(config) : undefined
      );
      return { success: true, strategy };
    } catch (error) {
      return fail(500, { error: 'Failed to create strategy' });
    }
  },

  toggleStrategy: async ({ request }) => {
    const data = await request.formData();
    const strategyId = Number(data.get('strategyId'));
    const isActive = data.get('isActive') === 'true';

    if (!strategyId) {
      return fail(400, { error: 'Strategy ID is required' });
    }

    try {
      await prisma.strategy.update({
        where: { id: strategyId },
        data: { isActive }
      });
      return { success: true };
    } catch (error) {
      return fail(500, { error: 'Failed to update strategy' });
    }
  },

  deleteStrategy: async ({ request }) => {
    const data = await request.formData();
    const strategyId = Number(data.get('strategyId'));

    if (!strategyId) {
      return fail(400, { error: 'Strategy ID is required' });
    }

    try {
      await prisma.strategy.delete({
        where: { id: strategyId }
      });
      return { success: true };
    } catch (error) {
      return fail(500, { error: 'Failed to delete strategy' });
    }
  },

  viewHistory: async () => {
    const trades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { strategy: true }
    });

    return { trades };
  },

  createTrade: async ({ request }) => {
    const data = await request.formData();
    const symbol = data.get('symbol')?.toString();
    const entryPrice = Number(data.get('entryPrice'));
    const quantity = Number(data.get('quantity'));
    const side = data.get('side')?.toString();
    const strategyId = Number(data.get('strategyId'));

    if (!symbol || !entryPrice || !quantity || !side || !strategyId) {
      return fail(400, { error: 'All trade fields are required' });
    }

    try {
      const trade = await DatabaseService.createTrade({
        symbol,
        entryPrice,
        quantity,
        side,
        strategyId
      });
      return { success: true, trade };
    } catch (error) {
      return fail(500, { error: 'Failed to create trade' });
    }
  },

  closeTrade: async ({ request }) => {
    const data = await request.formData();
    const tradeId = Number(data.get('tradeId'));
    const exitPrice = Number(data.get('exitPrice'));

    if (!tradeId || !exitPrice) {
      return fail(400, { error: 'Trade ID and exit price are required' });
    }

    try {
      const trade = await DatabaseService.closeTrade(tradeId, exitPrice);
      return { success: true, trade };
    } catch (error) {
      return fail(500, { error: 'Failed to close trade' });
    }
  }
}; 