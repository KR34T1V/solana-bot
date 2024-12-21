import { Market } from '@project-serum/serum';
import { PublicKey } from '@solana/web3.js';
import { connection } from '../config/config';
import { logger } from '../utils/logger';

interface Order {
  price: number;
  size: number;
}

// Default markets for different environments
const DEFAULT_MARKETS = {
  'mainnet-beta': 'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1', // SOL/USDC
  'devnet': '9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT',      // SOL/USDC
  'testnet': '',
};

export class MarketService {
  private market!: Market;

  async initialize(marketAddress: string): Promise<void> {
    try {
      // If no market address is provided, use the default for the current cluster
      const address = marketAddress || DEFAULT_MARKETS[process.env.SOLANA_CLUSTER as keyof typeof DEFAULT_MARKETS] || '';
      
      if (!address) {
        throw new Error('No market address provided and no default available for current cluster');
      }

      logger.info(`Initializing market with address: ${address}`);
      
      this.market = await Market.load(
        connection,
        new PublicKey(address),
        {},
        new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
      );

      // Verify the market is accessible
      await this.market.loadBids(connection);
      logger.info('Market loaded successfully');
    } catch (error) {
      logger.error('Failed to initialize market:', error);
      throw error;
    }
  }

  async getOrderBook() {
    const [bids, asks] = await Promise.all([
      this.market.loadBids(connection),
      this.market.loadAsks(connection),
    ]);
    return { bids, asks };
  }

  async getBestOrders(): Promise<{ bestBid: Order | null; bestAsk: Order | null }> {
    const { bids, asks } = await this.getOrderBook();
    
    let bestBid: Order | null = null;
    let bestAsk: Order | null = null;

    const bidsIterator = bids.items();
    const firstBid = bidsIterator.next();
    if (!firstBid.done && Array.isArray(firstBid.value) && firstBid.value.length === 2) {
      bestBid = {
        price: firstBid.value[0],
        size: firstBid.value[1],
      };
    }

    const asksIterator = asks.items();
    const firstAsk = asksIterator.next();
    if (!firstAsk.done && Array.isArray(firstAsk.value) && firstAsk.value.length === 2) {
      bestAsk = {
        price: firstAsk.value[0],
        size: firstAsk.value[1],
      };
    }

    return { bestBid, bestAsk };
  }
}
