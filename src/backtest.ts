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

    // Get results
    const metrics = walletService.getMetrics();
    const trades = walletService.getTradeHistory();
    const historicalData = marketService.getHistoricalData();

    return {
      historicalData,
      trades,
      metrics
    };

  } catch (error) {
    logger.error('Backtest failed:', error);
    throw error;
  }
}

// Only run if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  runBacktest();
} 