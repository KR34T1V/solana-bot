import { logger } from '$lib/server/logger';
import { JupiterService } from './jupiter.service';

export class TradingService {
    private jupiterService: JupiterService;

    constructor() {
        this.jupiterService = new JupiterService();
    }

    /**
     * Get current token price
     * @param tokenAddress Token address
     * @returns Current price data
     */
    async getTokenPrice(tokenAddress: string) {
        try {
            return await this.jupiterService.getTokenPrice(tokenAddress);
        } catch (error) {
            logger.error('Failed to get token price:', { error, tokenAddress });
            throw error instanceof Error ? error : new Error('Failed to get token price');
        }
    }
} 