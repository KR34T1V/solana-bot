import { PrismaClient, Prisma } from '@prisma/client';
import type { TimeFrame } from '$lib/types';

type HistoricalPriceInput = {
    pair: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    source: string;
    timeframe: string;
};

export class HistoricalDataService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Upserts historical price data
     */
    async upsertPrice(data: HistoricalPriceInput) {
        return this.prisma.historicalPrice.upsert({
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
    async batchUpsertPrices(data: HistoricalPriceInput[]) {
        return this.prisma.$transaction(
            data.map((price) =>
                this.prisma.historicalPrice.upsert({
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
        return this.prisma.historicalPrice.findMany({
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
        return this.prisma.historicalPrice.findFirst({
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
        return this.prisma.historicalPrice.deleteMany({
            where: {
                timestamp: {
                    lt: olderThan
                }
            }
        });
    }
} 