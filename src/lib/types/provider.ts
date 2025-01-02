/**
 * @file Provider Type Definitions
 * @version 1.0.0
 * @description Type definitions for market data providers
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
  bids: Array<[number, number]>; // [price, size]
  asks: Array<[number, number]>; // [price, size]
  timestamp: number;
}

export interface ProviderCapabilities {
  canGetPrice: boolean;
  canGetOHLCV: boolean;
  canGetOrderBook: boolean;
}

export interface BaseProvider {
  /**
   * Get current price for a token
   * @throws {Error} If price data is not available
   */
  getPrice(tokenMint: string): Promise<PriceData>;

  /**
   * Get OHLCV data for a token
   * @throws {Error} If OHLCV data is not available
   */
  getOHLCV(tokenMint: string, timeframe: number, limit: number): Promise<OHLCVData>;

  /**
   * Get order book data for a token
   * @throws {Error} If order book data is not available
   */
  getOrderBook(tokenMint: string, limit?: number): Promise<MarketDepth>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;
}
