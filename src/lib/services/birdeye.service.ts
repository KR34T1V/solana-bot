import type { TimeFrame } from '$lib/types';
import type {
    BirdeyeOHLCVResponse,
    BirdeyePairResponse,
    BirdeyePriceResponse
} from '$lib/types/birdeye.types';
import { HistoricalDataService } from './historical-data.service';
import { ApiKeyService } from './api-key.service';

const BIRDEYE_API_URL = 'https://public-api.birdeye.so';
const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
type ValidTimeFrame = typeof VALID_TIMEFRAMES[number];

export class BirdeyeService {
    private historicalDataService: HistoricalDataService;
    private apiKeyService: ApiKeyService;
    private priceCache: Map<string, { data: BirdeyePriceResponse; timestamp: number }>;
    private readonly CACHE_TTL = 5000; // 5 seconds

    constructor() {
        this.historicalDataService = new HistoricalDataService();
        this.apiKeyService = new ApiKeyService();
        this.priceCache = new Map();
    }

    /**
     * Verify API key
     */
    async verifyApiKey(apiKey: string): Promise<boolean> {
        try {
            const solAddress = 'So11111111111111111111111111111111111111112';
            const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${solAddress}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('API verification failed:', error);
            return false;
        }
    }

    /**
     * Get token price with caching
     */
    async getTokenPrice(address: string, apiKey: string): Promise<BirdeyePriceResponse> {
        // Check cache
        const cached = this.priceCache.get(address);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${address}`, {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch price: ${response.statusText}`);
        }

        const data = await response.json();
        this.priceCache.set(address, { data, timestamp: Date.now() });
        return data;
    }

    /**
     * Get OHLCV data
     */
    async getOHLCVData(address: string, timeframe: ValidTimeFrame, apiKey: string): Promise<BirdeyeOHLCVResponse> {
        if (!VALID_TIMEFRAMES.includes(timeframe)) {
            throw new Error('Invalid timeframe');
        }

        const response = await fetch(
            `${BIRDEYE_API_URL}/defi/ohlcv?address=${address}&timeframe=${timeframe}`,
            {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
        }

        return response.json();
    }
} 