/**
 * @file Analyzer Service Interface
 * @version 1.0.0
 * @description Interface for analyzer services
 */

import type { Service } from "./service";

/**
 * Analyzer configuration interface
 */
export interface AnalyzerConfig {
  /**
   * Minimum liquidity threshold (in SOL)
   */
  minLiquidity?: number;

  /**
   * Maximum price impact allowed (in percentage)
   */
  maxPriceImpact?: number;

  /**
   * Minimum volume required (in SOL)
   */
  minVolume?: number;

  /**
   * Analysis interval (in milliseconds)
   */
  analysisInterval?: number;

  /**
   * Maximum number of pools to analyze simultaneously
   */
  maxPools?: number;

  /**
   * Whether to track price history
   */
  trackPriceHistory?: boolean;

  /**
   * Price history retention period (in milliseconds)
   */
  priceHistoryRetention?: number;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  /**
   * Token address
   */
  token: string;

  /**
   * Pool address
   */
  pool: string;

  /**
   * Current liquidity (in SOL)
   */
  liquidity: number;

  /**
   * Current price
   */
  price: number;

  /**
   * 24h volume
   */
  volume24h: number;

  /**
   * Price impact for configured trade size
   */
  priceImpact: number;

  /**
   * Analysis timestamp
   */
  timestamp: number;

  /**
   * Price history (if enabled)
   */
  priceHistory?: Array<{
    price: number;
    timestamp: number;
  }>;
}

/**
 * Base interface for analyzer services
 */
export interface Analyzer extends Service {
  /**
   * Start analyzing a pool
   */
  startAnalysis(poolAddress: string): Promise<void>;

  /**
   * Stop analyzing a pool
   */
  stopAnalysis(poolAddress: string): Promise<void>;

  /**
   * Get the current analysis status for a pool
   */
  getAnalysisStatus(poolAddress: string): boolean;

  /**
   * Get the analyzer configuration
   */
  getConfig(): AnalyzerConfig;

  /**
   * Get the latest analysis result for a pool
   */
  getAnalysisResult(poolAddress: string): Promise<AnalysisResult>;

  /**
   * Subscribe to analysis updates
   */
  onAnalysisUpdate(
    callback: (poolAddress: string, result: AnalysisResult) => void,
  ): void;

  /**
   * Unsubscribe from analysis updates
   */
  offAnalysisUpdate(
    callback: (poolAddress: string, result: AnalysisResult) => void,
  ): void;
} 