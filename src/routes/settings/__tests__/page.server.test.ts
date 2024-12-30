import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ServerLoadEvent, RequestEvent } from '@sveltejs/kit'
import { load, actions, setServices } from '../+page.server'
import type { ApiKey } from '@prisma/client'
import { BirdeyeService } from '$lib/services/birdeye.service'
import { ApiKeyService } from '$lib/services/api-key.service'
import { prisma } from '$lib/server/prisma'

// Mock services
vi.mock('$lib/services/birdeye.service', () => ({
  BirdeyeService: vi.fn()
}));
vi.mock('$lib/services/api-key.service', () => ({
  ApiKeyService: vi.fn()
}));

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn().mockImplementation(() => Promise.resolve([]))
    }
  }
}));

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

const createMockRequestEvent = (userId: string | null, formData: Record<string, string>): Parameters<typeof actions.saveBirdeyeKey>[0] => ({
  locals: { userId },
  params: {},
  url: new URL('http://localhost'),
  route: { id: '/settings' },
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

describe('actions', () => {
  let birdeyeService: BirdeyeService;
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    vi.clearAllMocks();
    birdeyeService = {
      verifyApiKey: vi.fn()
    } as unknown as BirdeyeService;
    apiKeyService = {
      upsertApiKey: vi.fn(),
      deleteApiKey: vi.fn().mockResolvedValue(undefined)
    } as unknown as ApiKeyService;

    // Set the mocked services
    setServices(birdeyeService, apiKeyService);
  });

  describe('saveBirdeyeKey', () => {
    it('should save valid API key', async () => {
      vi.mocked(birdeyeService.verifyApiKey).mockResolvedValueOnce(true);
      vi.mocked(apiKeyService.upsertApiKey).mockResolvedValueOnce({
        id: 'key-1',
        userId: 'user-1',
        name: 'Test Key',
        key: 'test-key-123',
        provider: 'birdeye',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const formData = {
        name: 'Test Key',
        key: 'test-key-123'
      };

      const result = await actions.saveBirdeyeKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        success: true
      });

      expect(birdeyeService.verifyApiKey).toHaveBeenCalledWith('test-key-123');
      expect(apiKeyService.upsertApiKey).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: 'birdeye',
        name: 'Test Key',
        key: 'test-key-123'
      });
    });

    it('should handle invalid API key', async () => {
      vi.mocked(birdeyeService.verifyApiKey).mockResolvedValueOnce(false);

      const formData = {
        name: 'Test Key',
        key: 'invalid-key'
      };

      const result = await actions.saveBirdeyeKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        error: 'Invalid API key',
        status: 400
      });

      expect(birdeyeService.verifyApiKey).toHaveBeenCalledWith('invalid-key');
    });

    it('should handle missing fields', async () => {
      const formData = {
        name: 'Test Key'
        // Missing key
      };

      const result = await actions.saveBirdeyeKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        error: 'Name and API key are required',
        status: 400
      });
    });

    it('should handle unauthorized access', async () => {
      const formData = {
        name: 'Test Key',
        key: 'test-key-123'
      };

      await expect(actions.saveBirdeyeKey(createMockRequestEvent(null, formData)))
        .rejects.toEqual({
          status: 401,
          body: { message: 'Unauthorized' }
        });
    });

    it('should handle service errors', async () => {
      vi.mocked(birdeyeService.verifyApiKey).mockResolvedValueOnce(true);
      vi.mocked(apiKeyService.upsertApiKey).mockRejectedValueOnce(new Error('Service error'));

      const formData = {
        name: 'Test Key',
        key: 'test-key-123'
      };

      const result = await actions.saveBirdeyeKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        error: 'Service error',
        status: 500
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key', async () => {
      vi.mocked(apiKeyService.deleteApiKey).mockResolvedValueOnce();

      const formData = {
        provider: 'birdeye'
      };

      const result = await actions.deleteApiKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        success: true
      });

      expect(apiKeyService.deleteApiKey).toHaveBeenCalledWith('user-1', 'birdeye');
    });

    it('should handle missing provider', async () => {
      const formData = {};

      const result = await actions.deleteApiKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        error: 'Provider is required',
        status: 400
      });
    });

    it('should handle unauthorized access', async () => {
      const formData = {
        provider: 'birdeye'
      };

      await expect(actions.deleteApiKey(createMockRequestEvent(null, formData)))
        .rejects.toEqual({
          status: 401,
          body: { message: 'Unauthorized' }
        });
    });

    it('should handle service errors', async () => {
      vi.mocked(apiKeyService.deleteApiKey).mockRejectedValueOnce(new Error('Service error'));

      const formData = {
        provider: 'birdeye'
      };

      const result = await actions.deleteApiKey(createMockRequestEvent('user-1', formData));

      expect(result).toEqual({
        error: 'Failed to delete API key',
        status: 500
      });
    });
  });
}); 