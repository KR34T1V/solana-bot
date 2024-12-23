import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

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
  });

  if (!strategy) {
    throw error(404, 'Strategy not found');
  }

  if (strategy.userId !== locals.userId) {
    throw error(403, 'Not authorized to view this strategy');
  }

  // Update the version query to get the current version
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

  // Parse JSON fields
  const parsedBacktests = strategy.backtests.map((backtest: Backtest) => ({
    ...backtest,
    config: backtest.config ? JSON.parse(backtest.config) : null,
    results: backtest.results ? JSON.parse(backtest.results) : null
  }));

  return {
    strategy: {
      ...strategy,
      backtests: undefined // Remove backtests from strategy object to avoid duplication
    },
    currentVersion: {
      ...currentVersion,
      config: currentVersion.config ? JSON.parse(currentVersion.config) : null,
      performance: currentVersion.performance ? JSON.parse(currentVersion.performance) : null
    },
    backtests: parsedBacktests
  };
}; 