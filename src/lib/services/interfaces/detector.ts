/**
 * @file Detector Service Interface
 * @version 1.0.0
 * @description Interface for detector services
 */

import type { Service } from "./service";

/**
 * Detector configuration interface
 */
export interface DetectorConfig {
  /**
   * Maximum age of tokens to consider (in seconds)
   */
  maxTokenAge?: number;

  /**
   * Minimum liquidity required (in SOL)
   */
  minLiquidity?: number;

  /**
   * Maximum number of tokens to track simultaneously
   */
  maxTrackedTokens?: number;

  /**
   * Interval for checking new tokens (in milliseconds)
   */
  checkInterval?: number;

  /**
   * Whether to validate token creators
   */
  validateCreators?: boolean;

  /**
   * Whether to analyze token liquidity
   */
  analyzeLiquidity?: boolean;
}

/**
 * Token detection event interface
 */
export interface TokenDetectionEvent {
  /**
   * Token mint address
   */
  mint: string;

  /**
   * Token creation timestamp
   */
  createdAt: number;

  /**
   * Token creator address
   */
  creator: string;

  /**
   * Initial liquidity (if available)
   */
  initialLiquidity?: number;

  /**
   * Token metadata (if available)
   */
  metadata?: {
    name?: string;
    symbol?: string;
    uri?: string;
  };
}

/**
 * Base interface for detector services
 */
export interface Detector extends Service {
  /**
   * Start monitoring for new tokens
   */
  startMonitoring(): Promise<void>;

  /**
   * Stop monitoring for new tokens
   */
  stopMonitoring(): Promise<void>;

  /**
   * Get the current monitoring status
   */
  isMonitoring(): boolean;

  /**
   * Get the detector configuration
   */
  getConfig(): DetectorConfig;

  /**
   * Subscribe to token detection events
   */
  onTokenDetected(callback: (event: TokenDetectionEvent) => void): void;

  /**
   * Unsubscribe from token detection events
   */
  offTokenDetected(callback: (event: TokenDetectionEvent) => void): void;
} 