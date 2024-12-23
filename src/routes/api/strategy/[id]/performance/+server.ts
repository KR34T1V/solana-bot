import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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

interface VersionPerformance {
  version: number;
  performance: PerformanceMetrics;
}

interface BacktestResult {
  id: string;
  createdAt: Date;
  status: string;
  results: {
    totalTrades: number;
    profitableTrades: number;
    trades: Array<{
      timestamp: string;
      type: string;
      price: number;
      amount: number;
      profit: number;
    }>;
  };
}

interface StrategyWithVersions extends Strategy {
  versions: Array<StrategyVersionWithStrategy>;
}

interface StrategyVersionWithStrategy extends StrategyVersion {
  strategy: Strategy & {
    backtests: Backtest[];
  };
}

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.userId) {
    return new Response('Unauthorized', { status: 401 });
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
  }) as StrategyWithVersions | null;

  if (!strategy) {
    return new Response('Strategy not found', { status: 404 });
  }

  if (strategy.userId !== locals.userId) {
    return new Response('Not authorized', { status: 403 });
  }

  // Get all backtests for this strategy
  const backtests = await prisma.backtest.findMany({
    where: {
      strategyId: params.id,
      status: 'COMPLETED'
    }
  });

  // Calculate performance for each version
  const versionsWithPerformance: VersionPerformance[] = await Promise.all(
    strategy.versions.map(async (version: StrategyVersionWithStrategy) => {
      // Get backtests for this version
      const versionBacktests = backtests.filter(
        (backtest: Backtest) => 
          backtest.createdAt >= version.createdAt && 
          (!strategy.versions.find((v: StrategyVersionWithStrategy) => v.version === version.version + 1) || 
           backtest.createdAt < strategy.versions.find((v: StrategyVersionWithStrategy) => v.version === version.version + 1)!.createdAt)
      );

      // Calculate performance metrics
      const performance = await calculateVersionPerformance(versionBacktests);

      // Update version with performance metrics
      await prisma.strategyVersion.update({
        where: {
          strategyId_version: {
            strategyId: params.id,
            version: version.version
          }
        },
        data: {
          performance: performance,
          lastTestedAt: new Date()
        }
      });

      return {
        version: version.version,
        performance
      };
    })
  );

  const backtestResults: BacktestResult[] = backtests.map((b: Backtest) => ({
    id: b.id,
    createdAt: b.createdAt,
    status: b.status,
    results: JSON.parse(b.results)
  }));

  return json({
    strategy: {
      id: strategy.id,
      name: strategy.name,
      currentVersion: strategy.currentVersion
    },
    versions: versionsWithPerformance,
    backtests: backtestResults
  });
}; 