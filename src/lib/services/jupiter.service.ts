import { logger } from '$lib/server/logger';
import type { TokenInfo } from '$lib/types/token.types';

const JUPITER_API_URL = 'https://token.jup.ag/strict';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export interface PriceData {
    price: number;
    timestamp: number;
}

export interface OHLCVData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class JupiterService {
    private tokenListCache: TokenInfo[] | null = null;
    private lastCacheUpdate: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get all tokens from Jupiter
     */
    private async getAllTokens(): Promise<TokenInfo[]> {
        try {
            if (this.tokenListCache && (Date.now() - this.lastCacheUpdate < this.CACHE_TTL)) {
                return this.tokenListCache;
            }

            const response = await fetch(JUPITER_API_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch tokens: ${response.statusText}`);
            }

            const tokens = await response.json();
            this.tokenListCache = tokens;
            this.lastCacheUpdate = Date.now();
            
            return tokens;
        } catch (error) {
            logger.error('Failed to fetch Jupiter tokens:', { error });
            throw error instanceof Error ? error : new Error('Failed to fetch tokens');
        }
    }

    /**
     * Search for tokens by query
     * @param query Search query (name, symbol, or address)
     * @returns Array of matching tokens
     */
    async searchTokens(query: string): Promise<TokenInfo[]> {
        try {
            const tokens = await this.getAllTokens();
            const searchLower = query.toLowerCase();

            return tokens.filter(token => 
                token.address.toLowerCase() === searchLower ||
                token.symbol.toLowerCase().includes(searchLower) ||
                token.name.toLowerCase().includes(searchLower)
            );
        } catch (error) {
            logger.error('Token search failed:', { error, query });
            throw error instanceof Error ? error : new Error('Failed to search tokens');
        }
    }

    /**
     * Get token price
     * @param address Token address
     * @returns Current price data
     */
    async getTokenPrice(address: string): Promise<PriceData> {
        try {
            const tokens = await this.getAllTokens();
            const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
            
            if (!token) {
                throw new Error('Token not found');
            }

            // Use CoinGecko for price data since Jupiter doesn't provide it directly
            const response = await fetch(
                `${COINGECKO_API_URL}/simple/price?ids=${token.extensions?.coingeckoId}&vs_currencies=usd&include_last_updated_at=true`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch price: ${response.statusText}`);
            }

            const data = await response.json();
            const coinData = data[token.extensions?.coingeckoId];
            
            if (!coinData) {
                throw new Error('Price data not available');
            }

            return {
                price: coinData.usd,
                timestamp: coinData.last_updated_at * 1000
            };
        } catch (error) {
            logger.error('Failed to fetch token price:', { error, address });
            throw error instanceof Error ? error : new Error('Failed to fetch token price');
        }
    }

    /**
     * Get historical OHLCV data
     * @param address Token address
     * @param days Number of days of data to fetch
     * @returns Array of OHLCV data points
     */
    async getOHLCVData(address: string, days: number = 1): Promise<OHLCVData[]> {
        try {
            const tokens = await this.getAllTokens();
            const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
            
            if (!token) {
                throw new Error('Token not found');
            }

            // Use CoinGecko for OHLCV data
            const response = await fetch(
                `${COINGECKO_API_URL}/coins/${token.extensions?.coingeckoId}/ohlc?vs_currency=usd&days=${days}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch OHLCV data: ${response.statusText}`);
            }

            const data = await response.json();
            
            return data.map((item: number[]) => ({
                timestamp: item[0],
                open: item[1],
                high: item[2],
                low: item[3],
                close: item[4],
                volume: 0 // CoinGecko doesn't provide volume in this endpoint
            }));
        } catch (error) {
            logger.error('Failed to fetch OHLCV data:', { error, address });
            throw error instanceof Error ? error : new Error('Failed to fetch OHLCV data');
        }
    }
} 