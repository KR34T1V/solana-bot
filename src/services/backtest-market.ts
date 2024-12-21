import { MarketServiceInterface } from '../bot/trading-bot';
import { logger } from '../utils/logger';

interface HistoricalDataPoint {
  timestamp: Date;
  bestBid: { price: number; size: number; };
  bestAsk: { price: number; size: number; };
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

  private getCurrentDataPoint(): HistoricalDataPoint {
    if (this.currentIndex >= this.historicalData.length) {
      throw new Error('End of historical data reached');
    }
    return this.historicalData[this.currentIndex++];
  }

  // Helper method to load historical data from a CSV file
  static async fromCSV(filePath: string): Promise<BacktestMarketService> {
    // TODO: Implement CSV loading
    // For now, return sample data
    const sampleData: HistoricalDataPoint[] = [];
    const startTime = new Date();
    const basePrice = 100; // Base price in SOL
    
    // Generate 24 hours of minute-by-minute data
    for (let i = 0; i < 24 * 60; i++) {
      const timestamp = new Date(startTime.getTime() + i * 60000);
      const randomChange = (Math.random() - 0.5) * 0.1; // ±5% price change
      const midPrice = basePrice * (1 + randomChange);
      const spread = midPrice * 0.002; // 0.2% spread
      
      sampleData.push({
        timestamp,
        bestBid: {
          price: midPrice - spread / 2,
          size: 1 + Math.random() * 2, // 1-3 SOL size
        },
        bestAsk: {
          price: midPrice + spread / 2,
          size: 1 + Math.random() * 2,
        },
      });
    }

    return new BacktestMarketService(sampleData);
  }
} 