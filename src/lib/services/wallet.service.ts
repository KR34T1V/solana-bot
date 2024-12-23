import { PrismaClient } from '@prisma/client';
import type { PositionSide, PositionStatus, TransactionType } from '$lib/types';

const prisma = new PrismaClient();

export class WalletService {
    /**
     * Get wallet by bot ID
     */
    async getWalletByBotId(botId: string) {
        return prisma.virtualWallet.findUnique({
            where: { botId },
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
        });
    }

    /**
     * Add funds to wallet
     */
    async deposit(params: {
        walletId: string;
        amount: number;
        currency: string;
    }) {
        return prisma.$transaction(async (tx) => {
            const wallet = await tx.virtualWallet.update({
                where: { id: params.walletId },
                data: {
                    balance: { increment: params.amount },
                    totalDeposits: { increment: params.amount }
                }
            });

            await tx.transaction.create({
                data: {
                    type: 'DEPOSIT',
                    amount: params.amount,
                    currency: params.currency,
                    status: 'COMPLETED',
                    walletId: params.walletId
                }
            });

            return wallet;
        });
    }

    /**
     * Withdraw funds from wallet
     */
    async withdraw(params: {
        walletId: string;
        amount: number;
        currency: string;
    }) {
        return prisma.$transaction(async (tx) => {
            const wallet = await tx.virtualWallet.findUnique({
                where: { id: params.walletId }
            });

            if (!wallet || wallet.balance < params.amount) {
                throw new Error('Insufficient funds');
            }

            const updatedWallet = await tx.virtualWallet.update({
                where: { id: params.walletId },
                data: {
                    balance: { decrement: params.amount },
                    totalWithdraws: { increment: params.amount }
                }
            });

            await tx.transaction.create({
                data: {
                    type: 'WITHDRAW',
                    amount: params.amount,
                    currency: params.currency,
                    status: 'COMPLETED',
                    walletId: params.walletId
                }
            });

            return updatedWallet;
        });
    }

    /**
     * Open a new position
     */
    async openPosition(params: {
        walletId: string;
        pair: string;
        side: PositionSide;
        size: number;
        entryPrice: number;
    }) {
        return prisma.$transaction(async (tx) => {
            const wallet = await tx.virtualWallet.findUnique({
                where: { id: params.walletId }
            });

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            const requiredBalance = params.size * params.entryPrice;
            if (wallet.balance < requiredBalance) {
                throw new Error('Insufficient funds');
            }

            const position = await tx.position.create({
                data: {
                    pair: params.pair,
                    side: params.side,
                    size: params.size,
                    entryPrice: params.entryPrice,
                    status: 'OPEN',
                    walletId: params.walletId
                }
            });

            await tx.virtualWallet.update({
                where: { id: params.walletId },
                data: {
                    balance: { decrement: requiredBalance }
                }
            });

            return position;
        });
    }

    /**
     * Close a position
     */
    async closePosition(params: {
        positionId: string;
        exitPrice: number;
    }) {
        return prisma.$transaction(async (tx) => {
            const position = await tx.position.findUnique({
                where: { id: params.positionId },
                include: { wallet: true }
            });

            if (!position || position.status === 'CLOSED') {
                throw new Error('Position not found or already closed');
            }

            const pnl = position.side === 'LONG'
                ? (params.exitPrice - position.entryPrice) * position.size
                : (position.entryPrice - params.exitPrice) * position.size;

            const returnAmount = (position.size * position.entryPrice) + pnl;

            await tx.position.update({
                where: { id: params.positionId },
                data: {
                    status: 'CLOSED',
                    currentPrice: params.exitPrice,
                    pnl,
                    closedAt: new Date()
                }
            });

            return tx.virtualWallet.update({
                where: { id: position.walletId },
                data: {
                    balance: { increment: returnAmount }
                }
            });
        });
    }

    /**
     * Update position's current price and PnL
     */
    async updatePositionPrice(positionId: string, currentPrice: number) {
        const position = await prisma.position.findUnique({
            where: { id: positionId }
        });

        if (!position || position.status === 'CLOSED') {
            throw new Error('Position not found or closed');
        }

        const pnl = position.side === 'LONG'
            ? (currentPrice - position.entryPrice) * position.size
            : (position.entryPrice - currentPrice) * position.size;

        return prisma.position.update({
            where: { id: positionId },
            data: {
                currentPrice,
                pnl
            }
        });
    }
} 