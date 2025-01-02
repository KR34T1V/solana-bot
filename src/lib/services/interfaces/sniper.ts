/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/interfaces/sniper
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Service } from "./service";
import type { AnalysisResult } from "./analyzer";
import type { TokenDetectionEvent } from "./detector";

/**
 * Sniper configuration interface
 */
export interface SniperConfig {
  /**
   * Maximum age of tokens to consider (in seconds)
   */
  maxTokenAge?: number;

  /**
   * Minimum liquidity required (in SOL)
   */
  minLiquidity?: number;

  /**
   * Maximum price impact allowed (in percentage)
   */
  maxPriceImpact?: number;

  /**
   * Trade size in SOL
   */
  tradeSize?: number;

  /**
   * Maximum number of concurrent trades
   */
  maxConcurrentTrades?: number;

  /**
   * Whether to validate token creators
   */
  validateCreators?: boolean;

  /**
   * Whether to analyze liquidity
   */
  analyzeLiquidity?: boolean;

  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: {
    /**
     * Maximum error rate before triggering
     */
    maxErrorRate: number;

    /**
     * Time window for error rate calculation (in milliseconds)
     */
    timeWindow: number;

    /**
     * Cool down period after triggering (in milliseconds)
     */
    coolDown: number;
  };

  /**
   * Risk management configuration
   */
  riskManagement?: {
    /**
     * Maximum loss per trade (in percentage)
     */
    maxLossPerTrade: number;

    /**
     * Maximum total loss (in SOL)
     */
    maxTotalLoss: number;

    /**
     * Take profit level (in percentage)
     */
    takeProfitLevel: number;

    /**
     * Stop loss level (in percentage)
     */
    stopLossLevel: number;
  };
}

/**
 * Trade result interface
 */
export interface TradeResult {
  /**
   * Token address
   */
  token: string;

  /**
   * Trade type (buy/sell)
   */
  type: "BUY" | "SELL";

  /**
   * Trade amount in SOL
   */
  amount: number;

  /**
   * Trade price
   */
  price: number;

  /**
   * Transaction hash
   */
  txHash: string;

  /**
   * Trade timestamp
   */
  timestamp: number;

  /**
   * Trade status
   */
  status: "PENDING" | "CONFIRMED" | "FAILED";

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Base interface for sniper services
 */
export interface Sniper extends Service {
  /**
   * Start sniping
   */
  startSniping(): Promise<void>;

  /**
   * Stop sniping
   */
  stopSniping(): Promise<void>;

  /**
   * Get the current sniping status
   */
  isActive(): boolean;

  /**
   * Get the sniper configuration
   */
  getConfig(): SniperConfig;

  /**
   * Handle new token detection
   */
  handleNewToken(event: TokenDetectionEvent): Promise<void>;

  /**
   * Handle liquidity analysis update
   */
  handleLiquidityUpdate(
    poolAddress: string,
    result: AnalysisResult,
  ): Promise<void>;

  /**
   * Execute a trade
   */
  executeTrade(
    token: string,
    type: "BUY" | "SELL",
    amount: number,
  ): Promise<TradeResult>;

  /**
   * Subscribe to trade events
   */
  onTrade(callback: (result: TradeResult) => void): void;

  /**
   * Unsubscribe from trade events
   */
  offTrade(callback: (result: TradeResult) => void): void;
}
