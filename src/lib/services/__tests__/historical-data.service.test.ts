import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HistoricalDataService } from '../historical-data.service'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockDeep } from 'vitest-mock-extended'
import type { PrismaClient, HistoricalPrice } from '@prisma/client'
import type { TimeFrame } from '$lib/types'

describe('HistoricalDataService', () => {
  let historicalDataService: HistoricalDataService
  let mockPrisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock instances
    mockPrisma = mockDeep<PrismaClient>()

    // Create service instance
    historicalDataService = new HistoricalDataService(mockPrisma)
  })

  describe('upsertPrice', () => {
    it('should upsert a single price record', async () => {
      const mockPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      mockPrisma.historicalPrice.upsert.mockResolvedValue(mockPrice as HistoricalPrice)

      const result = await historicalDataService.upsertPrice(mockPrice)

      expect(result).toEqual(mockPrice)
      expect(mockPrisma.historicalPrice.upsert).toHaveBeenCalledWith({
        where: {
          pair_timestamp_timeframe: {
            pair: mockPrice.pair,
            timestamp: mockPrice.timestamp,
            timeframe: mockPrice.timeframe
          }
        },
        create: mockPrice,
        update: mockPrice
      })
    })
  })

  describe('batchUpsertPrices', () => {
    it('should upsert multiple price records in a transaction', async () => {
      const mockPrices = [
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        },
        {
          pair: 'SOL/USD',
          timestamp: new Date(Date.now() + 3600000),
          open: 105,
          high: 115,
          low: 95,
          close: 110,
          volume: 1200,
          source: 'birdeye',
          timeframe: '1h'
        }
      ] as HistoricalPrice[]

      mockPrisma.$transaction.mockResolvedValue(mockPrices)

      const result = await historicalDataService.batchUpsertPrices(mockPrices)

      expect(result).toEqual(mockPrices)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockPrisma.historicalPrice.upsert).toHaveBeenCalledTimes(mockPrices.length)

      // Verify each upsert call
      mockPrices.forEach((price, index) => {
        expect(mockPrisma.historicalPrice.upsert).toHaveBeenNthCalledWith(index + 1, {
          where: {
            pair_timestamp_timeframe: {
              pair: price.pair,
              timestamp: price.timestamp,
              timeframe: price.timeframe
            }
          },
          create: price,
          update: price
        })
      })
    })
  })

  describe('getPrices', () => {
    it('should get historical prices within a time range', async () => {
      const mockPrices = [
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        },
        {
          pair: 'SOL/USD',
          timestamp: new Date(Date.now() + 3600000),
          open: 105,
          high: 115,
          low: 95,
          close: 110,
          volume: 1200,
          source: 'birdeye',
          timeframe: '1h'
        }
      ] as HistoricalPrice[]

      const params = {
        pair: 'SOL/USD',
        timeframe: '1h' as TimeFrame,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 7200000)
      }

      mockPrisma.historicalPrice.findMany.mockResolvedValue(mockPrices)

      const result = await historicalDataService.getPrices(params)

      expect(result).toEqual(mockPrices)
      expect(mockPrisma.historicalPrice.findMany).toHaveBeenCalledWith({
        where: {
          pair: params.pair,
          timeframe: params.timeframe,
          timestamp: {
            gte: params.startTime,
            lte: params.endTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })
    })
  })

  describe('getLatestPrice', () => {
    it('should get the latest price for a trading pair', async () => {
      const mockPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      } as HistoricalPrice

      mockPrisma.historicalPrice.findFirst.mockResolvedValue(mockPrice)

      const result = await historicalDataService.getLatestPrice('SOL/USD', '1h' as TimeFrame)

      expect(result).toEqual(mockPrice)
      expect(mockPrisma.historicalPrice.findFirst).toHaveBeenCalledWith({
        where: {
          pair: 'SOL/USD',
          timeframe: '1h'
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
    })

    it('should return null if no price is found', async () => {
      mockPrisma.historicalPrice.findFirst.mockResolvedValue(null)

      const result = await historicalDataService.getLatestPrice('SOL/USD', '1h' as TimeFrame)

      expect(result).toBeNull()
    })
  })

  describe('cleanupOldData', () => {
    it('should delete historical prices older than the specified date', async () => {
      const olderThan = new Date(Date.now() - 86400000) // 24 hours ago
      const mockDeleteResult = { count: 10 }

      mockPrisma.historicalPrice.deleteMany.mockResolvedValue(mockDeleteResult)

      const result = await historicalDataService.cleanupOldData(olderThan)

      expect(result).toEqual(mockDeleteResult)
      expect(mockPrisma.historicalPrice.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: olderThan
          }
        }
      })
    })
  })
}) 