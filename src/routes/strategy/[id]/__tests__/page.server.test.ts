import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent } from '@sveltejs/kit'
import { load } from '../+page.server'
import { error, redirect } from '@sveltejs/kit'
import type { Strategy, StrategyVersion, Backtest } from '@prisma/client'

// Mock must be defined before imports
vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      strategy: {
        findUnique: vi.fn()
      },
      strategyVersion: {
        findMany: vi.fn()
      }
    }
  }
})

type RouteParams = Record<string, string> & {
  id: string
}

const createMockLoadEvent = (userId: string | null, id: string): ServerLoadEvent<RouteParams, { userId: string | null }, '/strategy/[id]'> => ({
  locals: { userId },
  params: { id },
  url: new URL('http://localhost'),
  route: { id: '/strategy/[id]' },
  parent: async () => ({ userId: null }),
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

describe('Strategy ID Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load strategy with current version and backtests', async () => {
      const mockStrategy: Strategy & { versions: StrategyVersion[], backtests: Backtest[] } = {
        id: 'strategy-1',
        name: 'Test Strategy',
        type: 'mean_reversion',
        config: '{}',
        currentVersion: 1,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [
          {
            id: 'version-1',
            version: 1,
            name: 'Test Strategy v1',
            type: 'mean_reversion',
            config: '{"param1": "value1"}',
            changes: 'Initial version',
            performance: '{"metric1": 0.5}',
            backtestResults: null,
            lastTestedAt: null,
            strategyId: 'strategy-1',
            createdAt: new Date()
          }
        ],
        backtests: [
          {
            id: 'backtest-1',
            startDate: new Date(),
            endDate: new Date(),
            pair: 'SOL/USD',
            timeframe: '1h',
            config: '{}',
            results: '{"returns": 0.1}',
            status: 'completed',
            strategyId: 'strategy-1',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }

      const { prisma } = await import('$lib/server/prisma')
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)
      vi.mocked(prisma.strategyVersion.findMany).mockResolvedValueOnce(mockStrategy.versions)

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'))

      expect(result).toEqual({
        strategy: {
          ...mockStrategy,
          backtests: undefined
        },
        currentVersion: {
          ...mockStrategy.versions[0],
          config: JSON.parse(mockStrategy.versions[0].config),
          performance: JSON.parse(mockStrategy.versions[0].performance!)
        },
        backtests: [{
          ...mockStrategy.backtests[0],
          results: JSON.parse(mockStrategy.backtests[0].results)
        }]
      })

      expect(prisma.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 'strategy-1' },
        include: {
          versions: {
            where: {
              version: {
                equals: undefined
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
      })

      expect(prisma.strategyVersion.findMany).toHaveBeenCalledWith({
        where: {
          strategyId: 'strategy-1',
          version: 1
        }
      })
    })

    it('should handle strategy not found', async () => {
      const { prisma } = await import('$lib/server/prisma')
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null)

      await expect(load(createMockLoadEvent('user-1', 'non-existent'))).rejects.toThrow()
      expect(prisma.strategyVersion.findMany).not.toHaveBeenCalled()
    })

    it('should handle unauthorized access', async () => {
      const mockStrategy = {
        id: 'strategy-1',
        name: 'Test Strategy',
        type: 'mean_reversion',
        config: '{}',
        currentVersion: 1,
        userId: 'other-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [],
        backtests: []
      }

      const { prisma } = await import('$lib/server/prisma')
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)

      await expect(load(createMockLoadEvent('user-1', 'strategy-1'))).rejects.toThrow()
      expect(prisma.strategyVersion.findMany).not.toHaveBeenCalled()
    })

    it('should handle missing version', async () => {
      const mockStrategy = {
        id: 'strategy-1',
        name: 'Test Strategy',
        type: 'mean_reversion',
        config: '{}',
        currentVersion: 1,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [],
        backtests: []
      }

      const { prisma } = await import('$lib/server/prisma')
      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)
      vi.mocked(prisma.strategyVersion.findMany).mockResolvedValueOnce([])

      await expect(load(createMockLoadEvent('user-1', 'strategy-1'))).rejects.toThrow()
    })

    it('should redirect unauthenticated access', async () => {
      await expect(load(createMockLoadEvent(null, 'strategy-1'))).rejects.toThrow()

      const { prisma } = await import('$lib/server/prisma')
      expect(prisma.strategy.findUnique).not.toHaveBeenCalled()
      expect(prisma.strategyVersion.findMany).not.toHaveBeenCalled()
    })
  })
}) 