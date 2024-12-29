import type { PrismaClient } from '@prisma/client';
import type { TimeFrame } from '$lib/types';
import { BirdeyeService } from './birdeye.service';
import { WalletService } from './wallet.service';
import { TradingBotService } from './trading-bot.service';
import { ApiKeyService } from './api-key.service';

interface StrategyContext {
    pair: string;
    timeframe: TimeFrame;
    currentPrice: number;
    historicalPrices: {
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];
    positions: {
        id: string;
        side: 'LONG' | 'SHORT';
        size: number;
        entryPrice: number;
        currentPrice: number | null;
        pnl: number | null;
    }[];
    balance: number;
    walletId: string;
}

export class StrategyService {
    private birdeyeService: BirdeyeService;
    private walletService: WalletService;
    private tradingBotService: TradingBotService;
    private apiKeyService: ApiKeyService;

    constructor(prisma: PrismaClient) {
        this.birdeyeService = new BirdeyeService();
        this.walletService = new WalletService();
        this.tradingBotService = new TradingBotService();
        this.apiKeyService = new ApiKeyService(prisma);
    }

    /**
     * Execute a strategy for a bot
     */
    async executeStrategy(botId: string) {
        const bot = await this.tradingBotService.getBotById(botId);
        if (!bot || !bot.wallet) {
            throw new Error('Bot or wallet not found');
        }

        const config = JSON.parse(bot.config);
        const context = await this.buildStrategyContext(bot.wallet.id, config);
        
        // Execute the strategy based on the type
        switch (config.type) {
            case 'MEAN_REVERSION':
                await this.executeMeanReversionStrategy(context, config);
                break;
            case 'TREND_FOLLOWING':
                await this.executeTrendFollowingStrategy(context, config);
                break;
            default:
                throw new Error(`Unknown strategy type: ${config.type}`);
        }
    }

    /**
     * Build strategy context with required data
     */
    private async buildStrategyContext(walletId: string, config: any): Promise<StrategyContext> {
        const wallet = await this.walletService.getWalletByBotId(config.pair);
        if (!wallet) {
            throw new Error('Wallet not found');
        }

        const activeKey = await this.apiKeyService.getActiveKey(wallet.userId, 'birdeye');
        if (!activeKey) {
            throw new Error('No active Birdeye API key found');
        }

        const decryptedKey = await this.apiKeyService.getDecryptedKey(wallet.userId, 'birdeye');
        if (!decryptedKey) {
            throw new Error('Failed to decrypt Birdeye API key');
        }

        const currentPrice = await this.birdeyeService.getTokenPrice(config.pair, decryptedKey);
        const ohlcvResponse = await this.birdeyeService.getOHLCVData(
            config.pair,
            config.timeframe,
            decryptedKey
        );

        // Transform OHLCV data to match context format
        const historicalPrices = ohlcvResponse.data.items.map(item => ({
            timestamp: new Date(item.unixTime * 1000),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
        }));

        // Transform positions to match context format
        const positions = (wallet.positions || []).map(p => ({
            id: p.id,
            side: p.side as 'LONG' | 'SHORT',
            size: p.size,
            entryPrice: p.entryPrice,
            currentPrice: p.currentPrice,
            pnl: p.pnl
        }));

        return {
            pair: config.pair,
            timeframe: config.timeframe,
            currentPrice: currentPrice.data.value,
            historicalPrices,
            positions,
            balance: wallet.balance,
            walletId: wallet.id
        };
    }

    /**
     * Execute mean reversion strategy
     */
    private async executeMeanReversionStrategy(context: StrategyContext, config: any) {
        const { lookbackPeriods = 20, deviationThreshold = 2 } = config;
        
        // Calculate moving average
        const prices = context.historicalPrices.slice(-lookbackPeriods);
        const ma = prices.reduce((sum, p) => sum + p.close, 0) / prices.length;
        
        // Calculate standard deviation
        const variance = prices.reduce((sum, p) => sum + Math.pow(p.close - ma, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate z-score
        const zScore = (context.currentPrice - ma) / stdDev;
        
        // Trading logic
        if (Math.abs(zScore) > deviationThreshold) {
            if (zScore > deviationThreshold) {
                // Price is too high, consider shorting
                await this.openPosition(context, 'SHORT', config);
            } else {
                // Price is too low, consider longing
                await this.openPosition(context, 'LONG', config);
            }
        }
        
        // Check for position exits
        for (const position of context.positions) {
            if (Math.abs(zScore) < 0.5) {
                await this.closePositions([position], position.side, context.currentPrice);
            }
        }
    }

    /**
     * Execute trend following strategy
     */
    private async executeTrendFollowingStrategy(context: StrategyContext, config: any) {
        const { shortPeriod = 9, longPeriod = 21 } = config;
        
        // Calculate EMAs
        const shortEMA = this.calculateEMA(context.historicalPrices.map(p => p.close), shortPeriod);
        const longEMA = this.calculateEMA(context.historicalPrices.map(p => p.close), longPeriod);
        
        // Trading logic
        if (shortEMA > longEMA) {
            // Uptrend
            if (!this.hasOpenPosition(context.positions, 'LONG')) {
                await this.closePositions(context.positions, 'SHORT', context.currentPrice);
                await this.openPosition(context, 'LONG', config);
            }
        } else {
            // Downtrend
            if (!this.hasOpenPosition(context.positions, 'SHORT')) {
                await this.closePositions(context.positions, 'LONG', context.currentPrice);
                await this.openPosition(context, 'SHORT', config);
            }
        }
    }

    /**
     * Calculate Exponential Moving Average
     */
    private calculateEMA(prices: number[], period: number): number {
        const k = 2 / (period + 1);
        return prices.reduce((ema, price, i) => {
            if (i === 0) return price;
            return price * k + ema * (1 - k);
        }, prices[0]);
    }

    /**
     * Helper to check for open positions
     */
    private hasOpenPosition(positions: StrategyContext['positions'], side: 'LONG' | 'SHORT'): boolean {
        return positions.some(p => p.side === side);
    }

    /**
     * Helper to open a position
     */
    private async openPosition(context: StrategyContext, side: 'LONG' | 'SHORT', config: any) {
        const size = this.calculatePositionSize(context.balance, context.currentPrice, config);
        await this.walletService.openPosition({
            walletId: context.walletId,
            pair: context.pair,
            side,
            size,
            entryPrice: context.currentPrice
        });
    }

    /**
     * Helper to close positions
     */
    private async closePositions(positions: StrategyContext['positions'], side: 'LONG' | 'SHORT', currentPrice: number) {
        const promises = positions
            .filter(p => p.side === side)
            .map(p => this.walletService.closePosition({
                positionId: p.id,
                exitPrice: currentPrice
            }));
        
        await Promise.all(promises);
    }

    /**
     * Calculate position size based on available balance and risk parameters
     */
    private calculatePositionSize(balance: number, currentPrice: number, config: any): number {
        const { riskPerTrade = 0.02 } = config; // Default to 2% risk per trade
        return (balance * riskPerTrade) / currentPrice;
    }
} 