import { logger } from '$lib/server/logger';
import type { TokenInfo } from '$lib/types/token.types';

const JUPITER_API_URL = 'https://token.jup.ag/strict';

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
} 