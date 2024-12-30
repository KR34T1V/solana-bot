import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { load, actions } from '../+page.server'
import type { PageServerLoad, Actions } from '../$types'
import { error, redirect } from '@sveltejs/kit'
import type { Strategy, StrategyVersion, Backtest } from '@prisma/client'
import { prisma } from '$lib/server/prisma'

// Mock must be defined before imports
vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      strategy: {
        findUnique: vi.fn()
      },
      strategyVersion: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      backtest: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      }
    }
  }
})

const mockStrategy: Strategy = {
  id: 'strategy-1',
  name: 'Test Strategy',
  type: 'MEAN_REVERSION',
  config: '{"timeframe":"1h","deviationThreshold":2}',
  currentVersion: 1,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockStrategyVersion: StrategyVersion = {
  id: 'version-1',
  version: 1,
  name: 'Test Strategy',
  type: 'MEAN_REVERSION',
  config: '{"timeframe":"1h","deviationThreshold":2}',
  changes: 'Initial version',
  strategyId: 'strategy-1',
  createdAt: new Date(),
  performance: null,
  backtestResults: null,
  lastTestedAt: null
}

const mockBacktests: Backtest[] = [
  {
    id: 'backtest-1',
    strategyId: 'strategy-1',
    pair: 'SOL/USDC',
    timeframe: '1h',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    config: '{"initialBalance":1000,"strategyConfig":{"timeframe":"1h","deviationThreshold":2}}',
    results: JSON.stringify({
      trades: [
        {
          entryTime: '2024-01-02T10:00:00Z',
          exitTime: '2024-01-02T14:00:00Z',
          entryPrice: 100,
          exitPrice: 105,
          profit: 5,
          profitPercent: 5
        }
      ],
      metrics: {
        winRate: 0.6,
        profitFactor: 1.5,
        sharpeRatio: 1.2,
        maxDrawdown: 10,
        totalTrades: 10,
        profitableTrades: 6,
        averageProfit: 3,
        averageLoss: 2
      }
    }),
    status: 'COMPLETED',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
]

const createMockLoadEvent = (userId: string | null, strategyId: string): Parameters<PageServerLoad>[0] => ({
  locals: { userId },
  params: { id: strategyId },
  url: new URL('http://localhost'),
  route: { id: '/strategy/[id]/backtest' },
  parent: async () => ({ userId }),
  depends: (...deps: string[]) => { /* noop */ },
  untrack: <T>(fn: () => T) => fn(),
  cookies: {
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
    serialize: () => ''
  },
  fetch: () => Promise.resolve(new Response()),
  getClientAddress: () => '127.0.0.1',
  platform: {},
  request: new Request('http://localhost'),
  setHeaders: () => {},
  isDataRequest: false,
  isSubRequest: false
})

const createMockRequestEvent = (userId: string | null, strategyId: string, formData: Record<string, string>): Parameters<Actions['create']>[0] => ({
  locals: { userId },
  params: { id: strategyId },
  url: new URL('http://localhost'),
  route: { id: '/strategy/[id]/backtest' },
  cookies: {
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
    serialize: () => ''
  },
  fetch: () => Promise.resolve(new Response()),
  getClientAddress: () => '127.0.0.1',
  platform: {},
  request: new Request('http://localhost', {
    method: 'POST',
    body: Object.entries(formData).reduce((fd, [key, value]) => {
      fd.append(key, value)
      return fd
    }, new FormData())
  }),
  setHeaders: () => {},
  isDataRequest: false,
  isSubRequest: false
})

describe('Strategy Backtest Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load strategy and current version', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)
      vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce(mockStrategyVersion)

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'))

      expect(result).toEqual({
        strategy: mockStrategy,
        currentVersion: mockStrategyVersion,
        tradingPairs: ['SOL/USDC', 'BTC/USDC', 'ETH/USDC'],
        timeframes: ['1m', '5m', '15m', '1h', '4h', '1d']
      })

      expect(prisma.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 'strategy-1' }
      })

      expect(prisma.strategyVersion.findUnique).toHaveBeenCalledWith({
        where: {
          strategyId_version: {
            strategyId: 'strategy-1',
            version: 1
          }
        }
      })
    })

    it('should handle strategy not found', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null)

      await expect(load(createMockLoadEvent('user-1', 'non-existent'))).rejects.toThrow()
    })

    it('should handle unauthorized access', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
        ...mockStrategy,
        userId: 'other-user'
      })

      await expect(load(createMockLoadEvent('user-1', 'strategy-1'))).rejects.toThrow()
    })

    it('should handle unauthenticated access', async () => {
      await expect(load(createMockLoadEvent(null, 'strategy-1'))).rejects.toThrow()
    })
  })

  describe('actions', () => {
    describe('create', () => {
      beforeEach(() => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValue(mockStrategy);
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValue(mockStrategyVersion);
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-02-01'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should create new backtest', async () => {
        vi.mocked(prisma.backtest.create).mockResolvedValueOnce(mockBacktests[0]);

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: true,
          backtest: mockBacktests[0]
        });

        expect(prisma.backtest.create).toHaveBeenCalledWith({
          data: {
            strategyId: 'strategy-1',
            pair: 'SOL/USDC',
            timeframe: '1h',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
            config: JSON.stringify({
              initialBalance: 1000,
              strategyConfig: JSON.parse(mockStrategyVersion.config)
            }),
            status: 'RUNNING',
            results: JSON.stringify({
              totalTrades: 0,
              profitableTrades: 0,
              trades: []
            })
          }
        });
      });

      it('should handle invalid trading pair format', async () => {
        const formData = {
          pair: 'INVALID-PAIR',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Invalid trading pair format'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle invalid timeframe', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: 'invalid',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Invalid timeframe'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle invalid date format', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: 'invalid',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Invalid date format'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle start date after end date', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-31',
          endDate: '2024-01-01',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Start date must be before end date'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle end date in the future', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'End date cannot be in the future'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle date range exceeding maximum for timeframe', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1m',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Maximum date range for 1m timeframe is 7 days'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle invalid initial balance', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '2000000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Initial balance must be between 0 and 1,000,000 USDC'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle error during backtest creation', async () => {
        vi.mocked(prisma.backtest.create).mockRejectedValueOnce(new Error('Database error'));

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Failed to create backtest'
        });
      });

      it('should handle backtest completion and performance calculation', async () => {
        const mockBacktest = {
          ...mockBacktests[0],
          status: 'RUNNING',
          results: JSON.stringify({
            totalTrades: 0,
            profitableTrades: 0,
            trades: []
          })
        };

        vi.mocked(prisma.backtest.create).mockResolvedValueOnce(mockBacktest);
        vi.mocked(prisma.backtest.update).mockResolvedValue(mockBacktest);
        vi.mocked(prisma.backtest.findMany).mockResolvedValueOnce(mockBacktests);
        vi.mocked(prisma.strategyVersion.update).mockResolvedValueOnce({
          ...mockStrategyVersion,
          performance: JSON.stringify({
            timeframes: {
              '1h': {
                winRate: 60,
                profitFactor: 2.08,
                sharpeRatio: 0.31,
                maxDrawdown: 86.31,
                totalTrades: 50,
                profitableTrades: 30,
                averageProfit: 25.54,
                averageLoss: -19.51,
                dateRange: {
                  start: '2024-01-01T00:00:00.000Z',
                  end: '2024-01-31T00:00:00.000Z',
                  days: 30
                }
              }
            },
            overall: {
              totalBacktests: 1,
              bestTimeframe: '1h',
              worstTimeframe: '1h',
              averageWinRate: 60,
              averageSharpeRatio: 0.31
            }
          }),
          lastTestedAt: new Date()
        });

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: true,
          backtest: mockBacktest
        });

        // Wait for backtest completion
        await vi.runAllTimersAsync();

        expect(prisma.backtest.update).toHaveBeenCalled();
        expect(prisma.strategyVersion.update).toHaveBeenCalled();
      });

      it('should handle error during backtest completion', async () => {
        const mockBacktest = {
          ...mockBacktests[0],
          status: 'RUNNING',
          results: JSON.stringify({
            totalTrades: 0,
            profitableTrades: 0,
            trades: []
          })
        };

        vi.mocked(prisma.backtest.create).mockResolvedValueOnce(mockBacktest);
        vi.mocked(prisma.backtest.update).mockRejectedValueOnce(new Error('Update failed'));

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: true,
          backtest: mockBacktest
        });

        // Wait for backtest completion attempt
        await vi.runAllTimersAsync();

        expect(prisma.backtest.update).toHaveBeenCalledWith({
          where: { id: mockBacktest.id },
          data: {
            status: 'ERROR',
            results: JSON.stringify({ error: 'Update failed' })
          }
        });
      });

      it('should handle missing strategy version', async () => {
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce(null);

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Strategy version not found'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle missing strategy', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null);

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Strategy not found'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle unauthorized strategy access', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
          ...mockStrategy,
          userId: 'other-user'
        });

        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        const result = await actions.create(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Not authorized to backtest this strategy'
        });

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });

      it('should handle unauthenticated access', async () => {
        const formData = {
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          initialBalance: '1000'
        };

        await expect(actions.create(createMockRequestEvent(null, 'strategy-1', formData)))
          .rejects.toEqual(expect.objectContaining({
            status: 302,
            location: '/auth/login'
          }));

        expect(prisma.backtest.create).not.toHaveBeenCalled();
      });
    });
  })
}) 