import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import type { PrismaClient } from '@prisma/client';

type Strategy = NonNullable<Awaited<ReturnType<PrismaClient['strategy']['findUnique']>>>;
type StrategyVersion = NonNullable<Awaited<ReturnType<PrismaClient['strategyVersion']['findUnique']>>>;
type Backtest = NonNullable<Awaited<ReturnType<PrismaClient['backtest']['findUnique']>>>;

interface StrategyWithRelations extends Strategy {
  versions: StrategyVersion[];
  backtests: Backtest[];
}

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategy = await prisma.strategy.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        where: {
          version: {
            equals: undefined // Will be replaced with actual version below
          }
        },
        take: 1
      },
      backtests: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  }) as StrategyWithRelations | null;

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to view this strategy');
  }

  // Update the versions query with the current version
  strategy.versions = await prisma.strategyVersion.findMany({
    where: {
      strategyId: strategy.id,
      version: strategy.currentVersion
    }
  });

  const currentVersion = strategy.versions[0];
  if (!currentVersion) {
    throw error(404, 'Strategy version not found');
  }

  // Parse backtest results
  const parsedBacktests = strategy.backtests.map((backtest: Backtest) => ({
    ...backtest,
    results: backtest.results ? JSON.parse(backtest.results) : null
  }));

  return {
    strategy: {
      ...strategy,
      backtests: undefined // Remove backtests from strategy object to avoid duplication
    },
    currentVersion: {
      ...currentVersion,
      // Only parse config and performance if they're strings
      config: typeof currentVersion.config === 'string' ? JSON.parse(currentVersion.config) : currentVersion.config,
      performance: typeof currentVersion.performance === 'string' ? JSON.parse(currentVersion.performance) : currentVersion.performance
    },
    backtests: parsedBacktests
  };
}; 