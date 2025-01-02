/**
 * @file Liquidity Analysis Service
 * @version 1.0.0
 * @description Real-time liquidity analysis for new token pools
 */

import { type Connection } from "@solana/web3.js";
import { EventEmitter } from "events";
import { logger } from "../logging.service";

export interface LiquidityConfig {
  minLiquidityUSD: number; // Minimum liquidity in USD
  maxInitialMCap: number; // Maximum initial market cap in USD
  minLPTokenLocked: number; // Minimum percentage of LP tokens locked
  maxCreatorTokens: number; // Maximum percentage of tokens held by creator
  monitorDuration: number; // Duration to monitor liquidity changes in ms
  suspiciousChanges: {
    maxLiquidityRemoval: number; // Max % of liquidity that can be removed
    minTimelock: number; // Minimum timelock duration in seconds
  };
}

export interface PoolInfo {
  poolAddress: string;
  tokenMint: string;
  baseTokenMint: string; // SOL or USDC
  liquidity: {
    tokenAmount: number;
    baseTokenAmount: number;
    usdValue: number;
  };
  lpTokens: {
    totalSupply: number;
    locked: number; // Amount of LP tokens locked
    lockDuration?: number; // Lock duration in seconds
  };
  creatorInfo: {
    address: string;
    tokenBalance: number;
    percentageOwned: number;
  };
  timestamp: number;
}

export interface LiquidityAnalysis {
  pool: PoolInfo;
  riskScore: number; // 0-100, higher is riskier
  warnings: LiquidityWarning[];
  confidence: number; // 0-1, confidence in analysis
}

export interface LiquidityWarning {
  type: LiquidityWarningType;
  severity: "low" | "medium" | "high";
  details: string;
}

export enum LiquidityWarningType {
  LOW_LIQUIDITY = "low_liquidity",
  HIGH_MCAP = "high_market_cap",
  LOW_LP_LOCKED = "low_lp_locked",
  HIGH_CREATOR_OWNERSHIP = "high_creator_ownership",
  SUSPICIOUS_LP_REMOVAL = "suspicious_lp_removal",
  SHORT_TIMELOCK = "short_timelock",
}

type LiquidityAnalyzerEvents = {
  analysis: (result: LiquidityAnalysis) => void;
  warning: (warning: LiquidityWarning) => void;
  error: (error: Error) => void;
};

export class LiquidityAnalyzer extends EventEmitter {
  private readonly connection: Connection;
  private readonly config: LiquidityConfig;
  private readonly poolMonitors: Map<string, NodeJS.Timeout>;

  constructor(
    connection: Connection,
    config: LiquidityConfig = {
      minLiquidityUSD: 10000, // $10k minimum liquidity
      maxInitialMCap: 1000000, // $1M max initial mcap
      minLPTokenLocked: 80, // 80% minimum LP tokens locked
      maxCreatorTokens: 20, // 20% maximum creator token ownership
      monitorDuration: 3600000, // Monitor for 1 hour
      suspiciousChanges: {
        maxLiquidityRemoval: 20, // 20% max liquidity removal
        minTimelock: 15552000, // 180 days minimum timelock
      },
    },
  ) {
    super();
    this.connection = connection;
    this.config = config;
    this.poolMonitors = new Map();
  }

