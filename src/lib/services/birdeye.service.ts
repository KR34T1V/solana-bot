import type { TimeFrame } from '$lib/types';
import type {
    BirdeyeOHLCVResponse,
    BirdeyePairResponse,
    BirdeyePriceResponse
} from '$lib/types/birdeye.types';
import { HistoricalDataService } from './historical-data.service';
import { ApiKeyService } from './api-key.service';

const BIRDEYE_API_URL = 'https://public-api.birdeye.so';

export class BirdeyeService {
    private historicalDataService: HistoricalDataService;
    private apiKeyService: ApiKeyService;

    constructor() {
        this.historicalDataService = new HistoricalDataService();
        this.apiKeyService = new ApiKeyService();
    }

    /**
     * Verify API key
     */
    async verifyApiKey(apiKey: string): Promise<boolean> {
        try {
            // Use SOL token address for verification
            const solAddress = 'So11111111111111111111111111111111111111112';
            const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${solAddress}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            // Log the full response for debugging
            const text = await response.text();
            console.log('API Response:', {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: text,
                endpoint: '/defi/price'
            });

            if (!response.ok) {
                console.error('API verification failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: text
                });
                return false;
            }

            try {
                const data = JSON.parse(text);
                // Check if we got a valid response with price data
                return data.success === true && !!data.data;
            } catch (e) {
                console.error('Failed to parse response:', e);
                return false;
            }
        } catch (error) {
            console.error('API verification error:', error);
            return false;
        }
    }

    private async fetchFromBirdeye<T>(userId: string, endpoint: string, params: Record<string, string> = {}): Promise<T> {
        const apiKey = await this.apiKeyService.getDecryptedKey(userId, 'birdeye');
        if (!apiKey) {
            throw new Error('Birdeye API key not found. Please add your API key in settings.');
        }

        const url = new URL(`${BIRDEYE_API_URL}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        console.log('Fetching from Birdeye:', {
            url: url.toString(),
            hasApiKey: !!apiKey
        });

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Birdeye API error:', {
                status: response.status,
                statusText: response.statusText,
                endpoint,
                response: text
            });
            throw new Error(`Birdeye API error: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error('Birdeye API returned unsuccessful response');
        }

        return data;
    }

    /**
     * Get current token price
     */
    async getTokenPrice(userId: string, address: string): Promise<number> {
        const response = await this.fetchFromBirdeye<BirdeyePriceResponse>(
            userId,
            `/defi/price`,
            { address }
        );

        if (!response.success || !response.data) {
            throw new Error('Failed to fetch token price');
        }

        return response.data.value;
    }

    /**
     * Get pair information
     */
    async getPairInfo(userId: string, address: string): Promise<BirdeyePairResponse['data']> {
        const response = await this.fetchFromBirdeye<BirdeyePairResponse>(
            userId,
            `/defi/pair_info`,
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
    async fetchAndStoreOHLCV(userId: string, params: {
        address: string;
        timeframe: TimeFrame;
        limit?: number;
        startTime?: number;
        endTime?: number;
    }) {
        const response = await this.fetchFromBirdeye<BirdeyeOHLCVResponse>(
            userId,
            `/defi/ohlcv`,
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
    async getLatestTrades(userId: string, address: string, limit: number = 100) {
        return this.fetchFromBirdeye(
            userId,
            `/defi/trades`,
            { address, limit: limit.toString() }
        );
    }

    /**
     * Initialize historical data for a pair
     */
    async initializeHistoricalData(userId: string, params: {
        address: string;
        timeframes: TimeFrame[];
        days: number;
    }) {
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (params.days * 24 * 60 * 60);

        const promises = params.timeframes.map(timeframe =>
            this.fetchAndStoreOHLCV(userId, {
                address: params.address,
                timeframe,
                startTime,
                endTime
            })
        );

        return Promise.all(promises);
    }
} 