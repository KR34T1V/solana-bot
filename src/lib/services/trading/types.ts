/**
 * @file Portfolio tracking service types
 * @version 1.0.0
 * @module lib/services/trading/types
 * @author Development Team
 * @lastModified 2024-01-02
 */

import type { PublicKey } from "@solana/web3.js";

/**
 * Position status in the portfolio
 */
export enum PositionStatus {
  PENDING = "pending",
  OPEN = "open",
  CLOSED = "closed",
  FAILED = "failed",
}

/**
 * Risk level of a position
 */
export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Position type in the portfolio
 */
export enum PositionType {
  LONG = "long",
  SHORT = "short",
}

/**
 * Position metrics and analytics
 */
export interface PositionMetrics {
  unrealizedPnL: number;
  realizedPnL: number;
  currentPrice: number;
  averageEntryPrice: number;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
}

/**
 * Trade execution details
 */
export interface TradeExecution {
  timestamp: number;
  type: "ENTRY" | "EXIT" | "ADJUST";
  price: number;
  size: number;
  fee: number;
  txId: string;
}

/**
 * Position in the portfolio
 */
export interface Position {
  id: string;
  tokenMint: PublicKey;
  size: number;
  type: PositionType;
  status: PositionStatus;
  metrics: PositionMetrics;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
}

/**
 * Portfolio performance metrics
 */
export interface PortfolioMetrics {
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  riskScore: number;
  positionCount: number;
  lastUpdated: Date;
}

/**
 * Portfolio tracker configuration
 */
export interface PortfolioConfig {
  /**
   * Service name
   */
  name: string;

  /**
   * Service version
   */
  version: string;

  /**
   * Maximum number of concurrent positions
   */
  maxPositions: number;

  /**
   * Minimum required liquidity in USD
   */
  minLiquidity: number;

  /**
   * Risk tolerance level (0-1)
   */
  riskTolerance?: number;

  /**
   * Maximum position size as % of portfolio
   */
  maxPositionSize: number;

  /**
   * Maximum leverage allowed
   */
  maxLeverage?: number;

  /**
   * Stop loss trigger threshold
   */
  stopLossThreshold?: number;

  /**
   * Take profit trigger threshold
   */
  takeProfitThreshold?: number;

  /**
   * Position update interval in ms
   */
  updateInterval?: number;

  /**
   * Risk calculation parameters
   */
  riskParams?: {
    volatilityWeight: number;
    liquidityWeight: number;
    concentrationWeight: number;
  };
}

/**
 * Portfolio update event data
 */
export interface PortfolioUpdate {
  timestamp: number;
  metrics: PortfolioMetrics;
  positions: Position[];
  events: {
    type:
      | "POSITION_OPENED"
      | "POSITION_CLOSED"
      | "POSITION_UPDATED"
      | "RISK_ALERT";
    data: any;
  }[];
}
