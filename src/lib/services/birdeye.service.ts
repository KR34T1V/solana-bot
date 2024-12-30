import type { TimeFrame } from '$lib/types';
import type {
    BirdeyeOHLCVResponse,
    BirdeyePairResponse,
    BirdeyePriceResponse
} from '$lib/types/birdeye.types';
import { HistoricalDataService } from './historical-data.service';
import { ApiKeyService } from './api-key.service';
import { logger } from '$lib/server/logger';
import type { PrismaClient } from '@prisma/client';

const BIRDEYE_API_URL = 'https://public-api.birdeye.so';
const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
type ValidTimeFrame = typeof VALID_TIMEFRAMES[number];

export class BirdeyeService {
    private historicalDataService: HistoricalDataService;
    private apiKeyService: ApiKeyService;
    private priceCache: Map<string, { data: BirdeyePriceResponse; timestamp: number }>;
    private readonly CACHE_TTL = 5000; // 5 seconds

    constructor(prisma: PrismaClient) {
        this.historicalDataService = new HistoricalDataService(prisma);
        this.apiKeyService = new ApiKeyService(prisma);
        this.priceCache = new Map();
    }

    private validateAddress(address: string) {
        if (!address || address.length < 32 || address.length > 44) {
            logger.error('Invalid Solana address:', { address });
            throw new Error('Invalid Solana address');
        }
    }

    private validateApiKey(apiKey: string) {
        if (!apiKey || apiKey.length < 10) {
            logger.error('Invalid API key:', { apiKey: apiKey ? '***' : undefined });
            throw new Error('Invalid API key format');
        }
    }

    /**
     * Verify API key
     */
    async verifyApiKey(apiKey: string): Promise<boolean> {
        try {
            this.validateApiKey(apiKey);
            const solAddress = 'So11111111111111111111111111111111111111112';
            const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${solAddress}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                logger.error('API key verification failed:', { status: response.status, statusText: response.statusText });
                return false;
            }

            return true;
        } catch (error) {
            logger.error('API verification failed:', { error });
            return false;
        }
    }

    /**
     * Get token price with caching
     */
    async getTokenPrice(address: string, apiKey: string): Promise<BirdeyePriceResponse> {
        try {
            this.validateAddress(address);
            this.validateApiKey(apiKey);

            // Check cache
            const cached = this.priceCache.get(address);
            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
                logger.info('Cache hit for token price:', { address });
                return cached.data;
            }

            logger.info('Cache miss for token price:', { address });
            const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${address}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                logger.error('Failed to fetch price:', { 
                    address, 
                    status: response.status, 
                    statusText: response.statusText 
                });
                throw new Error(`Failed to fetch price: ${response.statusText}`);
            }

            const data = await response.json();
            this.priceCache.set(address, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            logger.error('Error fetching token price:', { error, address });
            throw error instanceof Error ? error : new Error('Failed to fetch token price');
        }
    }

    /**
     * Get OHLCV data
     */
    async getOHLCVData(address: string, timeframe: ValidTimeFrame, apiKey: string): Promise<BirdeyeOHLCVResponse> {
        try {
            this.validateAddress(address);
            this.validateApiKey(apiKey);

            if (!VALID_TIMEFRAMES.includes(timeframe)) {
                logger.error('Invalid timeframe:', { timeframe, validTimeframes: VALID_TIMEFRAMES });
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
                logger.error('Failed to fetch OHLCV data:', {
                    address,
                    timeframe,
                    status: response.status,
                    statusText: response.statusText
                });
                throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            logger.error('Error fetching OHLCV data:', { error, address, timeframe });
            throw error instanceof Error ? error : new Error('Failed to fetch OHLCV data');
        }
    }
} 