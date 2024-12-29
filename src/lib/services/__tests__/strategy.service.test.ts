import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StrategyService } from '../strategy.service'
import { BirdeyeService } from '../birdeye.service'
import { WalletService } from '../wallet.service'
import { TradingBotService } from '../trading-bot.service'
import { ApiKeyService } from '../api-key.service'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockDeep } from 'vitest-mock-extended'
import type { BirdeyePriceResponse, BirdeyeOHLCVResponse, BirdeyeTokenPrice, BirdeyeOHLCV } from '$lib/types/birdeye.types'
import type { PrismaClient } from '@prisma/client'
import type { TimeFrame } from '$lib/types'

interface StrategyContext {
  pair: string
  timeframe: TimeFrame
  currentPrice: number
  historicalPrices: {
    timestamp: Date
    open: number
    high: number
    low: number
    close: number
    volume: number
  }[]
  positions: {
    id: string
    side: 'LONG' | 'SHORT'
    size: number
    entryPrice: number
    currentPrice: number | null
    pnl: number | null
  }[]
  balance: number
  walletId: string
}

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
    it('should open long position when price is significantly below mean', async () => {
      const context: StrategyContext = {
        pair: 'SOL/USD',
        timeframe: '1h',
        currentPrice: 80, // Significantly below mean of 100
        historicalPrices: Array(20).fill({
          timestamp: new Date(),
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000
        }),
        positions: [],
        balance: 1000,
        walletId: 'test-wallet'
      }

      const config = {
        lookbackPeriods: 20,
        deviationThreshold: 2,
        riskPerTrade: 0.02
      }

      await strategyService['executeMeanReversionStrategy'](context, config)

      expect(mockWalletService.openPosition).toHaveBeenCalledWith({
        walletId: 'test-wallet',
        pair: 'SOL/USD',
        side: 'LONG',
        size: expect.any(Number),
        entryPrice: 80
      })
    })

    it('should close positions when price reverts to mean', async () => {
      // Create a distribution of prices around 100 with standard deviation of 10
      const historicalPrices = Array(20).fill(null).map((_, i) => ({
        timestamp: new Date(),
        open: 100,
        high: 110,
        low: 90,
        close: i < 10 ? 110 : 90, // Half above, half below mean to create std dev
        volume: 1000
      }))

      const context: StrategyContext = {
        pair: 'SOL/USD',
        timeframe: '1h',
        currentPrice: 100, // At mean
        historicalPrices,
        positions: [{
          id: 'test-position',
          side: 'LONG' as const,
          size: 1,
          entryPrice: 80,
          currentPrice: 100,
          pnl: 20
        }],
        balance: 1000,
        walletId: 'test-wallet'
      }

      const config = {
        lookbackPeriods: 20,
        deviationThreshold: 2,
        riskPerTrade: 0.02
      }

      await strategyService['executeMeanReversionStrategy'](context, config)

      expect(mockWalletService.closePosition).toHaveBeenCalledWith({
        positionId: 'test-position',
        exitPrice: 100
      })
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

  describe('buildStrategyContext', () => {
    it('should throw error when wallet is not found', async () => {
      mockWalletService.getWalletByBotId.mockResolvedValue(null)

      await expect(strategyService['buildStrategyContext']('test-wallet', {
        pair: 'SOL/USD',
        timeframe: '1h'
      })).rejects.toThrow('Wallet not found')
    })

    it('should throw error when no active API key exists', async () => {
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

      mockWalletService.getWalletByBotId.mockResolvedValue(mockWallet)
      mockApiKeyService.getActiveKey.mockResolvedValue(null)

      await expect(strategyService['buildStrategyContext']('test-wallet', {
        pair: 'SOL/USD',
        timeframe: '1h'
      })).rejects.toThrow('No active Birdeye API key found')
    })

    it('should throw error when API key decryption fails', async () => {
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

      mockWalletService.getWalletByBotId.mockResolvedValue(mockWallet)
      mockApiKeyService.getActiveKey.mockResolvedValue({
        id: 'test-key',
        name: 'Test Key',
        key: 'encrypted-key',
        provider: 'birdeye',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'test-user'
      })
      mockApiKeyService.getDecryptedKey.mockResolvedValue(null)

      await expect(strategyService['buildStrategyContext']('test-wallet', {
        pair: 'SOL/USD',
        timeframe: '1h'
      })).rejects.toThrow('Failed to decrypt Birdeye API key')
    })
  })

  describe('Position Management', () => {
    it('should calculate correct position size based on risk parameters', () => {
      const balance = 1000
      const currentPrice = 100
      const config = { riskPerTrade: 0.05 } // 5% risk

      const size = strategyService['calculatePositionSize'](balance, currentPrice, config)
      expect(size).toBe(0.5) // (1000 * 0.05) / 100 = 0.5
    })

    it('should use default risk parameter if not specified', () => {
      const balance = 1000
      const currentPrice = 100
      const config = {}

      const size = strategyService['calculatePositionSize'](balance, currentPrice, config)
      expect(size).toBe(0.2) // (1000 * 0.02) / 100 = 0.2
    })

    it('should correctly identify open positions', () => {
      const positions = [
        { id: '1', side: 'LONG' as const, size: 1, entryPrice: 100, currentPrice: 110, pnl: 10 },
        { id: '2', side: 'SHORT' as const, size: 0.5, entryPrice: 120, currentPrice: 110, pnl: 5 }
      ]

      expect(strategyService['hasOpenPosition'](positions, 'LONG')).toBe(true)
      expect(strategyService['hasOpenPosition'](positions, 'SHORT')).toBe(true)
      expect(strategyService['hasOpenPosition']([], 'LONG')).toBe(false)
    })

    it('should close all positions of specified side', async () => {
      const positions = [
        { id: '1', side: 'LONG' as const, size: 1, entryPrice: 100, currentPrice: 110, pnl: 10 },
        { id: '2', side: 'LONG' as const, size: 0.5, entryPrice: 105, currentPrice: 110, pnl: 2.5 }
      ]

      await strategyService['closePositions'](positions, 'LONG', 110)

      expect(mockWalletService.closePosition).toHaveBeenCalledTimes(2)
      expect(mockWalletService.closePosition).toHaveBeenCalledWith({
        positionId: '1',
        exitPrice: 110
      })
      expect(mockWalletService.closePosition).toHaveBeenCalledWith({
        positionId: '2',
        exitPrice: 110
      })
    })
  })

  describe('Technical Indicators', () => {
    it('should calculate EMA correctly', () => {
      const prices = [10, 11, 12, 13, 14, 15]
      const period = 3
      const ema = strategyService['calculateEMA'](prices, period)
      
      // EMA calculation with k = 2/(3+1) = 0.5
      // EMA = Price(t) * k + EMA(y) * (1-k)
      // First value is 10
      // Second: 11 * 0.5 + 10 * 0.5 = 10.5
      // Third: 12 * 0.5 + 10.5 * 0.5 = 11.25
      // Fourth: 13 * 0.5 + 11.25 * 0.5 = 12.125
      // Fifth: 14 * 0.5 + 12.125 * 0.5 = 13.0625
      // Sixth: 15 * 0.5 + 13.0625 * 0.5 = 14.03125
      expect(ema).toBeCloseTo(14.03, 2)
    })

    it('should handle single price for EMA', () => {
      const prices = [10]
      const period = 3
      const ema = strategyService['calculateEMA'](prices, period)
      
      expect(ema).toBe(10)
    })
  })
}) 