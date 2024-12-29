import { describe, it, expect } from 'vitest';
import { calculateVersionPerformance, compareVersions } from '../performance';

describe('Performance Module', () => {
  describe('calculateVersionPerformance', () => {
    it('should calculate performance metrics for completed backtests', () => {
      const now = new Date();
      const backtests = [
        {
          id: 'test-1',
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: now,
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          results: JSON.stringify({
            totalTrades: 10,
            profitableTrades: 6,
            trades: [
              { timestamp: now.toISOString(), type: 'BUY', price: 100, amount: 1, profit: 50 },
              { timestamp: now.toISOString(), type: 'SELL', price: 150, amount: 1, profit: -20 }
            ]
          }),
          status: 'COMPLETED'
        },
        {
          id: 'test-2',
          pair: 'SOL/USDC',
          timeframe: '4h',
          startDate: now,
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          results: JSON.stringify({
            totalTrades: 5,
            profitableTrades: 4,
            trades: [
              { timestamp: now.toISOString(), type: 'BUY', price: 100, amount: 1, profit: 30 }
            ]
          }),
          status: 'COMPLETED'
        }
      ];

      const metrics = calculateVersionPerformance(backtests);

      // Check overall metrics
      expect(metrics.overall.totalBacktests).toBe(2);
      expect(metrics.overall.bestTimeframe).toBe('4h'); // 80% win rate
      expect(metrics.overall.worstTimeframe).toBe('1h'); // 60% win rate
      expect(metrics.overall.averageWinRate).toBeCloseTo(70, 1); // (60 + 80) / 2

      // Check timeframe metrics
      expect(Object.keys(metrics.timeframes)).toHaveLength(2);
      
      // Check 1h timeframe
      expect(metrics.timeframes['1h']).toBeDefined();
      expect(metrics.timeframes['1h'].winRate).toBe(60);
      expect(metrics.timeframes['1h'].totalTrades).toBe(10);
      expect(metrics.timeframes['1h'].profitableTrades).toBe(6);
      expect(metrics.timeframes['1h'].dateRange.days).toBe(1);

      // Check 4h timeframe
      expect(metrics.timeframes['4h']).toBeDefined();
      expect(metrics.timeframes['4h'].winRate).toBe(80);
      expect(metrics.timeframes['4h'].totalTrades).toBe(5);
      expect(metrics.timeframes['4h'].profitableTrades).toBe(4);
      expect(metrics.timeframes['4h'].dateRange.days).toBe(1);
    });

    it('should handle empty backtest results', () => {
      const metrics = calculateVersionPerformance([]);
      
      expect(metrics.overall.totalBacktests).toBe(0);
      expect(metrics.overall.bestTimeframe).toBe('');
      expect(metrics.overall.worstTimeframe).toBe('');
      expect(metrics.overall.averageWinRate).toBe(0);
      expect(metrics.overall.averageSharpeRatio).toBe(0);
      expect(Object.keys(metrics.timeframes)).toHaveLength(0);
    });

    it('should ignore incomplete backtests', () => {
      const now = new Date();
      const backtests = [
        {
          id: 'test-1',
          pair: 'SOL/USDC',
          timeframe: '1h',
          startDate: now,
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          results: JSON.stringify({
            totalTrades: 10,
            profitableTrades: 6,
            trades: []
          }),
          status: 'COMPLETED'
        },
        {
          id: 'test-2',
          pair: 'SOL/USDC',
          timeframe: '4h',
          startDate: now,
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          results: null,
          status: 'RUNNING'
        }
      ];

      const metrics = calculateVersionPerformance(backtests);
      
      expect(metrics.overall.totalBacktests).toBe(2); // Total includes all backtests
      expect(Object.keys(metrics.timeframes)).toHaveLength(1); // But only completed ones are analyzed
      expect(metrics.timeframes['1h']).toBeDefined();
      expect(metrics.timeframes['4h']).toBeUndefined();
    });
  });

  describe('compareVersions', () => {
    it('should compare performance metrics between versions', () => {
      const currentVersion = {
        timeframes: {
          '1h': {
            winRate: 65,
            profitFactor: 2.2,
            sharpeRatio: 0.35,
            maxDrawdown: 80,
            totalTrades: 100,
            profitableTrades: 65,
            averageProfit: 30,
            averageLoss: -20,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '1h',
          worstTimeframe: '1h',
          averageWinRate: 65,
          averageSharpeRatio: 0.35
        }
      };

      const previousVersion = {
        timeframes: {
          '1h': {
            winRate: 60,
            profitFactor: 2.0,
            sharpeRatio: 0.3,
            maxDrawdown: 85,
            totalTrades: 90,
            profitableTrades: 54,
            averageProfit: 25,
            averageLoss: -20,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '1h',
          worstTimeframe: '1h',
          averageWinRate: 60,
          averageSharpeRatio: 0.3
        }
      };

      const comparison = compareVersions(currentVersion, previousVersion);
      
      expect(comparison.improved).toBe(true);
      expect(comparison.changes).toHaveLength(4);
      expect(comparison.changes).toContain('Win rate improved by 5.00%');
      expect(comparison.changes).toContain('Sharpe ratio improved by 0.05');
      expect(comparison.changes).toContain('1h win rate improved by 5.00%');
      expect(comparison.changes).toContain('1h profit factor improved by 0.20');
    });

    it('should handle version comparison with different timeframes', () => {
      const currentVersion = {
        timeframes: {
          '1h': {
            winRate: 65,
            profitFactor: 2.2,
            sharpeRatio: 0.35,
            maxDrawdown: 80,
            totalTrades: 100,
            profitableTrades: 65,
            averageProfit: 30,
            averageLoss: -20,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '1h',
          worstTimeframe: '1h',
          averageWinRate: 65,
          averageSharpeRatio: 0.35
        }
      };

      const previousVersion = {
        timeframes: {
          '4h': {
            winRate: 60,
            profitFactor: 2.0,
            sharpeRatio: 0.3,
            maxDrawdown: 85,
            totalTrades: 90,
            profitableTrades: 54,
            averageProfit: 25,
            averageLoss: -20,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '4h',
          worstTimeframe: '4h',
          averageWinRate: 60,
          averageSharpeRatio: 0.3
        }
      };

      const comparison = compareVersions(currentVersion, previousVersion);
      
      expect(comparison.improved).toBe(true);
      expect(comparison.changes).toHaveLength(2);
      expect(comparison.changes).toContain('Win rate improved by 5.00%');
      expect(comparison.changes).toContain('Sharpe ratio improved by 0.05');
    });

    it('should handle version comparison with no improvements', () => {
      const currentVersion = {
        timeframes: {
          '1h': {
            winRate: 55,
            profitFactor: 1.8,
            sharpeRatio: 0.25,
            maxDrawdown: 90,
            totalTrades: 80,
            profitableTrades: 44,
            averageProfit: 20,
            averageLoss: -25,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '1h',
          worstTimeframe: '1h',
          averageWinRate: 55,
          averageSharpeRatio: 0.25
        }
      };

      const previousVersion = {
        timeframes: {
          '1h': {
            winRate: 60,
            profitFactor: 2.0,
            sharpeRatio: 0.3,
            maxDrawdown: 85,
            totalTrades: 90,
            profitableTrades: 54,
            averageProfit: 25,
            averageLoss: -20,
            dateRange: { start: '', end: '', days: 1 }
          }
        },
        overall: {
          totalBacktests: 1,
          bestTimeframe: '1h',
          worstTimeframe: '1h',
          averageWinRate: 60,
          averageSharpeRatio: 0.3
        }
      };

      const comparison = compareVersions(currentVersion, previousVersion);
      
      expect(comparison.improved).toBe(false);
      expect(comparison.changes).toHaveLength(0);
    });
  });
}); 