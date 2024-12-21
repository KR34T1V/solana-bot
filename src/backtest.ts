import { CONFIG } from './config/config';
import { TradingBot } from './bot/trading-bot';
import { BacktestWalletService } from './services/backtest-wallet';
import { BacktestMarketService } from './services/backtest-market';
import { SpreadTradingStrategy } from './bot/trading-strategy';
import { logger } from './utils/logger';

interface BacktestConfig {
  initialBalance: number;
  dataSource: {
    type: 'csv' | 'simulated';
    path?: string;
    simulation?: {
      basePrice: number;
      volatility: number;
      spreadPercentage: number;
      timeframeMinutes: number;
      interval: number;
      trendBias?: number;
    };
  };
}

const DEFAULT_CONFIG: BacktestConfig = {
  initialBalance: CONFIG.DRY_RUN_INITIAL_SOL,
  dataSource: {
    type: 'simulated',
    simulation: {
      basePrice: 100,
      volatility: 50,        // 50% annual volatility
      spreadPercentage: 0.2, // 0.2% spread
      timeframeMinutes: 24 * 60, // 24 hours
      interval: 60,          // 1-minute intervals
      trendBias: 0,         // No trend bias
    }
  }
};

async function runBacktest(config: BacktestConfig = DEFAULT_CONFIG) {
  try {
    // Initialize market service based on config
    const marketService = config.dataSource.type === 'csv' && config.dataSource.path
      ? await BacktestMarketService.fromCSV(config.dataSource.path)
      : new BacktestMarketService(
          BacktestMarketService.generateSimulatedData(config.dataSource.simulation!)
        );

    // Initialize wallet service
    const walletService = new BacktestWalletService(config.initialBalance);

    // Initialize strategy
    const strategy = new SpreadTradingStrategy();

    // Create bot instance
    const bot = new TradingBot(
      walletService,
      marketService,
      strategy
    );

    // Start backtesting
    logger.info('Starting backtest...');
    logger.info('Configuration:', {
      initialBalance: config.initialBalance,
      dataSource: config.dataSource,
    });

    // Run the backtest
    await bot.initialize();

    // Print final results
    if (walletService instanceof BacktestWalletService) {
      const metrics = walletService.getMetrics();
      logger.info('Backtest Results:', {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: `${metrics.winRate.toFixed(2)}%`,
        totalPnL: `${metrics.totalPnL.toFixed(4)} SOL`,
        percentagePnL: `${metrics.percentagePnL.toFixed(2)}%`,
        averagePosition: metrics.averagePosition,
      });

      // Save trade history to CSV
      const trades = walletService.getTradeHistory();
      // TODO: Implement trade history export
    }

  } catch (error) {
    logger.error('Backtest failed:', error);
    process.exit(1);
  }
}

// Run backtest with custom config if provided via command line args
const customConfig = process.argv[2] ? JSON.parse(process.argv[2]) : undefined;
runBacktest(customConfig); 