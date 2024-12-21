import { CONFIG } from './config/config';
import { TradingBot } from './bot/trading-bot';
import { BacktestWalletService } from './services/backtest-wallet';
import { BacktestMarketService } from './services/backtest-market';
import { SpreadTradingStrategy } from './bot/trading-strategy';
import { logger } from './utils/logger';

async function runBacktest() {
  try {
    // Initialize services
    const marketService = await BacktestMarketService.fromCSV('historical_data.csv');
    const walletService = new BacktestWalletService(CONFIG.DRY_RUN_INITIAL_SOL);
    const strategy = new SpreadTradingStrategy();

    // Create bot instance
    const bot = new TradingBot(
      walletService,
      marketService,
      strategy
    );

    // Start backtesting
    logger.info('Starting backtest...');
    await bot.initialize();

  } catch (error) {
    logger.error('Backtest failed:', error);
    process.exit(1);
  }
}

// Run backtest
runBacktest(); 