import { PrismaClient, type HistoricalPrice } from '@prisma/client';
import type { TimeFrame } from '$lib/types';

const prisma = new PrismaClient();

export class HistoricalDataService {
    /**
     * Upserts historical price data
     */
    async upsertPrice(data: Omit<HistoricalPrice, 'id' | 'createdAt'>) {
        return prisma.historicalPrice.upsert({
            where: {
                pair_timestamp_timeframe: {
                    pair: data.pair,
                    timestamp: data.timestamp,
                    timeframe: data.timeframe
                }
            },
            create: data,
            update: data
        });
    }

    /**
     * Batch upsert historical price data
     */
    async batchUpsertPrices(data: Omit<HistoricalPrice, 'id' | 'createdAt'>[]) {
        return prisma.$transaction(
            data.map((price) =>
                prisma.historicalPrice.upsert({
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
            )
        );
    }

    /**
     * Get historical prices for a trading pair within a time range
     */
    async getPrices(params: {
        pair: string;
        timeframe: TimeFrame;
        startTime: Date;
        endTime: Date;
    }) {
        return prisma.historicalPrice.findMany({
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
        });
    }

    /**
     * Get the latest price for a trading pair
     */
    async getLatestPrice(pair: string, timeframe: TimeFrame) {
        return prisma.historicalPrice.findFirst({
            where: {
                pair,
                timeframe
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
    }

    /**
     * Delete historical prices older than the specified date
     */
    async cleanupOldData(olderThan: Date) {
        return prisma.historicalPrice.deleteMany({
            where: {
                timestamp: {
                    lt: olderThan
                }
            }
        });
    }
} 