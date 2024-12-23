import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { logger, logError } from '$lib/server/logger';
import type { RequestHandler } from '@sveltejs/kit';

interface Strategy {
  id: string;
  name: string;
  type: string;
  config: string | null;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Backtest {
  id: string;
  strategyId: string;
  pair: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  config: string | null;
  results: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

interface StrategyVersion {
  id: string;
  strategyId: string;
  version: number;
  config: string | null;
  createdAt: Date;
}

interface StrategyWithRelations extends Strategy {
  backtests: Backtest[];
  versions: StrategyVersion[];
}

export const GET: RequestHandler = async ({ locals }: { locals: { userId: string | null } }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      logger.warn('Unauthorized access attempt to dashboard stats');
      return json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.debug('Fetching dashboard stats', { userId });

    // Get strategies with their backtests
    const strategies = await prisma.strategy.findMany({
      where: {
        userId,
      },
      include: {
        backtests: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    }) as StrategyWithRelations[];

    // Calculate stats
    const activeStrategies = strategies.filter((s: StrategyWithRelations) => s.isActive).length;
    const totalBacktests = strategies.reduce((acc: number, s: StrategyWithRelations) => acc + s.backtests.length, 0);
    const successfulBacktests = strategies.reduce((acc: number, s: StrategyWithRelations) => 
      acc + s.backtests.filter((b: Backtest) => b.status === 'COMPLETED').length, 0
    );

    // Get the 5 most recently updated strategies
    const latestStrategies = await prisma.strategy.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      include: {
        versions: true,
        backtests: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    }) as StrategyWithRelations[];

    const stats = {
      totalStrategies: strategies.length,
      activeStrategies,
      totalBacktests,
      successfulBacktests,
      latestStrategies: latestStrategies.map((s: StrategyWithRelations) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        createdAt: s.createdAt,
        backtestCount: s.backtests.length,
        versions: s.versions.length
      }))
    };

    logger.debug('Dashboard stats retrieved', { userId, stats });

    return json(stats);
  } catch (error) {
    logError(error as Error, { 
      path: '/api/dashboard/stats',
      userId: locals.userId 
    });
    return json(
      { message: 'An error occurred while fetching dashboard stats' },
      { status: 500 }
    );
  }
}; 