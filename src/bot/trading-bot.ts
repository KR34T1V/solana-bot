import { CONFIG } from '../config/config';
import { WalletService } from '../services/wallet';
import { MockWalletService } from '../services/mock-wallet';
import { MarketService } from '../services/market';
import { logger } from '../utils/logger';
import { TradingStrategy } from './trading-strategy';

export interface WalletServiceInterface {
  getBalance(): Promise<number>;
  executeTrade?(type: 'buy' | 'sell', amountSOL: number, price: number): Promise<boolean>;
  getPnL?(): { totalPnL: number; percentagePnL: number };
  getTradeHistory?(): Array<{ type: 'buy' | 'sell'; amount: number; price: number; timestamp: Date }>;
}

export interface MarketServiceInterface {
  initialize(marketAddress: string): Promise<void>;
  getOrderBook(): Promise<any>;
  getBestOrders(): Promise<{ bestBid: { price: number; size: number; } | null; bestAsk: { price: number; size: number; } | null; }>;
}

export class TradingBot {
  private isRunning: boolean;

  constructor(
    private readonly walletService: WalletServiceInterface,
    private readonly marketService: MarketServiceInterface,
    private readonly strategy: TradingStrategy
  ) {
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Check wallet balance
      const balance = await this.walletService.getBalance();
      logger.info(`Wallet balance: ${balance / 1e9} SOL`);

      if (balance / 1e9 < CONFIG.MIN_SOL_BALANCE) {
        throw new Error(`Insufficient balance. Minimum required: ${CONFIG.MIN_SOL_BALANCE} SOL`);
      }

      // Initialize market
      await this.marketService.initialize(CONFIG.MARKET_ADDRESS);
      logger.info('Market initialized successfully');
      
      if (CONFIG.DRY_RUN) {
        logger.info('Running in DRY RUN mode - using mock wallet with simulated trades');
      }

      // Start trading loop
      await this.startTradingLoop();
    } catch (error) {
      logger.error('Failed to initialize trading bot:', error);
      throw error;
    }
  }

  private async startTradingLoop() {
    logger.info('Starting trading loop');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Get current market state
        const { bestBid, bestAsk } = await this.marketService.getBestOrders();
        
        // Analyze market and get trading decision
        const decision = this.strategy.analyze({ bestBid, bestAsk });

        if (decision.shouldBuy || decision.shouldSell) {
          const executeTrade = this.walletService.executeTrade;
          if (CONFIG.DRY_RUN && executeTrade) {
            if (decision.shouldBuy && decision.buyPrice && decision.tradeSize) {
              await executeTrade('buy', decision.tradeSize, decision.buyPrice);
            }
            if (decision.shouldSell && decision.sellPrice && decision.tradeSize) {
              await executeTrade('sell', decision.tradeSize, decision.sellPrice);
            }

            // Log PnL information if available
            const getPnL = this.walletService.getPnL;
            if (getPnL) {
              const { totalPnL, percentagePnL } = getPnL();
              logger.info(`[DRY RUN] Current PnL: ${totalPnL.toFixed(4)} SOL (${percentagePnL.toFixed(2)}%)`);
            }
          } else {
            // TODO: Implement actual order placement
            logger.info('Order placement not implemented yet');
          }
        } else {
          logger.debug('No trading opportunity found');
        }

        // Add delay to prevent too frequent requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Error in trading loop:', error);
        // Add delay before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  public stop() {
    this.isRunning = false;
    logger.info('Stopping trading bot...');

    const getPnL = this.walletService.getPnL;
    const getTradeHistory = this.walletService.getTradeHistory;
    
    if (CONFIG.DRY_RUN && getPnL && getTradeHistory) {
      const { totalPnL, percentagePnL } = getPnL();
      logger.info(`[DRY RUN] Final PnL: ${totalPnL.toFixed(4)} SOL (${percentagePnL.toFixed(2)}%)`);
      logger.info(`[DRY RUN] Trade History:`, getTradeHistory());
    }
  }
} 