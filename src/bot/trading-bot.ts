import { CONFIG } from '../config/config';
import { WalletService } from '../services/wallet';
import { MarketService } from '../services/market';
import { logger } from '../utils/logger';

export class TradingBot {
  private walletService: WalletService;
  private marketService: MarketService;
  private isRunning: boolean;

  constructor() {
    this.walletService = new WalletService();
    this.marketService = new MarketService();
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Check wallet balance
      const balance = await this.walletService.getBalance();
      logger.info(`Wallet balance: ${balance / 1e9} SOL`);

      // Initialize market
      await this.marketService.initialize(CONFIG.MARKET_ADDRESS);
      logger.info('Market initialized successfully');

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
        const orderBook = await this.marketService.getOrderBook();
        const { bestBid, bestAsk } = await this.marketService.getBestOrders();

        if (bestBid && bestAsk) {
          const spread = bestAsk.price - bestBid.price;
          const spreadPercentage = (spread / bestBid.price) * 100;

          logger.info(`Current spread: ${spreadPercentage.toFixed(2)}%`);

          // Implement your trading strategy here
          // For example: if spread > threshold, place orders
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