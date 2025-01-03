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

export interface LPTokenData {
  totalSupply: number;
  locked: number;
  lockDuration?: number;
  vestingSchedules?: {
    startTime: number;
    endTime: number;
    amount: number;
    released: number;
  }[];
}

export interface CreatorData {
  address: string;
  tokenBalance: number;
  percentageOwned: number;
  verificationStatus: "VERIFIED" | "UNVERIFIED";
  projectHistory?: {
    totalProjects: number;
    successfulProjects: number;
    rugPullCount: number;
  };
}

export interface ProviderCapabilities {
  canGetPrice: boolean;
  canGetOHLCV: boolean;
  canGetOrderBook: boolean;
  canGetMetadata?: boolean;
  canVerifyCreators?: boolean;
  canValidateToken?: boolean;
  canGetLPInfo?: boolean;
  canGetCreatorInfo?: boolean;
}

export interface BaseProvider {
  /**
   * Start the provider
   */
  start(): Promise<void>;

  /**
   * Stop the provider and clean up resources
   */
  stop(): Promise<void>;

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
   * Get LP token information for a pool
   * @throws {Error} If LP info is not available
   */
  getLPInfo?(poolAddress: string): Promise<LPTokenData>;

  /**
   * Get creator information for a token
   * @throws {Error} If creator info is not available
   */
  getCreatorInfo?(tokenMint: string): Promise<CreatorData>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;
}

/**
 * Configuration for rate limiting provider operations
 * @interface RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds for rate limiting
 * @property {number} maxRequests - Maximum number of requests allowed in the window
 * @property {number} burstLimit - Number of additional requests allowed to burst
 * @property {number} priority - Priority level for request processing (higher = more priority)
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstLimit: number;
  priority: number;
}
