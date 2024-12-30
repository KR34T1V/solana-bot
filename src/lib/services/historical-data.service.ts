import { PrismaClient } from '@prisma/client';
import type { TimeFrame } from '$lib/types';
import { logger } from '$lib/server/logger';

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

    private validatePriceData(data: HistoricalPriceInput) {
        if (data.open < 0 || data.high < 0 || data.low < 0 || data.close < 0) {
            logger.error('Invalid price data:', { data });
            throw new Error('Invalid price data');
        }

        if (data.high < data.low || data.high < data.open || data.high < data.close) {
            logger.error('Invalid OHLC data:', { data });
            throw new Error('Invalid OHLC data');
        }

        if (data.volume < 0) {
            logger.error('Invalid volume data:', { data });
            throw new Error('Invalid volume data');
        }
    }

    /**
     * Upserts historical price data
     */
    async upsertPrice(data: HistoricalPriceInput) {
        try {
            this.validatePriceData(data);
            return await this.prisma.historicalPrice.upsert({
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
        } catch (error) {
            if (error instanceof Error) {
                logger.error('Failed to upsert price:', { error, data });
                throw error;
            }
            logger.error('Unknown error upserting price:', { error, data });
            throw new Error('Failed to upsert price data');
        }
    }

    /**
     * Batch upsert historical price data
     */
    async batchUpsertPrices(data: HistoricalPriceInput[]) {
        if (!data.length) {
            return [];
        }

        try {
            data.forEach(this.validatePriceData);
            return await this.prisma.$transaction(
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
        } catch (error) {
            logger.error('Failed to batch upsert prices:', { error, count: data.length });
            throw new Error('Failed to batch upsert prices');
        }
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
        if (!params.pair || !params.timeframe) {
            logger.error('Invalid parameters for getPrices:', { params });
            throw new Error('Invalid parameters');
        }

        if (params.startTime > params.endTime) {
            logger.error('Invalid time range for getPrices:', { params });
            throw new Error('Invalid time range');
        }

        try {
            return await this.prisma.historicalPrice.findMany({
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
        } catch (error) {
            logger.error('Failed to fetch historical prices:', { error, params });
            throw new Error('Failed to fetch historical prices');
        }
    }

    /**
     * Get the latest price for a trading pair
     */
    async getLatestPrice(pair: string, timeframe: TimeFrame) {
        try {
            return await this.prisma.historicalPrice.findFirst({
                where: {
                    pair,
                    timeframe
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
        } catch (error) {
            logger.error('Failed to fetch latest price:', { error, pair, timeframe });
            return null;
        }
    }

    /**
     * Delete historical prices older than the specified date
     */
    async cleanupOldData(olderThan: Date) {
        if (olderThan > new Date()) {
            logger.error('Cannot cleanup future data:', { olderThan });
            throw new Error('Cannot cleanup future data');
        }

        try {
            return await this.prisma.historicalPrice.deleteMany({
                where: {
                    timestamp: {
                        lt: olderThan
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to cleanup historical data:', { error, olderThan });
            throw new Error('Failed to cleanup historical data');
        }
    }
} 