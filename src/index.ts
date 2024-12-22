import { CONFIG } from './config/config';
import { TradingBot } from './bot/trading-bot';
import { WalletService } from './services/wallet';
import { MockWalletService } from './services/mock-wallet';
import { MarketService } from './services/market';
import { SpreadTradingStrategy } from './bot/trading-strategy';
import { logger } from './utils/logger';

logger.info('Starting Solana trading bot', {
  mode: CONFIG.DRY_RUN ? 'Dry Run' : 'Live Trading',
  cluster: CONFIG.CLUSTER,
  strategy: 'SpreadTrading'
});

// Initialize services
const walletService = CONFIG.DRY_RUN 
  ? new MockWalletService(CONFIG.DRY_RUN_INITIAL_SOL)
  : new WalletService();

const marketService = new MarketService();
const strategy = new SpreadTradingStrategy();

logger.info('Services initialized', {
  wallet: CONFIG.DRY_RUN ? 'MockWallet' : 'LiveWallet',
  market: CONFIG.MARKET_ADDRESS,
  initialBalance: `${CONFIG.DRY_RUN ? CONFIG.DRY_RUN_INITIAL_SOL : 'Live'} SOL`
});

// Create bot instance
const bot = new TradingBot(
  walletService,
  marketService,
  strategy
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, initiating graceful shutdown...');
  bot.stop();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, initiating graceful shutdown...');
  bot.stop();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  bot.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { 
    promise: promise.toString(),
    reason: reason instanceof Error ? reason.message : reason
  });
  bot.stop();
  process.exit(1);
});

bot.initialize().catch(error => {
  logger.error('Fatal error during bot initialization', { error });
  process.exit(1);
});
