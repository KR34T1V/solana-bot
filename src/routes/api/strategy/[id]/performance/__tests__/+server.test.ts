import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { prisma } from '$lib/server/prisma';
import { logger } from '$lib/server/logger';
import { error, json } from '@sveltejs/kit';
import type { Strategy, StrategyVersion } from '@prisma/client';
import type { HttpError } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    strategy: {
      findUnique: vi.fn()
    },
    backtest: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('$lib/server/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  },
  logError: vi.fn()
}));

describe('GET /api/strategy/[id]/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    let thrownError: HttpError | undefined;
    try {
      await GET({
        locals: { userId: null },
        params: { id: 'test-strategy-id' }
      } as any);
    } catch (err) {
      thrownError = err as HttpError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.status).toBe(401);
    expect(thrownError?.body.message).toBe('Unauthorized');
    expect(logger.warn).toHaveBeenCalledWith('Unauthorized access attempt to strategy performance', {
      strategyId: 'test-strategy-id'
    });
  });

  it('should return 404 if strategy is not found', async () => {
    vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null);

    let thrownError: HttpError | undefined;
    try {
      await GET({
        locals: { userId: 'test-user-id' },
        params: { id: 'test-strategy-id' }
      } as any);
    } catch (err) {
      thrownError = err as HttpError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.status).toBe(404);
    expect(thrownError?.body.message).toBe('Strategy not found');
    expect(logger.warn).toHaveBeenCalledWith('Strategy not found', {
      strategyId: 'test-strategy-id',
      userId: 'test-user-id'
    });
  });

  it('should return 403 if user does not own the strategy', async () => {
    vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
      id: 'test-strategy-id',
      userId: 'other-user-id',
      name: 'Test Strategy',
      type: 'mean_reversion',
      config: '{}',
      currentVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Strategy);

    let thrownError: HttpError | undefined;
    try {
      await GET({
        locals: { userId: 'test-user-id' },
        params: { id: 'test-strategy-id' }
      } as any);
    } catch (err) {
      thrownError = err as HttpError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.status).toBe(403);
    expect(thrownError?.body.message).toBe('Not authorized');
    expect(logger.warn).toHaveBeenCalledWith('Unauthorized access attempt to strategy', {
      strategyId: 'test-strategy-id',
      userId: 'test-user-id'
    });
  });

  it('should return performance metrics for strategy with backtests', async () => {
    const now = new Date();
    const mockStrategy = {
      id: 'test-strategy-id',
      userId: 'test-user-id',
      name: 'Test Strategy',
      type: 'mean_reversion',
      config: '{}',
      currentVersion: 1,
      createdAt: now,
      updatedAt: now
    } as Strategy;

    const mockBacktests = [
      {
        id: 'backtest-1',
        strategyId: 'test-strategy-id',
        pair: 'SOL/USDC',
        timeframe: '1h',
        startDate: now,
        endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        config: '{}',
        results: JSON.stringify({
          totalTrades: 10,
          winningTrades: 6,
          losingTrades: 4,
          profitFactor: 1.5,
          netProfit: 1000,
          maxDrawdown: 200,
          sharpeRatio: 2.1,
          trades: [
            { timestamp: now.toISOString(), type: 'LONG', price: 100, profit: 50 },
            { timestamp: now.toISOString(), type: 'SHORT', price: 150, profit: -20 }
          ]
        }),
        status: 'COMPLETED',
        createdAt: now,
        updatedAt: now,
        version: 1
      }
    ];

    const mockStrategyWithVersions = {
      ...mockStrategy,
      versions: [
        {
          id: 'version-1',
          strategyId: 'test-strategy-id',
          version: 1,
          config: '{}',
          createdAt: now,
          strategy: mockStrategy
        } as StrategyVersion & { strategy: Strategy }
      ]
    };

    vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategyWithVersions);
    vi.mocked(prisma.backtest.findMany).mockResolvedValueOnce(mockBacktests);

    const response = await GET({
      locals: { userId: 'test-user-id' },
      params: { id: 'test-strategy-id' }
    } as any);

    const data = await response.json();
    expect(data).toEqual({
      totalBacktests: 1,
      completedBacktests: 1,
      averageMetrics: {
        totalTrades: 10,
        winRate: 0.6,
        profitFactor: 1.5,
        netProfit: 1000,
        maxDrawdown: 200,
        sharpeRatio: 2.1
      },
      trades: [
        { timestamp: now.toISOString(), type: 'LONG', price: 100, profit: 50 },
        { timestamp: now.toISOString(), type: 'SHORT', price: 150, profit: -20 }
      ]
    });
  });

  it('should return 500 if an error occurs', async () => {
    vi.mocked(prisma.strategy.findUnique).mockRejectedValueOnce(new Error('Database error'));

    let thrownError: HttpError | undefined;
    try {
      await GET({
        locals: { userId: 'test-user-id' },
        params: { id: 'test-strategy-id' }
      } as any);
    } catch (err) {
      thrownError = err as HttpError;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.status).toBe(500);
    expect(thrownError?.body.message).toBe('An error occurred while fetching strategy performance');
    expect(logger.error).toHaveBeenCalledWith('Error fetching strategy', {
      error: expect.any(Error),
      strategyId: 'test-strategy-id',
      userId: 'test-user-id'
    });
  });
}); 