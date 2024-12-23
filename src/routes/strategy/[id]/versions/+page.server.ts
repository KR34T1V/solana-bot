import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { calculateVersionPerformance } from '$lib/server/performance';
import type { PrismaClient } from '@prisma/client';

type Strategy = NonNullable<Awaited<ReturnType<PrismaClient['strategy']['findUnique']>>>;
type StrategyVersion = NonNullable<Awaited<ReturnType<PrismaClient['strategyVersion']['findUnique']>>>;
type Backtest = NonNullable<Awaited<ReturnType<PrismaClient['backtest']['findUnique']>>>;

interface PerformanceMetrics {
  timeframes: {
    [key: string]: {
      winRate: number;
      profitFactor: number;
      sharpeRatio: number;
      maxDrawdown: number;
      totalTrades: number;
      profitableTrades: number;
      averageProfit: number;
      averageLoss: number;
    };
  };
  overall: {
    totalBacktests: number;
    bestTimeframe: string;
    worstTimeframe: string;
    averageWinRate: number;
    averageSharpeRatio: number;
  };
}

interface StrategyWithVersions extends Strategy {
  versions: Array<VersionWithPerformance>;
}

interface VersionWithPerformance extends StrategyVersion {
  strategy: Strategy & {
    backtests: Backtest[];
  };
  performance: PerformanceMetrics;
}

interface StrategyVersionWithStrategy extends StrategyVersion {
  strategy: Strategy & {
    backtests: Backtest[];
  };
}

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        include: {
          strategy: {
            include: {
              backtests: true
            }
          }
        }
      }
    }
  });

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to view this strategy');
  }

  // Calculate performance metrics for each version
  const versionsWithPerformance = await Promise.all(
    strategy.versions.map(async (version: StrategyVersionWithStrategy) => {
      // Get backtests for this version
      const backtests = await prisma.backtest.findMany({
        where: {
          strategyId: strategy.id,
          createdAt: {
            // Get backtests created after this version but before the next version
            gte: version.createdAt,
            lt: strategy.versions.find((v: StrategyVersionWithStrategy) => v.version === version.version + 1)?.createdAt
          }
        }
      });

      // Calculate performance metrics
      const performance = await calculateVersionPerformance(backtests);

      return {
        ...version,
        performance
      } as VersionWithPerformance;
    })
  );

  return {
    strategy: {
      ...strategy,
      versions: versionsWithPerformance
    } as StrategyWithVersions
  };
}; 