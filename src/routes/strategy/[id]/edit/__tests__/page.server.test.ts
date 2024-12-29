import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { load, actions } from '../+page.server'
import type { PageServerLoad, Actions } from '../$types'
import { error, redirect } from '@sveltejs/kit'
import type { Strategy, StrategyVersion } from '@prisma/client'
import { prisma } from '$lib/server/prisma'

// Mock must be defined before imports
vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      strategy: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      strategyVersion: {
        create: vi.fn(),
        findMany: vi.fn()
      },
      $transaction: vi.fn()
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

const createMockLoadEvent = (userId: string | null, strategyId: string): Parameters<PageServerLoad>[0] => ({
  locals: { userId },
  params: { id: strategyId },
  url: new URL('http://localhost'),
  route: { id: '/strategy/[id]/edit' },
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

const createMockRequestEvent = (userId: string | null, strategyId: string, formData: Record<string, string>): Parameters<Actions['update']>[0] => ({
  locals: { userId },
  params: { id: strategyId },
  url: new URL('http://localhost'),
  route: { id: '/strategy/[id]/edit' },
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

describe('Strategy Edit Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load strategy and versions', async () => {
      const mockStrategyWithVersions = {
        ...mockStrategy,
        versions: [mockStrategyVersion]
      };

      vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategyWithVersions);

      const result = await load(createMockLoadEvent('user-1', 'strategy-1'));

      expect(result).toEqual({
        strategy: mockStrategyWithVersions,
        strategyTypes: expect.arrayContaining([
          expect.objectContaining({
            id: 'MEAN_REVERSION'
          })
        ])
      });

      expect(prisma.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 'strategy-1' },
        include: {
          versions: {
            orderBy: { version: 'desc' }
          }
        }
      });
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
    describe('update', () => {
      it('should update strategy', async () => {
        const updatedStrategy = {
          ...mockStrategy,
          name: 'Updated Strategy',
          config: '{"timeframe":"4h","deviationThreshold":3}'
        }

        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)
        vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
          await callback(prisma)
          return updatedStrategy
        })

        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"4h","deviationThreshold":3}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: true,
          strategy: updatedStrategy
        })

        expect(prisma.strategy.update).toHaveBeenCalledWith({
          where: { id: 'strategy-1' },
          data: {
            name: 'Updated Strategy',
            type: 'MEAN_REVERSION',
            config: '{"timeframe":"4h","deviationThreshold":3}',
            currentVersion: 2
          }
        })

        expect(prisma.strategyVersion.create).toHaveBeenCalledWith({
          data: {
            version: 2,
            name: 'Updated Strategy',
            type: 'MEAN_REVERSION',
            config: '{"timeframe":"4h","deviationThreshold":3}',
            changes: 'Updated configuration',
            strategyId: 'strategy-1'
          }
        })
      })

      it('should handle missing required fields', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)

        const formData = {
          name: 'Updated Strategy',
          // Missing type and config
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'Missing required fields'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy name', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)

        const formData = {
          name: 'a', // Too short
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'Strategy name must be at least 3 characters long'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy type', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)

        const formData = {
          name: 'Test Strategy',
          type: 'INVALID_TYPE',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'type: Invalid strategy type: INVALID_TYPE'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy configuration', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy)

        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"invalidField": true}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'timeframe: Invalid timeframe. Must be one of: 1m, 5m, 15m, 1h, 4h, 1d'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle strategy not found', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null)

        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'non-existent', formData))

        expect(result).toEqual({
          success: false,
          error: 'Strategy not found'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle unauthorized access', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
          ...mockStrategy,
          userId: 'other-user'
        })

        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        }

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'Not authorized to edit this strategy'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle unauthenticated access', async () => {
        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"4h","deviationThreshold":3}',
          changes: 'Updated configuration'
        }

        await expect(actions.update(createMockRequestEvent(null, 'strategy-1', formData))).rejects.toThrow()

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })
    })
  })
}) 