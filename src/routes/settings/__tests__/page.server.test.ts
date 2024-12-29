import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent } from '@sveltejs/kit'
import { load } from '../+page.server'
import type { ApiKey } from '@prisma/client'

vi.mock('$lib/server/prisma', () => {
  return {
    prisma: {
      apiKey: {
        findMany: vi.fn().mockImplementation(() => Promise.resolve([]))
      }
    }
  };
});

interface Locals {
  userId: string | null;
}

const createMockLoadEvent = (userId: string | null): ServerLoadEvent<Record<string, string>, { userId: string | null }, '/settings'> => ({
  locals: { userId },
  params: {},
  url: new URL('http://localhost'),
  route: { id: '/settings' },
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
});

describe('Settings Page Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should load API keys for authenticated user', async () => {
      const mockApiKeys: ApiKey[] = [
        {
          id: 'key-1',
          userId: 'user-1',
          name: 'Test Key',
          key: 'test-key-123',
          provider: 'birdeye',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const { prisma } = await import('$lib/server/prisma');
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce(mockApiKeys);

      const result = await load(createMockLoadEvent('user-1'))

      expect(result).toEqual({
        apiKeys: mockApiKeys
      })

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1'
        },
        select: {
          id: true,
          name: true,
          provider: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
    })

    it('should handle missing API keys', async () => {
      const { prisma } = await import('$lib/server/prisma');
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([]);

      const result = await load(createMockLoadEvent('user-1'))

      expect(result).toEqual({
        apiKeys: []
      })

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1'
        },
        select: {
          id: true,
          name: true,
          provider: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
    })

    it('should redirect unauthorized access', async () => {
      const promise = load(createMockLoadEvent(null))

      await expect(promise).rejects.toEqual(
        expect.objectContaining({
          status: 302,
          location: '/auth/login'
        })
      )

      const { prisma } = await import('$lib/server/prisma');
      expect(prisma.apiKey.findMany).not.toHaveBeenCalled()
    })
  })
}) 