/**
 * @file Base interfaces for market data providers
 * @version 1.0.0
 */

export interface PriceData {
  price: number;
  timestamp: number;
  confidence: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDepth {
  bids: Array<readonly [number, number]>;
  asks: Array<readonly [number, number]>;
  timestamp: number;
}

export interface BaseProvider {
  /**
   * Get current price for a token
   * @param tokenMint The token's mint address
   */
  getPrice(tokenMint: string): Promise<PriceData>;

  /**
   * Get historical OHLCV data
   * @param tokenMint The token's mint address
   * @param timeframe Timeframe in minutes
   * @param limit Number of candles to return
   */
  getOHLCV(tokenMint: string, timeframe: number, limit: number): Promise<never>;

  /**
   * Get order book data
   * @param tokenMint The token's mint address
   * @param limit Depth of the order book
   */
  getOrderBook(tokenMint: string, limit?: number): Promise<MarketDepth>;
}
