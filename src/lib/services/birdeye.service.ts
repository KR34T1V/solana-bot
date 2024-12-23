import { env } from '$env/dynamic/private';
import type { TimeFrame } from '$lib/types';
import type {
    BirdeyeOHLCVResponse,
    BirdeyePairResponse,
    BirdeyePriceResponse
} from '$lib/types/birdeye.types';
import { HistoricalDataService } from './historical-data.service';

const BIRDEYE_API_URL = 'https://public-api.birdeye.so';

export class BirdeyeService {
    private apiKey: string;
    private historicalDataService: HistoricalDataService;

    constructor() {
        this.apiKey = env.BIRDEYE_API_KEY;
        this.historicalDataService = new HistoricalDataService();
    }

    private async fetchFromBirdeye<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
        const url = new URL(`${BIRDEYE_API_URL}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString(), {
            headers: {
                'X-API-KEY': this.apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Birdeye API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get current token price
     */
    async getTokenPrice(address: string): Promise<number> {
        const response = await this.fetchFromBirdeye<BirdeyePriceResponse>(
            `/public/price`,
            { address }
        );

        if (!response.success || !response.data[address]) {
            throw new Error('Failed to fetch token price');
        }

        return response.data[address].value;
    }

    /**
     * Get pair information
     */
    async getPairInfo(address: string): Promise<BirdeyePairResponse['data']> {
        const response = await this.fetchFromBirdeye<BirdeyePairResponse>(
            `/public/pair`,
            { address }
        );

        if (!response.success) {
            throw new Error('Failed to fetch pair info');
        }

        return response.data;
    }

    /**
     * Get historical OHLCV data and store it
     */
    async fetchAndStoreOHLCV(params: {
        address: string;
        timeframe: TimeFrame;
        limit?: number;
        startTime?: number;
        endTime?: number;
    }) {
        const response = await this.fetchFromBirdeye<BirdeyeOHLCVResponse>(
            `/public/candles`,
            {
                address: params.address,
                timeframe: params.timeframe,
                limit: params.limit?.toString() || '1000',
                ...(params.startTime && { startTime: params.startTime.toString() }),
                ...(params.endTime && { endTime: params.endTime.toString() })
            }
        );

        if (!response.success || !response.data.items.length) {
            throw new Error('Failed to fetch OHLCV data');
        }

        // Store the data
        await this.historicalDataService.batchUpsertPrices(
            response.data.items.map(item => ({
                pair: params.address,
                timestamp: new Date(item.unixTime * 1000),
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
                source: 'birdeye',
                timeframe: params.timeframe
            }))
        );

        return response.data.items;
    }

    /**
     * Get latest trades for a pair
     */
    async getLatestTrades(address: string, limit: number = 100) {
        return this.fetchFromBirdeye(
            `/public/trades`,
            { address, limit: limit.toString() }
        );
    }

    /**
     * Initialize historical data for a pair
     */
    async initializeHistoricalData(params: {
        address: string;
        timeframes: TimeFrame[];
        days: number;
    }) {
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (params.days * 24 * 60 * 60);

        const promises = params.timeframes.map(timeframe =>
            this.fetchAndStoreOHLCV({
                address: params.address,
                timeframe,
                startTime,
                endTime
            })
        );

        return Promise.all(promises);
    }
} 