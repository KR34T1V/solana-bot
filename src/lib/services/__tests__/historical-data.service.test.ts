import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HistoricalDataService } from '../historical-data.service'
import type { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import type { TimeFrame } from '$lib/types'

describe('HistoricalDataService', () => {
  let service: HistoricalDataService
  let mockPrisma: ReturnType<typeof mockDeep<PrismaClient>>

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>()
    service = new HistoricalDataService(mockPrisma)
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

      mockPrisma.historicalPrice.upsert.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.upsertPrice(price)).rejects.toThrow('Database error')
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
    })
  })

  describe('batchUpsertPrices', () => {
    it('should handle empty price array', async () => {
      const result = await service.batchUpsertPrices([])
      expect(result).toEqual([])
      expect(mockPrisma.historicalPrice.upsert).not.toHaveBeenCalled()
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
    })
  })

  describe('getPrices', () => {
    it('should validate time range', async () => {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() + 1000) // Invalid: start time after end time

      await expect(
        service.getPrices({
          pair: 'SOL/USD',
          timeframe: '1h' as TimeFrame,
          startTime,
          endTime
        })
      ).rejects.toThrow('Invalid time range')
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

      const result = await service.getPrices({
        pair: 'SOL/USD',
        timeframe: '1h' as TimeFrame,
        startTime,
        endTime
      })

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
    })
  })

  describe('cleanupOldData', () => {
    it('should validate cleanup date', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour in future
      await expect(service.cleanupOldData(futureDate)).rejects.toThrow('Cannot cleanup future data')
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
    })

    it('should handle deletion errors', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24)
      mockPrisma.historicalPrice.deleteMany.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.cleanupOldData(oldDate)).rejects.toThrow('Failed to cleanup historical data')
    })
  })
}) 