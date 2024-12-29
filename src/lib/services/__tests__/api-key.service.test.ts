import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiKeyService } from '../api-key.service'
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import type { DeepMockProxy } from 'vitest-mock-extended'

describe('ApiKeyService', () => {
  let apiKeyService: ApiKeyService
  let prisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>()
    apiKeyService = new ApiKeyService(prisma as unknown as PrismaClient)
  })

  describe('createApiKey', () => {
    it('should create a new API key for a user', async () => {
      const userId = '123'
      const name = 'Test Key'
      const mockApiKey = {
        id: '1',
        userId,
        name,
        key: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]+$/),
        provider: 'default',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.create.mockResolvedValue(mockApiKey)

      const result = await apiKeyService.createApiKey(userId, name)

      expect(result).toEqual(mockApiKey)
      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          userId,
          name,
          key: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]+$/),
          provider: 'default'
        }
      })
    })

    it('should throw an error if creation fails', async () => {
      prisma.apiKey.create.mockRejectedValue(new Error('Database error'))

      await expect(apiKeyService.createApiKey('123', 'Test Key'))
        .rejects.toThrow('Failed to create API key')
    })
  })

  describe('getApiKeys', () => {
    it('should return all API keys for a user', async () => {
      const userId = '123'
      const mockApiKeys = [
        {
          id: '1',
          userId,
          name: 'Key 1',
          key: 'key1',
          provider: 'default',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId,
          name: 'Key 2',
          key: 'key2',
          provider: 'default',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      prisma.apiKey.findMany.mockResolvedValue(mockApiKeys)

      const result = await apiKeyService.getApiKeys(userId)

      expect(result).toEqual(mockApiKeys)
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId }
      })
    })

    it('should return empty array if no keys found', async () => {
      prisma.apiKey.findMany.mockResolvedValue([])

      const result = await apiKeyService.getApiKeys('123')

      expect(result).toEqual([])
    })
  })

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      const keyId = '1'
      const userId = '123'
      const mockApiKey = {
        id: keyId,
        userId,
        name: 'Test Key',
        key: 'test-key',
        provider: 'default',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.delete.mockResolvedValue(mockApiKey)

      await apiKeyService.deleteApiKey(keyId, userId)

      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: {
          id: keyId,
          userId
        }
      })
    })

    it('should throw an error if deletion fails', async () => {
      prisma.apiKey.delete.mockRejectedValue(new Error('Not found'))

      await expect(apiKeyService.deleteApiKey('1', '123'))
        .rejects.toThrow('Failed to delete API key')
    })
  })

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      const key = 'valid-key'
      const mockApiKey = {
        id: '1',
        userId: '123',
        name: 'Test Key',
        key,
        provider: 'default',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey)

      const result = await apiKeyService.validateApiKey(key)

      expect(result).toBe(true)
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: { key }
      })
    })

    it('should return false for invalid API key', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const result = await apiKeyService.validateApiKey('invalid-key')

      expect(result).toBe(false)
    })
  })

  describe('getActiveKey', () => {
    it('should return active API key for a provider', async () => {
      const userId = '123'
      const provider = 'birdeye'
      const mockApiKey = {
        id: '1',
        userId,
        name: 'Test Key',
        key: 'test-key',
        provider,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey)

      const result = await apiKeyService.getActiveKey(userId, provider)

      expect(result).toEqual(mockApiKey)
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          provider,
          isActive: true
        }
      })
    })

    it('should return null if no active key found', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const result = await apiKeyService.getActiveKey('123', 'birdeye')

      expect(result).toBeNull()
    })
  })

  describe('upsertApiKey', () => {
    it('should create new API key if none exists', async () => {
      const params = {
        userId: '123',
        provider: 'birdeye',
        name: 'Test Key',
        key: 'test-key'
      }

      const mockApiKey = {
        id: '1',
        ...params,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.upsert.mockResolvedValue(mockApiKey)

      const result = await apiKeyService.upsertApiKey(params)

      expect(result).toEqual(mockApiKey)
      expect(prisma.apiKey.upsert).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: params.userId,
            provider: params.provider
          }
        },
        create: {
          name: params.name,
          key: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]+$/),
          provider: params.provider,
          userId: params.userId,
          isActive: true
        },
        update: {
          name: params.name,
          key: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]+$/),
          isActive: true
        }
      })
    })

    it('should update existing API key', async () => {
      const params = {
        userId: '123',
        provider: 'birdeye',
        name: 'Updated Key',
        key: 'new-key'
      }

      const mockApiKey = {
        id: '1',
        ...params,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.upsert.mockResolvedValue(mockApiKey)

      const result = await apiKeyService.upsertApiKey(params)

      expect(result).toEqual(mockApiKey)
    })
  })

  describe('getDecryptedKey', () => {
    it('should return decrypted key for active API key', async () => {
      const userId = '123'
      const provider = 'birdeye'
      const encryptedKey = '1234567890abcdef:encrypted'
      const decryptedKey = 'decrypted-key'

      const mockApiKey = {
        id: '1',
        userId,
        name: 'Test Key',
        key: encryptedKey,
        provider,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey)

      // Mock the private decryptApiKey method
      vi.spyOn(apiKeyService as any, 'decryptApiKey').mockReturnValue(decryptedKey)

      const result = await apiKeyService.getDecryptedKey(userId, provider)

      expect(result).toBe(decryptedKey)
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          provider,
          isActive: true
        }
      })
    })

    it('should return null if no active key found', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const result = await apiKeyService.getDecryptedKey('123', 'birdeye')

      expect(result).toBeNull()
    })
  })
}) 