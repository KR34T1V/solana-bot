import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { load, actions } from '../+page.server'
import type { PageServerLoad, Actions } from '../$types'
import { error, redirect } from '@sveltejs/kit'
import type { Strategy } from '@prisma/client'
import { prisma } from '$lib/server/prisma'

// Mock must be defined before imports
vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      strategy: {
        create: vi.fn()
      },
      strategyVersion: {
        create: vi.fn()
      },
      user: {
        findUnique: vi.fn()
      },
      $transaction: vi.fn()
    }
  }
})

const createMockLoadEvent = (userId: string | null): Parameters<PageServerLoad>[0] => ({
  locals: { userId },
  params: {},
  url: new URL('http://localhost'),
  route: { id: '/strategy/new' },
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

const createMockRequestEvent = (userId: string | null, formData: Record<string, string>): Parameters<Actions['create']>[0] => ({
  locals: { userId },
  params: {},
  url: new URL('http://localhost'),
  route: { id: '/strategy/new' },
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

describe('New Strategy Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load available strategy types', async () => {
      const result = await load(createMockLoadEvent('user-1'))

      expect(result).toEqual({
        strategyTypes: [
          {
            id: 'MEAN_REVERSION',
            name: 'Mean Reversion',
            description: 'Trade based on price deviations from historical averages',
            defaultConfig: {
              timeframe: '1h',
              deviationThreshold: 2,
              lookbackPeriod: 20,
              profitTarget: 1.5,
              stopLoss: 1.0
            }
          },
          {
            id: 'TREND_FOLLOWING',
            name: 'Trend Following',
            description: 'Follow market trends using moving averages and momentum',
            defaultConfig: {
              timeframe: '4h',
              fastMA: 9,
              slowMA: 21,
              momentumPeriod: 14,
              profitTarget: 2.0,
              stopLoss: 1.5
            }
          }
        ]
      })
    })

    it('should redirect unauthenticated access', async () => {
      await expect(load(createMockLoadEvent(null))).rejects.toThrow()
    })
  })

  describe('actions', () => {
    describe('create', () => {
      it('should create a new strategy', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date()
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

        vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
          vi.mocked(prisma.strategy.create).mockResolvedValueOnce(mockStrategy);
          vi.mocked(prisma.strategyVersion.create).mockResolvedValueOnce({
            id: 'version-1',
            version: 1,
            name: 'Test Strategy',
            type: 'MEAN_REVERSION',
            config: '{"timeframe":"1h","deviationThreshold":2}',
            changes: 'Initial version',
            strategyId: mockStrategy.id,
            createdAt: new Date(),
            lastTestedAt: null,
            performance: null,
            backtestResults: null
          });

          return callback(prisma).then(() => mockStrategy);
        });

        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Initial version'
        }

        const result = await actions.create(createMockRequestEvent('user-1', formData))

        expect(result).toEqual({
          success: true,
          strategy: mockStrategy
        })

        expect(prisma.strategy.create).toHaveBeenCalledWith({
          data: {
            name: 'Test Strategy',
            type: 'MEAN_REVERSION',
            config: '{"timeframe":"1h","deviationThreshold":2}',
            currentVersion: 1,
            userId: 'user-1'
          }
        })

        expect(prisma.strategyVersion.create).toHaveBeenCalledWith({
          data: {
            version: 1,
            name: 'Test Strategy',
            type: 'MEAN_REVERSION',
            config: '{"timeframe":"1h","deviationThreshold":2}',
            changes: 'Initial version',
            strategyId: mockStrategy.id
          }
        })
      })

      it('should handle missing required fields', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const formData = {
          name: 'Test Strategy',
          // Missing type and config
          changes: 'Initial version'
        }

        const result = await actions.create(createMockRequestEvent('user-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'Missing required fields'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy name', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const formData = {
          name: 'a', // Too short
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Initial version'
        }

        const result = await actions.create(createMockRequestEvent('user-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'Strategy name must be at least 3 characters long'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy type', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const formData = {
          name: 'Test Strategy',
          type: 'INVALID_TYPE',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Initial version'
        }

        const result = await actions.create(createMockRequestEvent('user-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'type: Invalid strategy type: INVALID_TYPE'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle invalid strategy configuration', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          password: 'hashed_password',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"invalidField": true}',
          changes: 'Initial version'
        }

        const result = await actions.create(createMockRequestEvent('user-1', formData))

        expect(result).toEqual({
          success: false,
          error: 'timeframe: Invalid timeframe. Must be one of: 1m, 5m, 15m, 1h, 4h, 1d'
        })

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })

      it('should handle unauthenticated access', async () => {
        const formData = {
          name: 'Test Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Initial version'
        }

        await expect(actions.create(createMockRequestEvent(null, formData))).rejects.toThrow()

        expect(prisma.$transaction).not.toHaveBeenCalled()
      })
    })
  })
}) 