import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id: params.id }
  });

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to backtest this strategy');
  }

  // Get available trading pairs for backtesting
  const tradingPairs = [
    { id: 'SOL-USDC', name: 'SOL/USDC', description: 'Solana/USD Coin' },
    { id: 'RAY-USDC', name: 'RAY/USDC', description: 'Raydium/USD Coin' },
    { id: 'ORCA-USDC', name: 'ORCA/USDC', description: 'Orca/USD Coin' }
  ];

  // Get available timeframes for backtesting
  const timeframes = [
    { id: '1m', name: '1 Minute' },
    { id: '5m', name: '5 Minutes' },
    { id: '15m', name: '15 Minutes' },
    { id: '1h', name: '1 Hour' },
    { id: '4h', name: '4 Hours' },
    { id: '1d', name: '1 Day' }
  ];

  return {
    strategy,
    tradingPairs,
    timeframes
  };
};

export const actions = {
  run: async ({ request, params, locals }) => {
    if (!locals.userId) {
      throw redirect(302, '/auth/login');
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id: params.id }
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (strategy.userId !== locals.userId) {
      return { success: false, error: 'Not authorized to backtest this strategy' };
    }

    const formData = await request.formData();
    const pair = formData.get('pair') as string;
    const timeframe = formData.get('timeframe') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const initialBalance = Number(formData.get('initialBalance'));

    if (!pair || !timeframe || !startDate || !endDate || !initialBalance) {
      return { success: false, error: 'Missing required fields' };
    }

    try {
      // Create backtest record with initial empty results
      const backtest = await prisma.backtest.create({
        data: {
          strategyId: strategy.id,
          pair,
          timeframe,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          initialBalance,
          status: 'RUNNING',
          userId: locals.userId,
          results: JSON.stringify({
            totalTrades: 0,
            winRate: 0,
            profitLoss: 0,
            maxDrawdown: 0,
            sharpeRatio: 0
          })
        }
      });

      // In a real application, we would trigger the actual backtesting process here
      // For now, we'll simulate it with a delayed success
      setTimeout(async () => {
        await prisma.backtest.update({
          where: { id: backtest.id },
          data: {
            status: 'COMPLETED',
            results: JSON.stringify({
              totalTrades: 42,
              winRate: 0.65,
              profitLoss: 1250.75,
              maxDrawdown: 450.25,
              sharpeRatio: 1.8
            })
          }
        });
      }, 5000);

      return { success: true, backtest };
    } catch (error) {
      console.error('Backtest creation error:', error);
      return { success: false, error: 'Failed to start backtest' };
    }
  }
} satisfies Actions; 