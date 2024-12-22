import { CONFIG } from './config/config';
import { TradingBot } from './bot/trading-bot';
import { BacktestWalletService } from './services/backtest-wallet';
import { BacktestMarketService } from './services/backtest-market';
import { SpreadTradingStrategy } from './bot/trading-strategy';
import { logger } from './utils/logger';

export interface BacktestConfig {
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

export interface BacktestResults {
  historicalData: {
    timestamp: Date;
    bestBid: { price: number; size: number; };
    bestAsk: { price: number; size: number; };
  }[];
  trades: {
    type: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: Date;
  }[];
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnL: number;
    percentagePnL: number;
    averagePosition: number;
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

export async function runBacktest(config: BacktestConfig = DEFAULT_CONFIG): Promise<BacktestResults> {
  try {
    // Validate config
    if (!config.initialBalance || config.initialBalance <= 0) {
      throw new Error('Initial balance must be greater than 0');
    }

    if (config.dataSource.type === 'csv' && !config.dataSource.path) {
      throw new Error('CSV data source requires a path');
    }

    if (config.dataSource.type === 'simulated' && !config.dataSource.simulation) {
      throw new Error('Simulated data source requires simulation parameters');
    }

    // Initialize market service based on config
    let marketService: BacktestMarketService;
    try {
      marketService = config.dataSource.type === 'csv' && config.dataSource.path
        ? await BacktestMarketService.fromCSV(config.dataSource.path)
        : new BacktestMarketService(
            BacktestMarketService.generateSimulatedData(config.dataSource.simulation!)
          );
    } catch (err) {
      logger.error('Failed to initialize market service', {
        error: err instanceof Error ? err : new Error(String(err)),
        config: config.dataSource,
        component: 'Backtest'
      });
      throw new Error('Failed to initialize market service: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Initialize wallet service
    let walletService: BacktestWalletService;
    try {
      walletService = new BacktestWalletService(config.initialBalance);
    } catch (err) {
      logger.error('Failed to initialize wallet service', {
        error: err instanceof Error ? err : new Error(String(err)),
        initialBalance: config.initialBalance,
        component: 'Backtest'
      });
      throw new Error('Failed to initialize wallet service: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Initialize strategy
    let strategy: SpreadTradingStrategy;
    try {
      strategy = new SpreadTradingStrategy();
    } catch (err) {
      logger.error('Failed to initialize strategy', {
        error: err instanceof Error ? err : new Error(String(err)),
        component: 'Backtest'
      });
      throw new Error('Failed to initialize strategy: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Create bot instance
    let bot: TradingBot;
    try {
      bot = new TradingBot(
        walletService,
        marketService,
        strategy
      );
    } catch (err) {
      logger.error('Failed to initialize trading bot', {
        error: err instanceof Error ? err : new Error(String(err)),
        component: 'Backtest'
      });
      throw new Error('Failed to initialize trading bot: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Start backtesting
    logger.info('Starting backtest...', {
      config,
      component: 'Backtest'
    });

    // Run the backtest
    try {
      await bot.initialize();
    } catch (err) {
      logger.error('Failed to run backtest', {
        error: err instanceof Error ? err : new Error(String(err)),
        component: 'Backtest'
      });
      throw new Error('Failed to run backtest: ' + (err instanceof Error ? err.message : String(err)));
    }

    // Get results
    const metrics = walletService.getMetrics();
    const trades = walletService.getTradeHistory();
    const historicalData = marketService.getHistoricalData();

    logger.info('Backtest completed successfully', {
      metrics,
      tradesCount: trades.length,
      dataPoints: historicalData.length,
      component: 'Backtest'
    });

    return {
      historicalData,
      trades,
      metrics
    };

  } catch (err) {
    logger.error('Backtest failed', {
      error: err instanceof Error ? err : new Error(String(err)),
      config,
      component: 'Backtest'
    });
    throw err;
  }
}

// Only run if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  runBacktest().catch(err => {
    logger.error('Failed to run backtest from command line', {
      error: err instanceof Error ? err : new Error(String(err)),
      component: 'Backtest'
    });
    process.exit(1);
  });
} 