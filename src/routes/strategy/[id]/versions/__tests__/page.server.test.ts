import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent } from '@sveltejs/kit'
import { load } from '../+page.server'
import type { PageServerLoad } from '../$types'
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
        findMany: vi.fn()
      },
      backtest: {
        findMany: vi.fn()
      }
    }
  }
})

const mockStrategy: Strategy = {
  id: 'strategy-1',
  name: 'Test Strategy',
  type: 'MEAN_REVERSION',
  config: '{"timeframe":"1h","deviationThreshold":2}',
  currentVersion: 2,
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockStrategyVersions: StrategyVersion[] = [
  {
    id: 'version-2',
    version: 2,
    name: 'Test Strategy',
    type: 'MEAN_REVERSION',
    config: '{"timeframe":"4h","deviationThreshold":3}',
    changes: 'Updated configuration',
    strategyId: 'strategy-1',
    createdAt: new Date(),
    performance: null,
    backtestResults: null,
    lastTestedAt: null
  },
  {
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
]

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
  },
  {
    id: 'backtest-2',
    strategyId: 'strategy-1',
    pair: 'BTC/USDC',
    timeframe: '4h',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    config: '{"initialBalance":1000,"strategyConfig":{"timeframe":"4h","deviationThreshold":3}}',
    results: JSON.stringify({
      trades: [
        {
          entryTime: '2024-01-02T12:00:00Z',
          exitTime: '2024-01-03T00:00:00Z',
          entryPrice: 40000,
          exitPrice: 41000,
          profit: 1000,
          profitPercent: 2.5
        }
      ],
      metrics: {
        winRate: 0.7,
        profitFactor: 1.8,
        sharpeRatio: 1.5,
        maxDrawdown: 8,
        totalTrades: 8,
        profitableTrades: 6,
        averageProfit: 4,
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
  route: { id: '/strategy/[id]/versions' },
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

describe('Strategy Versions Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load strategy versions with performance metrics', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
        ...mockStrategy,
        versions: mockStrategyVersions
      } as any)

      vi.mocked(prisma.backtest.findMany).mockResolvedValueOnce(mockBacktests)

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'))

      expect(result).toEqual({
        strategy: mockStrategy,
        versions: expect.arrayContaining([
          expect.objectContaining({
            version: 2,
            name: 'Test Strategy',
            performance: expect.objectContaining({
              timeframes: expect.objectContaining({
                '4h': expect.objectContaining({
                  winRate: 0.7,
                  profitFactor: 1.8,
                  sharpeRatio: 1.5
                })
              }),
              overall: expect.objectContaining({
                totalBacktests: 1,
                averageWinRate: 0.7,
                averageSharpeRatio: 1.5
              })
            })
          }),
          expect.objectContaining({
            version: 1,
            name: 'Test Strategy',
            performance: expect.objectContaining({
              timeframes: expect.objectContaining({
                '1h': expect.objectContaining({
                  winRate: 0.6,
                  profitFactor: 1.5,
                  sharpeRatio: 1.2
                })
              }),
              overall: expect.objectContaining({
                totalBacktests: 1,
                averageWinRate: 0.6,
                averageSharpeRatio: 1.2
              })
            })
          })
        ])
      })

      expect(prisma.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 'strategy-1' },
        include: { versions: true }
      })

      expect(prisma.backtest.findMany).toHaveBeenCalledWith({
        where: { strategyId: 'strategy-1' },
        orderBy: { createdAt: 'desc' }
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

    it('should handle strategy with no versions', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
        ...mockStrategy,
        versions: []
      } as any)

      vi.mocked(prisma.backtest.findMany).mockResolvedValueOnce([])

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'))

      expect(result).toEqual({
        strategy: mockStrategy,
        versions: []
      })
    })

    it('should handle strategy with no backtests', async () => {
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
        ...mockStrategy,
        versions: mockStrategyVersions
      } as any)

      vi.mocked(prisma.backtest.findMany).mockResolvedValueOnce([])

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'))

      expect(result).toEqual({
        strategy: mockStrategy,
        versions: expect.arrayContaining([
          expect.objectContaining({
            version: 2,
            name: 'Test Strategy',
            performance: null
          }),
          expect.objectContaining({
            version: 1,
            name: 'Test Strategy',
            performance: null
          })
        ])
      })
    })
  })
}) 