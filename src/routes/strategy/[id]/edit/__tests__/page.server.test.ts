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
        update: vi.fn(),
        delete: vi.fn()
      },
      strategyVersion: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn()
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

type StrategyVersionWithRelations = StrategyVersion & {
  strategy: Strategy;
};

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

      it('should handle invalid configuration', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy);

        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"invalid"}',
          changes: 'Updated configuration'
        };

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: expect.stringContaining('timeframe: Invalid timeframe')
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle database error', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy);
        vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('Database error'));

        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        };

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Failed to update strategy'
        });
      });

      it('should handle unauthorized access', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
          ...mockStrategy,
          userId: 'other-user'
        });

        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        };

        const result = await actions.update(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Not authorized to edit this strategy'
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle unauthenticated access', async () => {
        const formData = {
          name: 'Updated Strategy',
          type: 'MEAN_REVERSION',
          config: '{"timeframe":"1h","deviationThreshold":2}',
          changes: 'Updated configuration'
        };

        await expect(actions.update(createMockRequestEvent(null, 'strategy-1', formData)))
          .rejects.toEqual(expect.objectContaining({
            status: 302,
            location: '/auth/login'
          }));

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    })

    describe('revert', () => {
      it('should revert strategy to previous version', async () => {
        const updatedStrategy = {
          ...mockStrategy,
          name: mockStrategyVersion.name,
          type: mockStrategyVersion.type,
          config: mockStrategyVersion.config,
          currentVersion: 2
        };

        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce({
          ...mockStrategyVersion,
          strategy: mockStrategy
        } as StrategyVersionWithRelations);

        vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
          await callback(prisma);
          return updatedStrategy;
        });

        const formData = {
          versionId: 'version-1'
        };

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: true,
          strategy: updatedStrategy
        });

        expect(prisma.strategyVersion.create).toHaveBeenCalledWith({
          data: {
            version: 2,
            name: mockStrategyVersion.name,
            type: mockStrategyVersion.type,
            config: mockStrategyVersion.config,
            changes: 'Reverted to version 1',
            strategyId: mockStrategy.id
          }
        });

        expect(prisma.strategy.update).toHaveBeenCalledWith({
          where: { id: mockStrategy.id },
          data: {
            name: mockStrategyVersion.name,
            type: mockStrategyVersion.type,
            config: mockStrategyVersion.config,
            currentVersion: 2
          }
        });
      });

      it('should handle missing version ID', async () => {
        const formData = {};

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Version ID is required'
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle version not found', async () => {
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce(null);

        const formData = {
          versionId: 'non-existent'
        };

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Version not found'
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle unauthorized access', async () => {
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce({
          ...mockStrategyVersion,
          strategy: {
            ...mockStrategy,
            userId: 'other-user'
          }
        } as StrategyVersionWithRelations);

        const formData = {
          versionId: 'version-1'
        };

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Not authorized to revert this strategy'
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle invalid configuration in version', async () => {
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce({
          ...mockStrategyVersion,
          config: '{"timeframe":"invalid"}',
          strategy: mockStrategy
        } as StrategyVersionWithRelations);

        const formData = {
          versionId: 'version-1'
        };

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: expect.stringContaining('timeframe: Invalid timeframe')
        });

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('should handle database error', async () => {
        vi.mocked(prisma.strategyVersion.findUnique).mockResolvedValueOnce({
          ...mockStrategyVersion,
          strategy: mockStrategy
        } as StrategyVersionWithRelations);

        vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('Database error'));

        const formData = {
          versionId: 'version-1'
        };

        const result = await actions.revert(createMockRequestEvent('user-1', 'strategy-1', formData));

        expect(result).toEqual({
          success: false,
          error: 'Failed to revert strategy'
        });
      });

      it('should handle unauthenticated access', async () => {
        const formData = {
          versionId: 'version-1'
        };

        await expect(actions.revert(createMockRequestEvent(null, 'strategy-1', formData)))
          .rejects.toEqual(expect.objectContaining({
            status: 302,
            location: '/auth/login'
          }));

        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should delete strategy', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy);
        vi.mocked(prisma.strategy.delete).mockResolvedValueOnce(mockStrategy);

        let redirectThrown = false;
        try {
          await actions.delete(createMockRequestEvent('user-1', 'strategy-1', {}));
        } catch (error) {
          redirectThrown = true;
          expect(error).toEqual(expect.objectContaining({
            status: 302,
            location: '/strategy'
          }));
        }

        expect(redirectThrown).toBe(true);
        expect(prisma.strategy.delete).toHaveBeenCalledWith({
          where: { id: 'strategy-1' }
        });
      });

      it('should handle strategy not found', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(null);

        const result = await actions.delete(createMockRequestEvent('user-1', 'strategy-1', {}));

        expect(result).toEqual({
          success: false,
          error: 'Strategy not found'
        });

        expect(prisma.strategy.delete).not.toHaveBeenCalled();
      });

      it('should handle unauthorized access', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce({
          ...mockStrategy,
          userId: 'other-user'
        });

        const result = await actions.delete(createMockRequestEvent('user-1', 'strategy-1', {}));

        expect(result).toEqual({
          success: false,
          error: 'Not authorized to delete this strategy'
        });

        expect(prisma.strategy.delete).not.toHaveBeenCalled();
      });

      it('should handle database error', async () => {
        vi.mocked(prisma.strategy.findUnique).mockResolvedValueOnce(mockStrategy);
        vi.mocked(prisma.strategy.delete).mockRejectedValueOnce(new Error('Database error'));

        const result = await actions.delete(createMockRequestEvent('user-1', 'strategy-1', {}));

        expect(result).toEqual({
          success: false,
          error: 'Failed to delete strategy'
        });
      });

      it('should handle unauthenticated access', async () => {
        await expect(actions.delete(createMockRequestEvent(null, 'strategy-1', {})))
          .rejects.toEqual(expect.objectContaining({
            status: 302,
            location: '/auth/login'
          }));

        expect(prisma.strategy.delete).not.toHaveBeenCalled();
      });
    });
  })
}) 