import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

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

interface Version {
  id: string;
  strategyId: string;
  version: number;
  config: string | null;
  createdAt: Date;
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

interface StrategyWithRelations extends Strategy {
  versions: Version[];
  backtests: Backtest[];
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.userId) {
    throw redirect(302, '/auth/login');
  }

  const strategies = await prisma.strategy.findMany({
    where: { 
      userId: locals.userId 
    },
    orderBy: { 
      updatedAt: 'desc' 
    },
    include: {
      versions: true,
      backtests: {
        where: {
          status: 'COMPLETED'
        }
      }
    }
  }) as StrategyWithRelations[];

  const pendingBacktests = await prisma.backtest.findMany({
    where: {
      strategy: {
        userId: locals.userId
      },
      status: 'RUNNING'
    },
    include: {
      strategy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get the 5 most recently updated strategies with their stats
  const latestStrategies = strategies.slice(0, 5).map((strategy: StrategyWithRelations) => ({
    id: strategy.id,
    name: strategy.name,
    type: strategy.type,
    createdAt: strategy.createdAt,
    backtestCount: strategy.backtests.length,
    versions: strategy.versions.length
  }));

  const stats = {
    totalStrategies: strategies.length,
    activeStrategies: strategies.filter((s: StrategyWithRelations) => s.isActive).length,
    totalBacktests: strategies.reduce((acc: number, s: StrategyWithRelations) => acc + s.backtests.length, 0),
    successfulBacktests: strategies.reduce((acc: number, s: StrategyWithRelations) => 
      acc + s.backtests.filter((b: Backtest) => b.status === 'COMPLETED').length, 0
    ),
    latestStrategies
  };

  return {
    strategies: strategies.map((strategy: StrategyWithRelations) => ({
      ...strategy,
      config: strategy.config ? JSON.parse(strategy.config) : null,
      backtests: undefined // Remove backtests to avoid duplication
    })),
    pendingBacktests,
    stats
  };
}; 