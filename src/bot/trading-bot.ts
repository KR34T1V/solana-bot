import { CONFIG } from '../config/config';
import { WalletService } from '../services/wallet';
import { MarketService } from '../services/market';
import { logger } from '../utils/logger';
import { SpreadTradingStrategy, TradingStrategy } from './trading-strategy';

export class TradingBot {
  private walletService: WalletService;
  private marketService: MarketService;
  private strategy: TradingStrategy;
  private isRunning: boolean;

  constructor() {
    this.walletService = new WalletService();
    this.marketService = new MarketService();
    this.strategy = new SpreadTradingStrategy();
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
        logger.info('Running in DRY RUN mode - no real trades will be executed');
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
          if (!CONFIG.DRY_RUN) {
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
  }
} 