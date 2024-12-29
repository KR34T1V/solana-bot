import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { logger } from '$lib/server/logger';
import type { Strategy, StrategyVersion } from '@prisma/client';

type StrategyVersionWithStrategy = StrategyVersion & {
  strategy: Strategy;
};

export const GET: RequestHandler = async ({ params, locals }) => {
  const userId = locals.userId;

  if (!userId) {
    logger.warn('Unauthorized access attempt to strategy performance', {
      strategyId: params.id
    });
    throw error(401, 'Unauthorized');
  }

  // Get strategy with versions
  let strategy;
  try {
    strategy = await prisma.strategy.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          include: {
            strategy: true
          }
        }
      }
    });
  } catch (err) {
    logger.error('Error fetching strategy', {
      error: err,
      strategyId: params.id,
      userId
    });
    throw error(500, 'An error occurred while fetching strategy performance');
  }

  if (!strategy) {
    logger.warn('Strategy not found', {
      strategyId: params.id,
      userId
    });
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== userId) {
    logger.warn('Unauthorized access attempt to strategy', {
      strategyId: params.id,
      userId
    });
    throw error(403, 'Not authorized');
  }

  // Get all backtests for this strategy
  let backtests;
  try {
    backtests = await prisma.backtest.findMany({
      where: {
        strategyId: params.id,
        status: 'COMPLETED'
      }
    });
  } catch (err) {
    logger.error('Error fetching backtests', {
      error: err,
      strategyId: params.id,
      userId
    });
    throw error(500, 'An error occurred while fetching strategy performance');
  }

  // Calculate performance metrics
  const totalBacktests = backtests.length;
  const completedBacktests = backtests.filter(b => b.status === 'COMPLETED').length;

  // Calculate average metrics
  const averageMetrics = backtests.reduce((acc, backtest) => {
    const results = JSON.parse(backtest.results);
    return {
      totalTrades: acc.totalTrades + results.totalTrades,
      winRate: acc.winRate + (results.winningTrades / results.totalTrades),
      profitFactor: acc.profitFactor + results.profitFactor,
      netProfit: acc.netProfit + results.netProfit,
      maxDrawdown: acc.maxDrawdown + results.maxDrawdown,
      sharpeRatio: acc.sharpeRatio + results.sharpeRatio
    };
  }, {
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    netProfit: 0,
    maxDrawdown: 0,
    sharpeRatio: 0
  });

  // Average out the metrics
  if (completedBacktests > 0) {
    averageMetrics.totalTrades = Math.round(averageMetrics.totalTrades / completedBacktests);
    averageMetrics.winRate = averageMetrics.winRate / completedBacktests;
    averageMetrics.profitFactor = averageMetrics.profitFactor / completedBacktests;
    averageMetrics.netProfit = averageMetrics.netProfit / completedBacktests;
    averageMetrics.maxDrawdown = averageMetrics.maxDrawdown / completedBacktests;
    averageMetrics.sharpeRatio = averageMetrics.sharpeRatio / completedBacktests;
  }

  // Get all trades from backtests
  const trades = backtests.flatMap(backtest => {
    const results = JSON.parse(backtest.results);
    return results.trades || [];
  });

  return json({
    totalBacktests,
    completedBacktests,
    averageMetrics,
    trades
  });
}; 