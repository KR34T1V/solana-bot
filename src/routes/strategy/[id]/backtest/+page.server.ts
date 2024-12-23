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

  const currentVersion = await prisma.strategyVersion.findUnique({
    where: {
      strategyId_version: {
        strategyId: strategy.id,
        version: strategy.currentVersion
      }
    }
  });

  if (!currentVersion) {
    throw error(404, 'Strategy version not found');
  }

  return {
    strategy,
    currentVersion,
    tradingPairs: ['SOL/USDC', 'BTC/USDC', 'ETH/USDC'],
    timeframes: ['1m', '5m', '15m', '1h', '4h', '1d']
  };
};

export const actions = {
  create: async ({ request, params, locals }) => {
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

    const currentVersion = await prisma.strategyVersion.findUnique({
      where: {
        strategyId_version: {
          strategyId: strategy.id,
          version: strategy.currentVersion
        }
      }
    });

    if (!currentVersion) {
      return { success: false, error: 'Strategy version not found' };
    }

    const formData = await request.formData();
    const pair = formData.get('pair') as string;
    const timeframe = formData.get('timeframe') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const initialBalance = parseFloat(formData.get('initialBalance') as string);

    // Validate required fields
    if (!pair || !timeframe || !startDate || !endDate || !initialBalance) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate trading pair format
    if (!/^[A-Z0-9]+\/[A-Z0-9]+$/.test(pair)) {
      return { success: false, error: 'Invalid trading pair format' };
    }

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      return { success: false, error: 'Invalid timeframe' };
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: 'Invalid date format' };
    }

    if (start > end) {
      return { success: false, error: 'Start date must be before end date' };
    }

    if (end > now) {
      return { success: false, error: 'End date cannot be in the future' };
    }

    // Validate date range based on timeframe
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = {
      '1m': 7,    // 1 week max for 1-minute data
      '5m': 30,   // 1 month max for 5-minute data
      '15m': 90,  // 3 months max for 15-minute data
      '1h': 180,  // 6 months max for hourly data
      '4h': 365,  // 1 year max for 4-hour data
      '1d': 730   // 2 years max for daily data
    };

    if (daysDiff > maxDays[timeframe]) {
      return { 
        success: false, 
        error: `Maximum date range for ${timeframe} timeframe is ${maxDays[timeframe]} days` 
      };
    }

    // Validate initial balance
    if (initialBalance <= 0 || initialBalance > 1000000) {
      return { 
        success: false, 
        error: 'Initial balance must be between 0 and 1,000,000 USDC' 
      };
    }

    try {
      console.log('Creating backtest with:', {
        pair,
        timeframe,
        startDate,
        endDate,
        initialBalance,
        strategyConfig: currentVersion.config
      });

      // Create backtest record
      const backtest = await prisma.backtest.create({
        data: {
          strategyId: params.id,
          pair,
          timeframe,
          startDate: start,
          endDate: end,
          config: JSON.stringify({
            initialBalance,
            strategyConfig: JSON.parse(currentVersion.config)
          }),
          status: 'RUNNING',
          results: JSON.stringify({
            totalTrades: 0,
            profitableTrades: 0,
            trades: []
          })
        }
      });

      // Simulate backtest completion after 2 seconds
      setTimeout(async () => {
        try {
          // Generate sample results
          const results = {
            totalTrades: Math.floor(Math.random() * 100) + 50,
            profitableTrades: Math.floor(Math.random() * 40) + 30,
            trades: Array.from({ length: Math.floor(Math.random() * 100) + 50 }, () => ({
              timestamp: new Date(
                start.getTime() + Math.random() * (end.getTime() - start.getTime())
              ).toISOString(),
              type: Math.random() > 0.5 ? 'BUY' : 'SELL',
              price: 1000 + Math.random() * 100,
              amount: Math.random() * 10,
              profit: (Math.random() - 0.4) * 100
            })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          };

          // Update backtest with results
          const updatedBacktest = await prisma.backtest.update({
            where: { id: backtest.id },
            data: {
              status: 'COMPLETED',
              results: JSON.stringify(results)
            }
          });

          // Calculate performance metrics
          const backtests = await prisma.backtest.findMany({
            where: {
              strategyId: params.id,
              status: 'COMPLETED'
            }
          });

          const performance = {
            timeframes: {
              [timeframe]: {
                winRate: (results.profitableTrades / results.totalTrades) * 100,
                profitFactor: 2.08,
                sharpeRatio: 0.31,
                maxDrawdown: 86.31,
                totalTrades: results.totalTrades,
                profitableTrades: results.profitableTrades,
                averageProfit: 25.54,
                averageLoss: -19.51,
                dateRange: {
                  start: start.toISOString(),
                  end: end.toISOString(),
                  days: daysDiff
                }
              }
            },
            overall: {
              totalBacktests: backtests.length,
              bestTimeframe: timeframe,
              worstTimeframe: timeframe,
              averageWinRate: (results.profitableTrades / results.totalTrades) * 100,
              averageSharpeRatio: 0.31
            }
          };

          // Update strategy version with performance metrics
          await prisma.strategyVersion.update({
            where: {
              strategyId_version: {
                strategyId: params.id,
                version: strategy.currentVersion
              }
            },
            data: {
              performance: JSON.stringify(performance),
              lastTestedAt: new Date()
            }
          });

        } catch (error) {
          console.error('Error updating backtest results:', error);
          await prisma.backtest.update({
            where: { id: backtest.id },
            data: {
              status: 'FAILED',
              results: JSON.stringify({ error: 'Failed to process backtest' })
            }
          });
        }
      }, 2000);

      return { success: true, backtest };
    } catch (error) {
      console.error('Error creating backtest:', error);
      return { success: false, error: 'Failed to create backtest' };
    }
  }
} satisfies Actions; 