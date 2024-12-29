import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TradingBotService } from '../trading-bot.service'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockDeep } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import type { BotStatus } from '$lib/types'

describe('TradingBotService', () => {
  let tradingBotService: TradingBotService
  let mockPrisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock instances
    mockPrisma = mockDeep<PrismaClient>()

    // Create service instance
    tradingBotService = new TradingBotService(mockPrisma)
  })

  describe('createBot', () => {
    it('should create a new trading bot with wallet', async () => {
      const mockBot = {
        id: 'bot-1',
        name: 'Test Bot',
        status: 'STOPPED',
        config: '{"param":"value"}',
        userId: 'user-1',
        strategyId: 'strategy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTradeAt: null,
        wallet: {
          id: 'wallet-1',
          balance: 0,
          totalDeposits: 0,
          totalWithdraws: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          botId: 'bot-1'
        }
      }

      mockPrisma.tradingBot.create.mockResolvedValue(mockBot)

      const result = await tradingBotService.createBot({
        name: 'Test Bot',
        userId: 'user-1',
        strategyId: 'strategy-1',
        config: { param: 'value' }
      })

      expect(result).toEqual(mockBot)
      expect(mockPrisma.tradingBot.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Bot',
          status: 'STOPPED',
          config: '{"param":"value"}',
          userId: 'user-1',
          strategyId: 'strategy-1',
          wallet: {
            create: {
              balance: 0,
              totalDeposits: 0,
              totalWithdraws: 0
            }
          }
        },
        include: {
          wallet: true
        }
      })
    })
  })

  describe('updateBotStatus', () => {
    it('should update bot status', async () => {
      const mockBot = {
        id: 'bot-1',
        name: 'Test Bot',
        status: 'RUNNING',
        config: '{"param":"value"}',
        userId: 'user-1',
        strategyId: 'strategy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTradeAt: null
      }

      mockPrisma.tradingBot.update.mockResolvedValue(mockBot)

      const result = await tradingBotService.updateBotStatus('bot-1', 'RUNNING' as BotStatus)

      expect(result).toEqual(mockBot)
      expect(mockPrisma.tradingBot.update).toHaveBeenCalledWith({
        where: { id: 'bot-1' },
        data: { status: 'RUNNING' }
      })
    })
  })

  describe('getBotById', () => {
    it('should get bot by ID with related data', async () => {
      const mockBot = {
        id: 'bot-1',
        name: 'Test Bot',
        status: 'STOPPED',
        config: '{"param":"value"}',
        userId: 'user-1',
        strategyId: 'strategy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTradeAt: null,
        wallet: {
          id: 'wallet-1',
          balance: 1000,
          totalDeposits: 1000,
          totalWithdraws: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          botId: 'bot-1',
          positions: []
        },
        trades: []
      }

      mockPrisma.tradingBot.findUnique.mockResolvedValue(mockBot)

      const result = await tradingBotService.getBotById('bot-1')

      expect(result).toEqual(mockBot)
      expect(mockPrisma.tradingBot.findUnique).toHaveBeenCalledWith({
        where: { id: 'bot-1' },
        include: {
          wallet: {
            include: {
              positions: {
                where: {
                  status: 'OPEN'
                }
              }
            }
          },
          trades: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      })
    })

    it('should return null if bot is not found', async () => {
      mockPrisma.tradingBot.findUnique.mockResolvedValue(null)

      const result = await tradingBotService.getBotById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getUserBots', () => {
    it('should get all bots for a user', async () => {
      const mockBots = [
        {
          id: 'bot-1',
          name: 'Test Bot 1',
          status: 'STOPPED',
          config: '{"param":"value"}',
          userId: 'user-1',
          strategyId: 'strategy-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastTradeAt: null,
          wallet: {
            id: 'wallet-1',
            balance: 1000,
            totalDeposits: 1000,
            totalWithdraws: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            botId: 'bot-1'
          },
          strategy: {
            id: 'strategy-1',
            name: 'Test Strategy',
            type: 'MEAN_REVERSION',
            config: '{"param":"value"}',
            userId: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ]

      mockPrisma.tradingBot.findMany.mockResolvedValue(mockBots)

      const result = await tradingBotService.getUserBots('user-1')

      expect(result).toEqual(mockBots)
      expect(mockPrisma.tradingBot.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          wallet: true,
          strategy: true
        }
      })
    })

    it('should return empty array if no bots found', async () => {
      mockPrisma.tradingBot.findMany.mockResolvedValue([])

      const result = await tradingBotService.getUserBots('user-1')

      expect(result).toEqual([])
    })
  })

  describe('deleteBot', () => {
    it('should delete a bot', async () => {
      const mockBot = {
        id: 'bot-1',
        name: 'Test Bot',
        status: 'STOPPED',
        config: '{"param":"value"}',
        userId: 'user-1',
        strategyId: 'strategy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTradeAt: null
      }

      mockPrisma.tradingBot.delete.mockResolvedValue(mockBot)

      const result = await tradingBotService.deleteBot('bot-1')

      expect(result).toEqual(mockBot)
      expect(mockPrisma.tradingBot.delete).toHaveBeenCalledWith({
        where: { id: 'bot-1' }
      })
    })
  })

  describe('updateBotConfig', () => {
    it('should update bot configuration', async () => {
      const mockBot = {
        id: 'bot-1',
        name: 'Test Bot',
        status: 'STOPPED',
        config: '{"param":"new-value"}',
        userId: 'user-1',
        strategyId: 'strategy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTradeAt: null
      }

      mockPrisma.tradingBot.update.mockResolvedValue(mockBot)

      const result = await tradingBotService.updateBotConfig('bot-1', { param: 'new-value' })

      expect(result).toEqual(mockBot)
      expect(mockPrisma.tradingBot.update).toHaveBeenCalledWith({
        where: { id: 'bot-1' },
        data: {
          config: '{"param":"new-value"}'
        }
      })
    })
  })
}) 