  /**
   * Start monitoring a new liquidity pool
   */
  async startPoolAnalysis(
    poolAddress: string,
    tokenMint: string,
    baseTokenMint: string,
  ): Promise<void> {
    try {
      // Check if already monitoring
      if (this.poolMonitors.has(poolAddress)) {
        logger.warn("Pool is already being monitored:", { poolAddress });
        return;
      }

      // Initial pool analysis
      const initialAnalysis = await this.analyzeLiquidityPool(
        poolAddress,
        tokenMint,
        baseTokenMint,
      );

      // Emit initial analysis
      this.emit("analysis", initialAnalysis);

      // Start monitoring for changes
      const monitorId = setInterval(
        async () => {
          try {
            const analysis = await this.analyzeLiquidityPool(
              poolAddress,
              tokenMint,
              baseTokenMint,
            );
            this.emit("analysis", analysis);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            logger.error("Error monitoring pool:", {
              error: errorMessage,
              poolAddress,
            });
            if (error instanceof Error) {
              this.emit("error", error);
            }
          }
        },
        30000, // Check every 30 seconds
      );

      // Store monitor reference
      this.poolMonitors.set(poolAddress, monitorId);

      // Set timeout to stop monitoring
      setTimeout(() => {
        this.stopPoolAnalysis(poolAddress);
      }, this.config.monitorDuration);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to start pool analysis:", {
        error: errorMessage,
        poolAddress,
      });
      throw error;
    }
  }

  /**
   * Stop monitoring a liquidity pool
   */
  stopPoolAnalysis(poolAddress: string): void {
    const monitorId = this.poolMonitors.get(poolAddress);
    if (monitorId) {
      clearInterval(monitorId);
      this.poolMonitors.delete(poolAddress);
      logger.info("Stopped monitoring pool:", { poolAddress });
    }
  }

  /**
   * Analyze a liquidity pool
   */
  private async analyzeLiquidityPool(
    poolAddress: string,
    tokenMint: string,
    baseTokenMint: string,
  ): Promise<LiquidityAnalysis> {
    try {
      // Get pool information
      const pool = await this.getPoolInfo(
        poolAddress,
        tokenMint,
        baseTokenMint,
      );

      // Calculate risk score and generate warnings
      const { riskScore, warnings } = this.calculateRiskScore(pool);

      // Calculate confidence in analysis
      const confidence = this.calculateConfidence(pool);

      return {
        pool,
        riskScore,
        warnings,
        confidence,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to analyze pool:", {
        error: errorMessage,
        poolAddress,
      });
      throw error;
    }
  }

  /**
   * Get detailed pool information
   */
  private async getPoolInfo(
    _poolAddress: string,
    _tokenMint: string,
    _baseTokenMint: string,
  ): Promise<PoolInfo> {
    // TODO: Implement pool data fetching
    // This will involve:
    // 1. Fetching pool account data
    // 2. Getting LP token information
    // 3. Checking creator token balances
    // 4. Calculating USD values
    throw new Error("Not implemented");
  }

  /**
   * Calculate risk score and generate warnings
   */
  private calculateRiskScore(pool: PoolInfo): {
    riskScore: number;
    warnings: LiquidityWarning[];
  } {
    const warnings: LiquidityWarning[] = [];
    let riskScore = 0;

    // Check liquidity
    if (pool.liquidity.usdValue < this.config.minLiquidityUSD) {
      warnings.push({
        type: LiquidityWarningType.LOW_LIQUIDITY,
        severity: "high",
        details: `Liquidity ($${pool.liquidity.usdValue}) below minimum ($${this.config.minLiquidityUSD})`,
      });
      riskScore += 30;
    }

    // Check LP tokens locked
    const lpLockedPercentage =
      (pool.lpTokens.locked / pool.lpTokens.totalSupply) * 100;
    if (lpLockedPercentage < this.config.minLPTokenLocked) {
      warnings.push({
        type: LiquidityWarningType.LOW_LP_LOCKED,
        severity: "high",
        details: `Only ${lpLockedPercentage.toFixed(2)}% of LP tokens locked (min ${this.config.minLPTokenLocked}%)`,
      });
      riskScore += 25;
    }

    // Check creator ownership
    if (pool.creatorInfo.percentageOwned > this.config.maxCreatorTokens) {
      warnings.push({
        type: LiquidityWarningType.HIGH_CREATOR_OWNERSHIP,
        severity: "medium",
        details: `Creator owns ${pool.creatorInfo.percentageOwned.toFixed(2)}% of tokens (max ${this.config.maxCreatorTokens}%)`,
      });
      riskScore += 20;
    }

    // Check timelock duration
    if (
      pool.lpTokens.lockDuration &&
      pool.lpTokens.lockDuration < this.config.suspiciousChanges.minTimelock
    ) {
      warnings.push({
        type: LiquidityWarningType.SHORT_TIMELOCK,
        severity: "medium",
        details: `LP tokens locked for ${(pool.lpTokens.lockDuration / 86400).toFixed(1)} days (min ${(this.config.suspiciousChanges.minTimelock / 86400).toFixed(1)} days)`,
      });
      riskScore += 15;
    }

    // Cap risk score at 100
    return {
      riskScore: Math.min(riskScore, 100),
      warnings,
    };
  }

  /**
   * Calculate confidence in liquidity analysis
   *
   * @description
   * Computes a weighted confidence score based on multiple factors:
   *
   * 1. Liquidity Factor (30% weight):
   *    - Evaluates the USD value of liquidity against minimum requirements
   *    - Higher liquidity increases confidence up to a cap
   *
   * 2. LP Tokens Locked (30% weight):
   *    - Assesses the percentage of LP tokens locked in vesting contracts
   *    - Higher locked percentage increases confidence
   *
   * 3. Token Distribution (20% weight):
   *    - Analyzes token distribution among holders
   *    - Lower creator ownership increases confidence
   *
   * Base confidence starts at 30% and can increase based on these factors.
   *
   * @param pool - Pool information including liquidity, LP tokens, and creator data
   * @returns A confidence score between 0 and 1
   *
   * @example
   * ```typescript
   * const confidence = analyzer.calculateConfidence({
   *   liquidity: { usdValue: 100000 },
   *   lpTokens: { locked: 800000, totalSupply: 1000000 },
   *   creatorInfo: { percentageOwned: 20 }
   * });
   * ```
   *
   * @remarks
   * Confidence Interpretation:
   * - 0.9-1.0: Very high confidence
   * - 0.7-0.9: High confidence
   * - 0.5-0.7: Moderate confidence
   * - 0.3-0.5: Low confidence
   * - <0.3: Very low confidence
   */
  private calculateConfidence(pool: PoolInfo): number {
    // Factors that increase confidence:
    // - More liquidity (up to a point)
    // - Longer monitoring time
    // - More LP tokens locked
    // - Clear token distribution

    let confidence = 0.3; // Lower base confidence

    // Liquidity factor (0.3 weight)
    const liquidityFactor = Math.min(
      pool.liquidity.usdValue / (this.config.minLiquidityUSD * 2),
      1,
    );
    confidence += liquidityFactor * 0.3;

    // LP locked factor (0.3 weight)
    const lpLockedFactor = pool.lpTokens.locked / pool.lpTokens.totalSupply;
    confidence += lpLockedFactor * 0.3;

    // Token distribution factor (0.2 weight)
    const distributionFactor = Math.max(
      0,
      1 - pool.creatorInfo.percentageOwned / this.config.maxCreatorTokens,
    );
    confidence += distributionFactor * 0.2;

    // Cap confidence at 1.0
    return Math.min(confidence, 1);
  }

  // Type-safe event emitter methods
  override on<K extends keyof LiquidityAnalyzerEvents>(
    event: K,
    listener: LiquidityAnalyzerEvents[K],
  ): this {
    return super.on(event, listener);
  }

  override off<K extends keyof LiquidityAnalyzerEvents>(
    event: K,
    listener: LiquidityAnalyzerEvents[K],
  ): this {
    return super.off(event, listener);
  }

  override emit<K extends keyof LiquidityAnalyzerEvents>(
    event: K,
    ...args: Parameters<LiquidityAnalyzerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
