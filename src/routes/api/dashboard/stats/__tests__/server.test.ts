import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { prisma } from '$lib/server/prisma';
import { logger } from '$lib/server/logger';

// Mock dependencies
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    strategy: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('$lib/server/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn()
  },
  logError: vi.fn()
}));

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const response = await GET({
      locals: { userId: null }
    } as any);

    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
    expect(logger.warn).toHaveBeenCalledWith('Unauthorized access attempt to dashboard stats');
  });

  it('should return dashboard stats for user with no strategies', async () => {
    vi.mocked(prisma.strategy.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const response = await GET({
      locals: { userId: 'test-user-id' }
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({
      totalStrategies: 0,
      activeStrategies: 0,
      totalBacktests: 0,
      successfulBacktests: 0,
      latestStrategies: []
    });
    expect(logger.debug).toHaveBeenCalledWith('Fetching dashboard stats', { userId: 'test-user-id' });
    expect(logger.debug).toHaveBeenCalledWith('Dashboard stats retrieved', {
      userId: 'test-user-id',
      stats: expect.any(Object)
    });
  });

  it('should return dashboard stats for user with strategies', async () => {
    const now = new Date();
    const mockStrategies = [
      {
        id: 'strategy-1',
        name: 'Strategy 1',
        type: 'mean_reversion',
        config: '{"param": "value"}',
        userId: 'test-user-id',
        isActive: true,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
        backtests: [
          {
            id: 'backtest-1',
            strategyId: 'strategy-1',
            pair: 'SOL/USDC',
            timeframe: '1h',
            startDate: now,
            endDate: now,
            config: '{"param": "value"}',
            results: '{"profit": 100}',
            status: 'COMPLETED',
            createdAt: now,
            updatedAt: now
          }
        ]
      },
      {
        id: 'strategy-2',
        name: 'Strategy 2',
        type: 'trend_following',
        config: '{"param": "value"}',
        userId: 'test-user-id',
        isActive: false,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
        backtests: []
      }
    ];

    const mockLatestStrategies = [
      {
        ...mockStrategies[0],
        versions: [
          {
            id: 'version-1',
            strategyId: 'strategy-1',
            version: 1,
            config: '{"param": "value"}',
            createdAt: now
          }
        ]
      },
      {
        ...mockStrategies[1],
        versions: []
      }
    ];

    vi.mocked(prisma.strategy.findMany)
      .mockResolvedValueOnce(mockStrategies)
      .mockResolvedValueOnce(mockLatestStrategies);

    const response = await GET({
      locals: { userId: 'test-user-id' }
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({
      totalStrategies: 2,
      activeStrategies: 1,
      totalBacktests: 1,
      successfulBacktests: 1,
      latestStrategies: [
        {
          id: 'strategy-1',
          name: 'Strategy 1',
          type: 'mean_reversion',
          createdAt: now.toISOString(),
          backtestCount: 1,
          versions: 1
        },
        {
          id: 'strategy-2',
          name: 'Strategy 2',
          type: 'trend_following',
          createdAt: now.toISOString(),
          backtestCount: 0,
          versions: 0
        }
      ]
    });
  });

  it('should return 500 if an error occurs', async () => {
    vi.mocked(prisma.strategy.findMany).mockRejectedValue(new Error('Database error'));

    const response = await GET({
      locals: { userId: 'test-user-id' }
    } as any);

    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.message).toBe('An error occurred while fetching dashboard stats');
  });
}); 