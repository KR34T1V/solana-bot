import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StrategyService } from '../strategy.service'
import { BirdeyeService } from '../birdeye.service'
import { WalletService } from '../wallet.service'
import { TradingBotService } from '../trading-bot.service'
import { ApiKeyService } from '../api-key.service'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockDeep } from 'vitest-mock-extended'
import type { BirdeyePriceResponse, BirdeyeOHLCVResponse, BirdeyeTokenPrice, BirdeyeOHLCV } from '$lib/types/birdeye.types'
import type { PrismaClient } from '@prisma/client'

describe('StrategyService', () => {
  let strategyService: StrategyService
  let mockBirdeyeService: DeepMockProxy<BirdeyeService>
  let mockWalletService: DeepMockProxy<WalletService>
  let mockTradingBotService: DeepMockProxy<TradingBotService>
  let mockApiKeyService: DeepMockProxy<ApiKeyService>
  let mockPrisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock instances
    mockPrisma = mockDeep<PrismaClient>()
    mockBirdeyeService = mockDeep<BirdeyeService>()
    mockWalletService = mockDeep<WalletService>()
    mockTradingBotService = mockDeep<TradingBotService>()
    mockApiKeyService = mockDeep<ApiKeyService>()

    // Create service instance
    strategyService = new StrategyService(mockPrisma)
    
    // Replace the private service instances with mocks
    Object.assign(strategyService, {
      birdeyeService: mockBirdeyeService,
      walletService: mockWalletService,
      tradingBotService: mockTradingBotService,
      apiKeyService: mockApiKeyService
    })

    // Setup default API key responses
    const mockApiKey = {
      id: 'test-key-id',
      name: 'Test Key',
      key: 'test-api-key',
      provider: 'birdeye',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'test-user'
    }
    mockApiKeyService.getActiveKey.mockResolvedValue(mockApiKey)
    mockApiKeyService.getDecryptedKey.mockResolvedValue(mockApiKey.key)
  })

  describe('executeStrategy', () => {
    it('should throw error if bot is not found', async () => {
      mockTradingBotService.getBotById.mockResolvedValue(null)

      await expect(strategyService.executeStrategy('non-existent-bot'))
        .rejects.toThrow('Bot or wallet not found')
    })

    it('should throw error if bot wallet is not found', async () => {
      const mockBot = {
        id: 'test-bot',
        wallet: null,
        config: '{}',
        userId: 'test-user',
        name: 'Test Bot',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
        lastTradeAt: null,
        strategyId: 'test-strategy'
      }

      mockTradingBotService.getBotById.mockResolvedValue(mockBot)

      await expect(strategyService.executeStrategy('test-bot'))
        .rejects.toThrow('Bot or wallet not found')
    })

    it('should throw error for unknown strategy type', async () => {
      const mockWallet = {
        id: 'test-wallet',
        userId: 'test-user',
        balance: 1000,
        positions: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDeposits: 1000,
        totalWithdraws: 0,
        botId: 'test-bot'
      }

      const mockBot = {
        id: 'test-bot',
        wallet: mockWallet,
        config: JSON.stringify({ type: 'UNKNOWN_STRATEGY' }),
        userId: 'test-user',
        name: 'Test Bot',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
        lastTradeAt: null,
        strategyId: 'test-strategy'
      }

      const mockTokenPrice: BirdeyeTokenPrice = {
        value: 100,
        updateUnixTime: Date.now() / 1000
      }

      const mockPriceResponse: BirdeyePriceResponse = {
        success: true,
        data: mockTokenPrice
      }

      const mockOHLCVItems: BirdeyeOHLCV[] = Array(20).fill({
        unixTime: Date.now() / 1000,
        open: 100,
        high: 110,
        low: 90,
        close: 100,
        volume: 1000
      })

      const mockOHLCVResponse: BirdeyeOHLCVResponse = {
        success: true,
        data: {
          items: mockOHLCVItems
        }
      }

      mockTradingBotService.getBotById.mockResolvedValue(mockBot)
      mockWalletService.getWalletByBotId.mockResolvedValue(mockWallet)
      mockBirdeyeService.getTokenPrice.mockResolvedValue(mockPriceResponse)
      mockBirdeyeService.getOHLCVData.mockResolvedValue(mockOHLCVResponse)

      await expect(strategyService.executeStrategy('test-bot'))
        .rejects.toThrow('Unknown strategy type: UNKNOWN_STRATEGY')
    })
  })

  describe('Mean Reversion Strategy', () => {
    it('should execute mean reversion strategy successfully', async () => {
      const mockWallet = {
        id: 'test-wallet',
        userId: 'test-user',
        balance: 1000,
        positions: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDeposits: 1000,
        totalWithdraws: 0,
        botId: 'test-bot'
      }

      const mockBot = {
        id: 'test-bot',
        wallet: mockWallet,
        config: JSON.stringify({
          type: 'MEAN_REVERSION',
          pair: 'SOL/USD',
          timeframe: '1h',
          lookbackPeriods: 20,
          deviationThreshold: 2
        }),
        userId: 'test-user',
        name: 'Test Bot',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
        lastTradeAt: null,
        strategyId: 'test-strategy'
      }

      const mockTokenPrice: BirdeyeTokenPrice = {
        value: 100,
        updateUnixTime: Date.now() / 1000
      }

      const mockPriceResponse: BirdeyePriceResponse = {
        success: true,
        data: mockTokenPrice
      }

      const mockOHLCVItems: BirdeyeOHLCV[] = Array(20).fill({
        unixTime: Date.now() / 1000,
        open: 100,
        high: 110,
        low: 90,
        close: 100,
        volume: 1000
      })

      const mockOHLCVResponse: BirdeyeOHLCVResponse = {
        success: true,
        data: {
          items: mockOHLCVItems
        }
      }

      // Mock required data
      mockTradingBotService.getBotById.mockResolvedValue(mockBot)
      mockWalletService.getWalletByBotId.mockResolvedValue(mockWallet)
      mockBirdeyeService.getTokenPrice.mockResolvedValue(mockPriceResponse)
      mockBirdeyeService.getOHLCVData.mockResolvedValue(mockOHLCVResponse)

      // Execute strategy
      await strategyService.executeStrategy('test-bot')

      // Verify services were called
      expect(mockTradingBotService.getBotById).toHaveBeenCalledWith('test-bot')
      expect(mockBirdeyeService.getTokenPrice).toHaveBeenCalled()
      expect(mockBirdeyeService.getOHLCVData).toHaveBeenCalled()
    })
  })

  describe('Trend Following Strategy', () => {
    it('should execute trend following strategy successfully', async () => {
      const mockWallet = {
        id: 'test-wallet',
        userId: 'test-user',
        balance: 1000,
        positions: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDeposits: 1000,
        totalWithdraws: 0,
        botId: 'test-bot'
      }

      const mockBot = {
        id: 'test-bot',
        wallet: mockWallet,
        config: JSON.stringify({
          type: 'TREND_FOLLOWING',
          pair: 'SOL/USD',
          timeframe: '1h',
          shortPeriod: 9,
          longPeriod: 21
        }),
        userId: 'test-user',
        name: 'Test Bot',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        trades: [],
        lastTradeAt: null,
        strategyId: 'test-strategy'
      }

      const mockTokenPrice: BirdeyeTokenPrice = {
        value: 100,
        updateUnixTime: Date.now() / 1000
      }

      const mockPriceResponse: BirdeyePriceResponse = {
        success: true,
        data: mockTokenPrice
      }

      const mockOHLCVItems: BirdeyeOHLCV[] = Array(21).fill({
        unixTime: Date.now() / 1000,
        open: 100,
        high: 110,
        low: 90,
        close: 100,
        volume: 1000
      })

      const mockOHLCVResponse: BirdeyeOHLCVResponse = {
        success: true,
        data: {
          items: mockOHLCVItems
        }
      }

      // Mock required data
      mockTradingBotService.getBotById.mockResolvedValue(mockBot)
      mockWalletService.getWalletByBotId.mockResolvedValue(mockWallet)
      mockBirdeyeService.getTokenPrice.mockResolvedValue(mockPriceResponse)
      mockBirdeyeService.getOHLCVData.mockResolvedValue(mockOHLCVResponse)

      // Execute strategy
      await strategyService.executeStrategy('test-bot')

      // Verify services were called
      expect(mockTradingBotService.getBotById).toHaveBeenCalledWith('test-bot')
      expect(mockBirdeyeService.getTokenPrice).toHaveBeenCalled()
      expect(mockBirdeyeService.getOHLCVData).toHaveBeenCalled()
    })
  })
}) 