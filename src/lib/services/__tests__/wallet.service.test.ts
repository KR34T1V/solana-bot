import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WalletService } from '../wallet.service'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockDeep } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import type { PositionSide } from '$lib/types'

describe('WalletService', () => {
  let walletService: WalletService
  let mockPrisma: DeepMockProxy<PrismaClient>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock instances
    mockPrisma = mockDeep<PrismaClient>()

    // Create service instance
    walletService = new WalletService(mockPrisma)
  })

  describe('getWalletByBotId', () => {
    it('should get wallet with open positions and recent transactions', async () => {
      const mockWallet = {
        id: 'wallet-1',
        balance: 1000,
        totalDeposits: 1000,
        totalWithdraws: 0,
        botId: 'bot-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        positions: [],
        transactions: []
      }

      mockPrisma.virtualWallet.findUnique.mockResolvedValue(mockWallet)

      const result = await walletService.getWalletByBotId('bot-1')

      expect(result).toEqual(mockWallet)
      expect(mockPrisma.virtualWallet.findUnique).toHaveBeenCalledWith({
        where: { botId: 'bot-1' },
        include: {
          positions: {
            where: {
              status: 'OPEN'
            }
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      })
    })

    it('should return null if wallet is not found', async () => {
      mockPrisma.virtualWallet.findUnique.mockResolvedValue(null)

      const result = await walletService.getWalletByBotId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('deposit', () => {
    it('should add funds to wallet and create transaction', async () => {
      const mockWallet = {
        id: 'wallet-1',
        balance: 1100,
        totalDeposits: 1100,
        totalWithdraws: 0,
        botId: 'bot-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.update.mockResolvedValueOnce(mockWallet)
        mockPrisma.transaction.create.mockResolvedValueOnce({
          id: 'tx-1',
          type: 'DEPOSIT',
          amount: 100,
          currency: 'USD',
          status: 'COMPLETED',
          walletId: 'wallet-1',
          createdAt: new Date(),
          metadata: null
        })

        return callback(mockPrisma)
      })

      const result = await walletService.deposit({
        walletId: 'wallet-1',
        amount: 100,
        currency: 'USD'
      })

      expect(result).toEqual(mockWallet)
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { increment: 100 },
          totalDeposits: { increment: 100 }
        }
      })
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'DEPOSIT',
          amount: 100,
          currency: 'USD',
          status: 'COMPLETED',
          walletId: 'wallet-1'
        }
      })
    })
  })

  describe('withdraw', () => {
    it('should withdraw funds from wallet and create transaction', async () => {
      const mockWallet = {
        id: 'wallet-1',
        balance: 900,
        totalDeposits: 1000,
        totalWithdraws: 100,
        botId: 'bot-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce({
          ...mockWallet,
          balance: 1000
        })
        mockPrisma.virtualWallet.update.mockResolvedValueOnce(mockWallet)
        mockPrisma.transaction.create.mockResolvedValueOnce({
          id: 'tx-1',
          type: 'WITHDRAW',
          amount: 100,
          currency: 'USD',
          status: 'COMPLETED',
          walletId: 'wallet-1',
          createdAt: new Date(),
          metadata: null
        })

        return callback(mockPrisma)
      })

      const result = await walletService.withdraw({
        walletId: 'wallet-1',
        amount: 100,
        currency: 'USD'
      })

      expect(result).toEqual(mockWallet)
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { decrement: 100 },
          totalWithdraws: { increment: 100 }
        }
      })
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'WITHDRAW',
          amount: 100,
          currency: 'USD',
          status: 'COMPLETED',
          walletId: 'wallet-1'
        }
      })
    })

    it('should throw error if insufficient funds', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce({
          id: 'wallet-1',
          balance: 50,
          totalDeposits: 1000,
          totalWithdraws: 950,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        return callback(mockPrisma)
      })

      await expect(walletService.withdraw({
        walletId: 'wallet-1',
        amount: 100,
        currency: 'USD'
      })).rejects.toThrow('Insufficient funds')
    })

    it('should throw error if wallet not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce(null)
        return callback(mockPrisma)
      })

      await expect(walletService.withdraw({
        walletId: 'non-existent',
        amount: 100,
        currency: 'USD'
      })).rejects.toThrow('Insufficient funds')
    })
  })

  describe('openPosition', () => {
    it('should open a new position and update wallet balance', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'LONG',
        size: 10,
        entryPrice: 100,
        currentPrice: 100,
        pnl: 0,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce({
          id: 'wallet-1',
          balance: 2000,
          totalDeposits: 2000,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        mockPrisma.position.create.mockResolvedValueOnce(mockPosition)
        mockPrisma.virtualWallet.update.mockResolvedValueOnce({
          id: 'wallet-1',
          balance: 1000,
          totalDeposits: 2000,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        })

        return callback(mockPrisma)
      })

      const result = await walletService.openPosition({
        walletId: 'wallet-1',
        pair: 'SOL/USD',
        side: 'LONG' as PositionSide,
        size: 10,
        entryPrice: 100
      })

      expect(result).toEqual(mockPosition)
      expect(mockPrisma.position.create).toHaveBeenCalledWith({
        data: {
          pair: 'SOL/USD',
          side: 'LONG',
          size: 10,
          entryPrice: 100,
          status: 'OPEN',
          walletId: 'wallet-1'
        }
      })
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { decrement: 1000 }
        }
      })
    })

    it('should throw error if wallet not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce(null)
        return callback(mockPrisma)
      })

      await expect(walletService.openPosition({
        walletId: 'non-existent',
        pair: 'SOL/USD',
        side: 'LONG' as PositionSide,
        size: 10,
        entryPrice: 100
      })).rejects.toThrow('Wallet not found')
    })

    it('should throw error if insufficient funds', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.virtualWallet.findUnique.mockResolvedValueOnce({
          id: 'wallet-1',
          balance: 500,
          totalDeposits: 500,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        return callback(mockPrisma)
      })

      await expect(walletService.openPosition({
        walletId: 'wallet-1',
        pair: 'SOL/USD',
        side: 'LONG' as PositionSide,
        size: 10,
        entryPrice: 100
      })).rejects.toThrow('Insufficient funds')
    })
  })

  describe('closePosition', () => {
    it('should close position and update wallet balance with profit', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'LONG',
        size: 10,
        entryPrice: 100,
        currentPrice: 110,
        pnl: 100,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        wallet: {
          id: 'wallet-1',
          balance: 1000,
          totalDeposits: 2000,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.position.findUnique.mockResolvedValueOnce(mockPosition)
        mockPrisma.position.update.mockResolvedValueOnce({
          ...mockPosition,
          status: 'CLOSED',
          currentPrice: 110,
          pnl: 100,
          closedAt: new Date()
        })
        mockPrisma.virtualWallet.update.mockResolvedValueOnce({
          ...mockPosition.wallet,
          balance: 2100
        })

        return callback(mockPrisma)
      })

      const result = await walletService.closePosition({
        positionId: 'position-1',
        exitPrice: 110
      })

      expect(result.balance).toBe(2100)
      expect(mockPrisma.position.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          status: 'CLOSED',
          currentPrice: 110,
          pnl: 100,
          closedAt: expect.any(Date)
        }
      })
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { increment: 1100 }
        }
      })
    })

    it('should close short position and update wallet balance with profit', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'SHORT',
        size: 10,
        entryPrice: 100,
        currentPrice: 90,
        pnl: 100,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        wallet: {
          id: 'wallet-1',
          balance: 1000,
          totalDeposits: 2000,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.position.findUnique.mockResolvedValueOnce(mockPosition)
        mockPrisma.position.update.mockResolvedValueOnce({
          ...mockPosition,
          status: 'CLOSED',
          currentPrice: 90,
          pnl: 100,
          closedAt: new Date()
        })
        mockPrisma.virtualWallet.update.mockResolvedValueOnce({
          ...mockPosition.wallet,
          balance: 2100
        })

        return callback(mockPrisma)
      })

      const result = await walletService.closePosition({
        positionId: 'position-1',
        exitPrice: 90
      })

      expect(result.balance).toBe(2100)
      expect(mockPrisma.position.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          status: 'CLOSED',
          currentPrice: 90,
          pnl: 100,
          closedAt: expect.any(Date)
        }
      })
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { increment: 1100 }
        }
      })
    })

    it('should close position and update wallet balance with loss', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'LONG',
        size: 10,
        entryPrice: 100,
        currentPrice: 90,
        pnl: -100,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        wallet: {
          id: 'wallet-1',
          balance: 1000,
          totalDeposits: 2000,
          totalWithdraws: 0,
          botId: 'bot-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.position.findUnique.mockResolvedValueOnce(mockPosition)
        mockPrisma.position.update.mockResolvedValueOnce({
          ...mockPosition,
          status: 'CLOSED',
          currentPrice: 90,
          pnl: -100,
          closedAt: new Date()
        })
        mockPrisma.virtualWallet.update.mockResolvedValueOnce({
          ...mockPosition.wallet,
          balance: 900
        })

        return callback(mockPrisma)
      })

      const result = await walletService.closePosition({
        positionId: 'position-1',
        exitPrice: 90
      })

      expect(result.balance).toBe(900)
      expect(mockPrisma.position.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          status: 'CLOSED',
          currentPrice: 90,
          pnl: -100,
          closedAt: expect.any(Date)
        }
      })
      expect(mockPrisma.virtualWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: {
          balance: { increment: 900 }
        }
      })
    })

    it('should throw error if position not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.position.findUnique.mockResolvedValueOnce(null)
        return callback(mockPrisma)
      })

      await expect(walletService.closePosition({
        positionId: 'non-existent',
        exitPrice: 110
      })).rejects.toThrow('Position not found or already closed')
    })

    it('should throw error if position already closed', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.position.findUnique.mockResolvedValueOnce({
          id: 'position-1',
          pair: 'SOL/USD',
          side: 'LONG',
          size: 10,
          entryPrice: 100,
          currentPrice: 110,
          pnl: 100,
          status: 'CLOSED',
          walletId: 'wallet-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          closedAt: new Date()
        })
        return callback(mockPrisma)
      })

      await expect(walletService.closePosition({
        positionId: 'position-1',
        exitPrice: 110
      })).rejects.toThrow('Position not found or already closed')
    })
  })

  describe('updatePositionPrice', () => {
    it('should update position price and PnL for long position', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'LONG',
        size: 10,
        entryPrice: 100,
        currentPrice: 100,
        pnl: 0,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null
      }

      mockPrisma.position.findUnique.mockResolvedValue(mockPosition)
      mockPrisma.position.update.mockResolvedValue({
        ...mockPosition,
        currentPrice: 110,
        pnl: 100
      })

      const result = await walletService.updatePositionPrice('position-1', 110)

      expect(result.currentPrice).toBe(110)
      expect(result.pnl).toBe(100)
      expect(mockPrisma.position.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          currentPrice: 110,
          pnl: 100
        }
      })
    })

    it('should update position price and PnL for short position', async () => {
      const mockPosition = {
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'SHORT',
        size: 10,
        entryPrice: 100,
        currentPrice: 100,
        pnl: 0,
        status: 'OPEN',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null
      }

      mockPrisma.position.findUnique.mockResolvedValue(mockPosition)
      mockPrisma.position.update.mockResolvedValue({
        ...mockPosition,
        currentPrice: 90,
        pnl: 100
      })

      const result = await walletService.updatePositionPrice('position-1', 90)

      expect(result.currentPrice).toBe(90)
      expect(result.pnl).toBe(100)
      expect(mockPrisma.position.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          currentPrice: 90,
          pnl: 100
        }
      })
    })

    it('should throw error if position not found', async () => {
      mockPrisma.position.findUnique.mockResolvedValue(null)

      await expect(walletService.updatePositionPrice('non-existent', 110))
        .rejects.toThrow('Position not found or closed')
    })

    it('should throw error if position is closed', async () => {
      mockPrisma.position.findUnique.mockResolvedValue({
        id: 'position-1',
        pair: 'SOL/USD',
        side: 'LONG',
        size: 10,
        entryPrice: 100,
        currentPrice: 100,
        pnl: 0,
        status: 'CLOSED',
        walletId: 'wallet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: new Date()
      })

      await expect(walletService.updatePositionPrice('position-1', 110))
        .rejects.toThrow('Position not found or closed')
    })
  })
}) 