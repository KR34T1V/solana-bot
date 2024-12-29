import type { Prisma } from '@prisma/client';

interface BacktestResult {
  totalTrades: number;
  profitableTrades: number;
  trades: Array<{
    timestamp: string;
    type: 'BUY' | 'SELL';
    price: number;
    amount: number;
    profit: number;
  }>;
}

interface TimeframeMetrics {
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  profitableTrades: number;
  averageProfit: number;
  averageLoss: number;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

interface PerformanceMetrics {
  timeframes: {
    [key: string]: TimeframeMetrics;
  };
  overall: {
    totalBacktests: number;
    bestTimeframe: string;
    worstTimeframe: string;
    averageWinRate: number;
    averageSharpeRatio: number;
  };
}

export function calculateVersionPerformance(backtests: Array<{
  id: string;
  pair: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  results: string | null;
  status: string;
}> | undefined): PerformanceMetrics {
  if (!backtests || backtests.length === 0) {
    return {
      timeframes: {},
      overall: {
        totalBacktests: 0,
        bestTimeframe: '',
        worstTimeframe: '',
        averageWinRate: 0,
        averageSharpeRatio: 0
      }
    };
  }

  const timeframeResults = new Map<string, BacktestResult[]>();

  // Group backtest results by timeframe
  backtests.forEach(backtest => {
    if (backtest.status !== 'COMPLETED' || !backtest.results) return;

    const results = JSON.parse(backtest.results) as BacktestResult;
    const existing = timeframeResults.get(backtest.timeframe) || [];
    timeframeResults.set(backtest.timeframe, [...existing, results]);
  });

  // Calculate metrics for each timeframe
  const timeframes: { [key: string]: TimeframeMetrics } = {};
  let bestWinRate = 0;
  let worstWinRate = 100;
  let bestTimeframe = '';
  let worstTimeframe = '';
  let totalWinRate = 0;
  let totalSharpeRatio = 0;
  let timeframeCount = 0;

  timeframeResults.forEach((results, timeframe) => {
    const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
    const profitableTrades = results.reduce((sum, r) => sum + r.profitableTrades, 0);
    const winRate = (profitableTrades / totalTrades) * 100;

    // Find best and worst timeframes
    if (winRate > bestWinRate) {
      bestWinRate = winRate;
      bestTimeframe = timeframe;
    }
    if (winRate < worstWinRate) {
      worstWinRate = winRate;
      worstTimeframe = timeframe;
    }

    // Calculate average metrics
    totalWinRate += winRate;
    totalSharpeRatio += 0.31; // Placeholder - implement actual Sharpe ratio calculation
    timeframeCount++;

    // Get date range from the first backtest for this timeframe
    const firstBacktest = backtests.find(b => b.timeframe === timeframe);
    const days = firstBacktest 
      ? Math.ceil((firstBacktest.endDate.getTime() - firstBacktest.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    timeframes[timeframe] = {
      winRate,
      profitFactor: 2.08, // Placeholder - implement actual calculation
      sharpeRatio: 0.31, // Placeholder - implement actual calculation
      maxDrawdown: 86.31, // Placeholder - implement actual calculation
      totalTrades,
      profitableTrades,
      averageProfit: 25.54, // Placeholder - implement actual calculation
      averageLoss: -19.51, // Placeholder - implement actual calculation
      dateRange: {
        start: firstBacktest?.startDate.toISOString() || '',
        end: firstBacktest?.endDate.toISOString() || '',
        days
      }
    };
  });

  return {
    timeframes,
    overall: {
      totalBacktests: backtests.length,
      bestTimeframe,
      worstTimeframe,
      averageWinRate: timeframeCount > 0 ? totalWinRate / timeframeCount : 0,
      averageSharpeRatio: timeframeCount > 0 ? totalSharpeRatio / timeframeCount : 0
    }
  };
}

export function compareVersions(
  currentVersion: PerformanceMetrics,
  previousVersion: PerformanceMetrics
): { improved: boolean; changes: string[] } {
  const changes: string[] = [];
  let improvements = 0;
  let metrics = 0;

  // Compare overall metrics
  if (currentVersion.overall.averageWinRate > previousVersion.overall.averageWinRate) {
    changes.push(`Win rate improved by ${(currentVersion.overall.averageWinRate - previousVersion.overall.averageWinRate).toFixed(2)}%`);
    improvements++;
  }
  metrics++;

  if (currentVersion.overall.averageSharpeRatio > previousVersion.overall.averageSharpeRatio) {
    changes.push(`Sharpe ratio improved by ${(currentVersion.overall.averageSharpeRatio - previousVersion.overall.averageSharpeRatio).toFixed(2)}`);
    improvements++;
  }
  metrics++;

  // Compare timeframe metrics
  Object.keys(currentVersion.timeframes).forEach(timeframe => {
    if (!previousVersion.timeframes[timeframe]) return;

    const current = currentVersion.timeframes[timeframe];
    const previous = previousVersion.timeframes[timeframe];

    if (current.winRate > previous.winRate) {
      changes.push(`${timeframe} win rate improved by ${(current.winRate - previous.winRate).toFixed(2)}%`);
      improvements++;
    }
    metrics++;

    if (current.profitFactor > previous.profitFactor) {
      changes.push(`${timeframe} profit factor improved by ${(current.profitFactor - previous.profitFactor).toFixed(2)}`);
      improvements++;
    }
    metrics++;
  });

  return {
    improved: improvements > metrics / 2,
    changes
  };
} 