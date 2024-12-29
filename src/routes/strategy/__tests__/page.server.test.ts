import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent } from '@sveltejs/kit'
import { load } from '../+page.server'
import type { PageServerLoad } from '../$types'
import { error, redirect } from '@sveltejs/kit'
import type { Strategy } from '@prisma/client'
import { prisma } from '$lib/server/prisma'

// Mock must be defined before imports
vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      strategy: {
        findMany: vi.fn()
      }
    }
  }
})

const mockStrategies: Strategy[] = [
  {
    id: 'strategy-1',
    name: 'Mean Reversion Strategy',
    type: 'MEAN_REVERSION',
    config: '{"timeframe":"1h","deviationThreshold":2}',
    currentVersion: 1,
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'strategy-2',
    name: 'Trend Following Strategy',
    type: 'TREND_FOLLOWING',
    config: '{"timeframe":"4h","fastMA":9,"slowMA":21}',
    currentVersion: 1,
    userId: 'user-1',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
]

const createMockLoadEvent = (userId: string | null): Parameters<PageServerLoad>[0] => ({
  locals: { userId },
  params: {},
  url: new URL('http://localhost'),
  route: { id: '/strategy' },
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

describe('Strategy List Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load user strategies', async () => {
      vi.mocked(prisma.strategy.findMany).mockResolvedValueOnce(mockStrategies)

      const result = await load(createMockLoadEvent('user-1'))

      expect(result).toEqual({
        strategies: mockStrategies
      })

      expect(prisma.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should handle empty strategies list', async () => {
      vi.mocked(prisma.strategy.findMany).mockResolvedValueOnce([])

      const result = await load(createMockLoadEvent('user-1'))

      expect(result).toEqual({
        strategies: []
      })

      expect(prisma.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should handle unauthenticated access', async () => {
      await expect(load(createMockLoadEvent(null))).rejects.toThrow()

      expect(prisma.strategy.findMany).not.toHaveBeenCalled()
    })
  })
}) 