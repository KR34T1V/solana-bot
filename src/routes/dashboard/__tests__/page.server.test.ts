import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../+page.server';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

vi.mock('$lib/server/prisma', () => ({
  prisma: {
    strategy: {
      findMany: vi.fn()
    },
    backtest: {
      findMany: vi.fn()
    }
  }
}));

describe('Dashboard Page Server Load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to login if user is not authenticated', async () => {
    try {
      await load({ locals: { userId: undefined } } as any);
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toMatchObject({
        status: 302,
        location: '/auth/login'
      });
    }
  });

  it('should return strategies, pending backtests and stats for authenticated user', async () => {
    const mockStrategy = {
      id: 'test-strategy',
      name: 'Test Strategy',
      type: 'MEAN_REVERSION',
      config: JSON.stringify({ param: 'value' }),
      userId: 'test-user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentVersion: 1,
      versions: [
        {
          id: 'test-version',
          strategyId: 'test-strategy',
          version: 1,
          config: JSON.stringify({ param: 'value' }),
          createdAt: new Date()
        }
      ],
      backtests: [
        {
          id: 'test-backtest',
          strategyId: 'test-strategy',
          pair: 'BTC/USD',
          timeframe: '1h',
          startDate: new Date(),
          endDate: new Date(),
          config: JSON.stringify({ param: 'value' }),
          results: JSON.stringify({ result: 'success' }),
          status: 'COMPLETED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    };

    const mockPendingBacktest = {
      id: 'pending-backtest',
      strategyId: 'test-strategy',
      pair: 'ETH/USD',
      timeframe: '1h',
      startDate: new Date(),
      endDate: new Date(),
      config: JSON.stringify({ param: 'value' }),
      results: JSON.stringify({ result: 'pending' }),
      status: 'RUNNING',
      createdAt: new Date(),
      updatedAt: new Date(),
      strategy: {
        name: 'Test Strategy'
      }
    };

    vi.mocked(prisma.strategy.findMany).mockResolvedValue([mockStrategy]);
    vi.mocked(prisma.backtest.findMany).mockResolvedValue([mockPendingBacktest]);

    const result = await load({ locals: { userId: 'test-user' } } as any);

    expect(prisma.strategy.findMany).toHaveBeenCalledWith({
      where: { userId: 'test-user' },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: true,
        backtests: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    expect(prisma.backtest.findMany).toHaveBeenCalledWith({
      where: {
        strategy: { userId: 'test-user' },
        status: 'RUNNING'
      },
      include: {
        strategy: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    expect(result).toEqual({
      strategies: [{
        ...mockStrategy,
        config: { param: 'value' },
        backtests: undefined
      }],
      pendingBacktests: [mockPendingBacktest],
      stats: {
        totalStrategies: 1,
        activeStrategies: 1,
        totalBacktests: 1,
        successfulBacktests: 1,
        latestStrategies: [{
          id: mockStrategy.id,
          name: mockStrategy.name,
          type: mockStrategy.type,
          createdAt: mockStrategy.createdAt,
          backtestCount: 1,
          versions: 1
        }]
      }
    });
  });

  it('should handle empty strategies and backtests', async () => {
    vi.mocked(prisma.strategy.findMany).mockResolvedValue([]);
    vi.mocked(prisma.backtest.findMany).mockResolvedValue([]);

    const result = await load({ locals: { userId: 'test-user' } } as any);

    expect(result).toEqual({
      strategies: [],
      pendingBacktests: [],
      stats: {
        totalStrategies: 0,
        activeStrategies: 0,
        totalBacktests: 0,
        successfulBacktests: 0,
        latestStrategies: []
      }
    });
  });
}); 