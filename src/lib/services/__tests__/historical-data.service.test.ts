import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HistoricalDataService } from '../historical-data.service'
import type { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import type { TimeFrame } from '$lib/types'

// Mock the logger
vi.mock('$lib/server/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

import { logger } from '$lib/server/logger'

describe('HistoricalDataService', () => {
  let service: HistoricalDataService
  let mockPrisma: ReturnType<typeof mockDeep<PrismaClient>>

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>()
    service = new HistoricalDataService(mockPrisma)
    vi.clearAllMocks()
  })

  describe('validatePriceData', () => {
    it('should validate high < low', async () => {
      const invalidPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 0.8, // Invalid: high < low
        low: 1.0,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      await expect(service.upsertPrice(invalidPrice)).rejects.toThrow('Invalid OHLC data')
      expect(logger.error).toHaveBeenCalledWith('Invalid OHLC data:', { data: invalidPrice })
    })

    it('should validate high < open', async () => {
      const invalidPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.2, // Invalid: high < open
        high: 1.0,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      await expect(service.upsertPrice(invalidPrice)).rejects.toThrow('Invalid OHLC data')
      expect(logger.error).toHaveBeenCalledWith('Invalid OHLC data:', { data: invalidPrice })
    })

    it('should validate high < close', async () => {
      const invalidPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.0,
        low: 0.8,
        close: 1.2, // Invalid: high < close
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      await expect(service.upsertPrice(invalidPrice)).rejects.toThrow('Invalid OHLC data')
      expect(logger.error).toHaveBeenCalledWith('Invalid OHLC data:', { data: invalidPrice })
    })

    it('should validate negative volume', async () => {
      const invalidPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: -1000, // Invalid: negative volume
        source: 'birdeye',
        timeframe: '1h'
      }

      await expect(service.upsertPrice(invalidPrice)).rejects.toThrow('Invalid volume data')
      expect(logger.error).toHaveBeenCalledWith('Invalid volume data:', { data: invalidPrice })
    })
  })

  describe('upsertPrice', () => {
    it('should upsert a price record', async () => {
      const price = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      mockPrisma.historicalPrice.upsert.mockResolvedValueOnce({
        ...price,
        id: 'price-1',
        createdAt: new Date()
      })

      await service.upsertPrice(price)

      expect(mockPrisma.historicalPrice.upsert).toHaveBeenCalledWith({
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
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should handle transaction failure', async () => {
      const price = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      const error = new Error('Database error')
      mockPrisma.historicalPrice.upsert.mockRejectedValueOnce(error)

      await expect(service.upsertPrice(price)).rejects.toThrow('Database error')
      expect(logger.error).toHaveBeenCalledWith('Failed to upsert price:', { error, data: price })
    })

    it('should validate price data before upserting', async () => {
      const invalidPrice = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: -1.0, // Invalid negative price
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      await expect(service.upsertPrice(invalidPrice)).rejects.toThrow('Invalid price data')
      expect(logger.error).toHaveBeenCalledWith('Invalid price data:', { data: invalidPrice })
    })

    it('should handle non-Error exceptions', async () => {
      const price = {
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h'
      }

      mockPrisma.historicalPrice.upsert.mockRejectedValueOnce('Unknown error')

      await expect(service.upsertPrice(price)).rejects.toThrow('Failed to upsert price data')
      expect(logger.error).toHaveBeenCalledWith('Unknown error upserting price:', { error: 'Unknown error', data: price })
    })
  })

  describe('batchUpsertPrices', () => {
    it('should handle empty price array', async () => {
      const result = await service.batchUpsertPrices([])
      expect(result).toEqual([])
      expect(mockPrisma.historicalPrice.upsert).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should batch upsert multiple price records', async () => {
      const prices = [
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 1.0,
          high: 1.2,
          low: 0.8,
          close: 1.1,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        },
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 2.0,
          high: 2.2,
          low: 1.8,
          close: 2.1,
          volume: 2000,
          source: 'birdeye',
          timeframe: '1h'
        }
      ]

      const mockUpsertResults = prices.map((price, index) => ({
        ...price,
        id: `price-${index + 1}`,
        createdAt: new Date()
      }))

      mockPrisma.$transaction.mockResolvedValueOnce(mockUpsertResults)

      const result = await service.batchUpsertPrices(prices)

      expect(result).toEqual(mockUpsertResults)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockPrisma.historicalPrice.upsert).toHaveBeenCalledTimes(2)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should handle validation failure in batch', async () => {
      const prices = [
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 1.0,
          high: 1.2,
          low: 0.8,
          close: 1.1,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        },
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: -1.0, // Invalid: negative price
          high: 1.2,
          low: 0.8,
          close: 1.1,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        }
      ]

      await expect(service.batchUpsertPrices(prices)).rejects.toThrow('Failed to batch upsert prices')
      expect(logger.error).toHaveBeenCalledWith('Invalid price data:', { data: prices[1] })
    })

    it('should handle transaction error', async () => {
      const prices = [
        {
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 1.0,
          high: 1.2,
          low: 0.8,
          close: 1.1,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h'
        }
      ]

      const error = new Error('Transaction failed')
      mockPrisma.$transaction.mockRejectedValueOnce(error)

      await expect(service.batchUpsertPrices(prices)).rejects.toThrow('Failed to batch upsert prices')
      expect(logger.error).toHaveBeenCalledWith('Failed to batch upsert prices:', { error, count: 1 })
    })
  })

  describe('getPrices', () => {
    it('should validate time range', async () => {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() + 1000) // Invalid: start time after end time

      const params = {
        pair: 'SOL/USD',
        timeframe: '1h' as TimeFrame,
        startTime,
        endTime
      }

      await expect(service.getPrices(params)).rejects.toThrow('Invalid time range')
      expect(logger.error).toHaveBeenCalledWith('Invalid time range for getPrices:', { params })
    })

    it('should return historical prices', async () => {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 1000)
      const mockPrices = [
        {
          id: 'price-1',
          pair: 'SOL/USD',
          timestamp: new Date(),
          open: 1.0,
          high: 1.2,
          low: 0.8,
          close: 1.1,
          volume: 1000,
          source: 'birdeye',
          timeframe: '1h',
          createdAt: new Date()
        }
      ]

      mockPrisma.historicalPrice.findMany.mockResolvedValueOnce(mockPrices)

      const params = {
        pair: 'SOL/USD',
        timeframe: '1h' as TimeFrame,
        startTime,
        endTime
      }

      const result = await service.getPrices(params)

      expect(result).toEqual(mockPrices)
      expect(mockPrisma.historicalPrice.findMany).toHaveBeenCalledWith({
        where: {
          pair: 'SOL/USD',
          timeframe: '1h',
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      const params = {
        pair: '', // Invalid: empty pair
        timeframe: '1h' as TimeFrame,
        startTime: new Date(),
        endTime: new Date()
      }

      await expect(service.getPrices(params)).rejects.toThrow('Invalid parameters')
      expect(logger.error).toHaveBeenCalledWith('Invalid parameters for getPrices:', { params })
    })

    it('should handle database error', async () => {
      const params = {
        pair: 'SOL/USD',
        timeframe: '1h' as TimeFrame,
        startTime: new Date(),
        endTime: new Date()
      }

      const error = new Error('Database error')
      mockPrisma.historicalPrice.findMany.mockRejectedValueOnce(error)

      await expect(service.getPrices(params)).rejects.toThrow('Failed to fetch historical prices')
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch historical prices:', { error, params })
    })
  })

  describe('getLatestPrice', () => {
    it('should return the latest price', async () => {
      const mockPrice = {
        id: 'price-1',
        pair: 'SOL/USD',
        timestamp: new Date(),
        open: 1.0,
        high: 1.2,
        low: 0.8,
        close: 1.1,
        volume: 1000,
        source: 'birdeye',
        timeframe: '1h',
        createdAt: new Date()
      }

      mockPrisma.historicalPrice.findFirst.mockResolvedValueOnce(mockPrice)

      const result = await service.getLatestPrice('SOL/USD', '1h' as TimeFrame)

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
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should handle no data found', async () => {
      mockPrisma.historicalPrice.findFirst.mockResolvedValueOnce(null)

      const result = await service.getLatestPrice('SOL/USD', '1h' as TimeFrame)

      expect(result).toBeNull()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should handle database error', async () => {
      const error = new Error('Database error')
      mockPrisma.historicalPrice.findFirst.mockRejectedValueOnce(error)

      const result = await service.getLatestPrice('SOL/USD', '1h' as TimeFrame)

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch latest price:', { error, pair: 'SOL/USD', timeframe: '1h' })
    })
  })

  describe('cleanupOldData', () => {
    it('should validate cleanup date', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour in future
      await expect(service.cleanupOldData(futureDate)).rejects.toThrow('Cannot cleanup future data')
      expect(logger.error).toHaveBeenCalledWith('Cannot cleanup future data:', { olderThan: futureDate })
    })

    it('should delete old price records', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24) // 24 hours ago
      mockPrisma.historicalPrice.deleteMany.mockResolvedValueOnce({ count: 10 })

      const result = await service.cleanupOldData(oldDate)

      expect(result).toEqual({ count: 10 })
      expect(mockPrisma.historicalPrice.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: oldDate
          }
        }
      })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should handle deletion errors', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24)
      const error = new Error('Database error')
      mockPrisma.historicalPrice.deleteMany.mockRejectedValueOnce(error)

      await expect(service.cleanupOldData(oldDate)).rejects.toThrow('Failed to cleanup historical data')
      expect(logger.error).toHaveBeenCalledWith('Failed to cleanup historical data:', { error, olderThan: oldDate })
    })
  })
}) 