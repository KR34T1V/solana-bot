import { Market } from '@project-serum/serum';
import { PublicKey } from '@solana/web3.js';
import { connection } from '../config/config';

interface Order {
  price: number;
  size: number;
}

type OrderItem = [number, number];

export class MarketService {
  private market!: Market;

  async initialize(marketAddress: string): Promise<void> {
    this.market = await Market.load(
      connection,
      new PublicKey(marketAddress),
      {},
      new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
    );
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

    const firstBid = bids.items().next().value as OrderItem;
    if (firstBid) {
      const [price, size] = firstBid;
      bestBid = { price, size };
    }

    const firstAsk = asks.items().next().value as OrderItem;
    if (firstAsk) {
      const [price, size] = firstAsk;
      bestAsk = { price, size };
    }

    return { bestBid, bestAsk };
  }
}
