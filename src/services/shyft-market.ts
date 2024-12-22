import axios from 'axios';
import { logger } from '../utils/logger';

interface ShyftTransaction {
  timestamp: string;
  fee: number;
  fee_payer: string;
  signers: string[];
  signatures: string[];
  type: string;
  status: string;
  actions: Array<{
    type: string;
    data?: {
      amount?: number;
      mint?: string;
      token_address?: string;
      from?: string;
      to?: string;
      price?: number;
      quantity?: number;
      loanTerms?: {
        principal: number;
      };
    };
  }>;
}

interface HistoricalDataPoint {
  timestamp: Date;
  bestBid: { price: number; size: number; };
  bestAsk: { price: number; size: number; };
}

export class ShyftMarketService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.shyft.to/sol/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Shyft API key is required');
    }
    this.apiKey = apiKey;
  }

  async fetchHistoricalData(
    address: string,
    startTime: Date,
    endTime: Date
  ): Promise<HistoricalDataPoint[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/transaction/history`, {
        params: {
          network: 'mainnet-beta',
          account: address,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        },
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      const transactions: ShyftTransaction[] = response.data.result;
      return this.processTransactions(transactions);
    } catch (error) {
      logger.error('Error fetching data from Shyft:', error);
      throw error;
    }
  }

  private processTransactions(transactions: ShyftTransaction[]): HistoricalDataPoint[] {
    // Group transactions by minute to create OHLCV-like data
    const groupedData = new Map<string, ShyftTransaction[]>();
    
    transactions.forEach(tx => {
      const minute = new Date(tx.timestamp).setSeconds(0, 0).toString();
      if (!groupedData.has(minute)) {
        groupedData.set(minute, []);
      }
      groupedData.get(minute)!.push(tx);
    });

    // Convert grouped transactions to historical data points
    return Array.from(groupedData.entries()).map(([timestamp, txs]) => {
      // Calculate average price and volume from transactions
      const prices = txs.map(tx => this.extractPriceFromTransaction(tx)).filter(p => p !== null) as number[];
      const volumes = txs.map(tx => this.extractVolumeFromTransaction(tx)).filter(v => v !== null) as number[];
      
      const avgPrice = prices.length > 0 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : 0;
      const avgVolume = volumes.length > 0
        ? volumes.reduce((a, b) => a + b, 0) / volumes.length
        : 0;

      // Simulate bid-ask spread based on volume
      const spreadPercentage = 0.002 / Math.max(avgVolume / 1e6, 0.1); // Base 0.2% spread
      const spreadAmount = avgPrice * spreadPercentage;

      return {
        timestamp: new Date(parseInt(timestamp)),
        bestBid: {
          price: avgPrice - spreadAmount / 2,
          size: avgVolume * 0.9, // Simulate slightly lower bid size
        },
        bestAsk: {
          price: avgPrice + spreadAmount / 2,
          size: avgVolume * 0.9, // Simulate slightly lower ask size
        },
      };
    });
  }

  private extractPriceFromTransaction(tx: ShyftTransaction): number | null {
    for (const action of tx.actions) {
      switch (action.type) {
        case 'swap':
          // For swap actions, use the price directly if available
          if (action.data?.price) {
            return action.data.price;
          }
          break;

        case 'transfer':
          // For transfers, if there's a loan principal, use that as a price indicator
          if (action.data?.loanTerms?.principal) {
            return action.data.loanTerms.principal;
          }
          // If there's a direct amount, use that
          if (action.data?.amount) {
            return action.data.amount;
          }
          break;

        case 'trade':
        case 'list':
        case 'buy':
        case 'sell':
          // For trading actions, use price if available
          if (action.data?.price) {
            return action.data.price;
          }
          break;
      }
    }
    return null;
  }

  private extractVolumeFromTransaction(tx: ShyftTransaction): number | null {
    for (const action of tx.actions) {
      switch (action.type) {
        case 'swap':
        case 'trade':
        case 'buy':
        case 'sell':
          // For trading actions, use quantity if available
          if (action.data?.quantity) {
            return action.data.quantity;
          }
          break;

        case 'transfer':
          // For transfers, use the amount
          if (action.data?.amount) {
            return action.data.amount;
          }
          break;

        case 'list':
          // For listings, use quantity if available
          if (action.data?.quantity) {
            return action.data.quantity;
          }
          break;
      }
    }
    return null;
  }
} 