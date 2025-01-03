/**
 * @file TypeScript type definitions and interfaces
 * @version 1.0.0
 * @module lib/types/provider
 * @author Development Team
 * @lastModified 2025-01-02
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

export interface MetaplexData {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: {
    address: string;
    verified: boolean;
    share: number;
  }[];
  collection?: {
    verified: boolean;
    key: string;
  };
  uses?: {
    useMethod: number;
    remaining: number;
    total: number;
  };
  isMutable: boolean;
  primarySaleHappened: boolean;
  updateAuthority: string;
}

export interface CreatorVerification {
  address: string;
  isVerified: boolean;
  verificationMethod: "METAPLEX" | "MANUAL" | "NONE";
  signatureValid: boolean;
  projectHistory: {
    totalProjects: number;
    successfulProjects: number;
    rugPullCount: number;
    averageProjectDuration: number;
  };
  riskScore: number;
}

export interface TokenValidation {
  isValid: boolean;
  metadata: MetaplexData;
  creator: CreatorVerification;
  riskFactors: {
    code: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
  }[];
  riskScore: number;
  lastChecked: number;
}

export interface ProviderCapabilities {
  canGetPrice: boolean;
  canGetOHLCV: boolean;
  canGetOrderBook: boolean;
  canGetMetadata?: boolean;
  canVerifyCreators?: boolean;
  canValidateToken?: boolean;
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
  getOHLCV(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData>;

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
