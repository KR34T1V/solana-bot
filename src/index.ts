import { CONFIG } from './config/config';
import { TradingBot } from './bot/trading-bot';
import { WalletService } from './services/wallet';
import { MockWalletService } from './services/mock-wallet';
import { MarketService } from './services/market';
import { SpreadTradingStrategy } from './bot/trading-strategy';

// Initialize services
const walletService = CONFIG.DRY_RUN 
  ? new MockWalletService(CONFIG.DRY_RUN_INITIAL_SOL)
  : new WalletService();

const marketService = new MarketService();
const strategy = new SpreadTradingStrategy();

// Create bot instance
const bot = new TradingBot(
  walletService,
  marketService,
  strategy
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  bot.stop();
});

process.on('SIGTERM', () => {
  bot.stop();
});

bot.initialize().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
