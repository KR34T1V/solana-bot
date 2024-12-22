import type { MarketServiceInterface } from '../bot/trading-bot';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse';

interface HistoricalDataPoint {
  timestamp: Date;
  bestBid: { price: number; size: number; };
  bestAsk: { price: number; size: number; };
}

interface MarketSimulationConfig {
  basePrice: number;
  volatility: number;      // Daily volatility as a percentage
  spreadPercentage: number;// Average spread as a percentage
  timeframeMinutes: number;// Duration of the simulation in minutes
  interval: number;        // Interval between data points in seconds
  trendBias?: number;     // Optional trend bias (-1 to 1, where 1 is strong uptrend)
}

export class BacktestMarketService implements MarketServiceInterface {
  private currentIndex: number = 0;
  private historicalData: HistoricalDataPoint[];

  constructor(historicalData: HistoricalDataPoint[]) {
    this.historicalData = historicalData;
    logger.info(`Loaded ${historicalData.length} historical data points`);
  }

  async initialize(_marketAddress: string): Promise<void> {
    this.currentIndex = 0;
    logger.info('Backtesting market initialized');
  }

  async getOrderBook() {
    const current = this.getCurrentDataPoint();
    return {
      bids: {
        items: () => [[current.bestBid.price, current.bestBid.size]],
      },
      asks: {
        items: () => [[current.bestAsk.price, current.bestAsk.size]],
      },
    };
  }

  async getBestOrders() {
    const current = this.getCurrentDataPoint();
    return {
      bestBid: current.bestBid,
      bestAsk: current.bestAsk,
    };
  }

  getCurrentTimestamp(): Date {
    return this.getCurrentDataPoint().timestamp;
  }

  isBacktestComplete(): boolean {
    return this.currentIndex >= this.historicalData.length - 1;
  }

  getProgress(): number {
    return this.currentIndex / (this.historicalData.length - 1);
  }

  getHistoricalData(): HistoricalDataPoint[] {
    return this.historicalData;
  }

  private getCurrentDataPoint(): HistoricalDataPoint {
    if (this.currentIndex >= this.historicalData.length) {
      throw new Error('Backtest data exhausted');
    }
    const point = this.historicalData[this.currentIndex];
    this.currentIndex++;
    return point;
  }

  // Generate simulated market data with various patterns
  static generateSimulatedData(config: MarketSimulationConfig): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    const startTime = new Date();
    const totalPoints = (config.timeframeMinutes * 60) / config.interval;
    const volatilityPerInterval = config.volatility / Math.sqrt(24 * 60 * 60 / config.interval);
    
    let currentPrice = config.basePrice;
    
    for (let i = 0; i < totalPoints; i++) {
      const timestamp = new Date(startTime.getTime() + i * config.interval * 1000);
      
      // Add random walk with trend bias
      const trend = config.trendBias || 0;
      const randomWalk = (Math.random() - 0.5 + trend * 0.1) * volatilityPerInterval / 100;
      currentPrice *= (1 + randomWalk);

      // Add spread
      const spread = currentPrice * (config.spreadPercentage / 100);
      const spreadVariation = spread * (Math.random() * 0.2 - 0.1); // ±10% spread variation
      
      data.push({
        timestamp,
        bestBid: {
          price: currentPrice - (spread + spreadVariation) / 2,
          size: 1 + Math.random() * 2, // 1-3 SOL size
        },
        bestAsk: {
          price: currentPrice + (spread + spreadVariation) / 2,
          size: 1 + Math.random() * 2,
        },
      });
    }

    return data;
  }

  // Helper method to load historical data from a CSV file
  static async fromCSV(filePath: string): Promise<BacktestMarketService> {
    try {
      if (!fs.existsSync(filePath)) {
        logger.info('No historical data file found, generating simulated data');
        const simulatedData = BacktestMarketService.generateSimulatedData({
          basePrice: 100,
          volatility: 50,        // 50% annual volatility
          spreadPercentage: 0.2, // 0.2% spread
          timeframeMinutes: 24 * 60, // 24 hours
          interval: 60,          // 1-minute intervals
          trendBias: 0,         // No trend bias
        });
        return new BacktestMarketService(simulatedData);
      }

      const data: HistoricalDataPoint[] = [];
      const parser = fs
        .createReadStream(filePath)
        .pipe(csv.parse({ columns: true, cast: true }));

      for await (const row of parser) {
        data.push({
          timestamp: new Date(row.timestamp),
          bestBid: {
            price: parseFloat(row.bidPrice),
            size: parseFloat(row.bidSize),
          },
          bestAsk: {
            price: parseFloat(row.askPrice),
            size: parseFloat(row.askSize),
          },
        });
      }

      return new BacktestMarketService(data);
    } catch (error) {
      logger.error('Error loading historical data:', error);
      throw error;
    }
  }
} 