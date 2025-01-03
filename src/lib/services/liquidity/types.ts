/**
 * @file Type definitions for liquidity analysis
 * @version 1.0.0
 * @module lib/services/liquidity/types
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { PublicKey } from "@solana/web3.js";

export interface PoolData {
  address: PublicKey;
  tokenMint: PublicKey;
  baseTokenMint: PublicKey;
  tokenVault: PublicKey;
  baseTokenVault: PublicKey;
  lpMint: PublicKey;
  tokenDecimals: number;
  baseTokenDecimals: number;
  tokenBalance: bigint;
  baseTokenBalance: bigint;
  lpSupply: bigint;
  lastUpdateTimestamp: number;
}

export interface LPTokenInfo {
  totalSupply: bigint;
  lockedAmount: bigint;
  lockDuration?: number;
  vestingSchedules?: VestingSchedule[];
}

export interface VestingSchedule {
  startTimestamp: number;
  endTimestamp: number;
  amount: bigint;
  released: bigint;
}

export interface TokenBalances {
  mint: PublicKey;
  holders: TokenHolder[];
  totalSupply: bigint;
}

export interface TokenHolder {
  address: PublicKey;
  balance: bigint;
  percentage: number;
}

export interface PriceImpact {
  percentageIn: number; // Impact for buying token
  percentageOut: number; // Impact for selling token
  slippage: number; // Expected slippage
  depth: LiquidityDepth[];
}

export interface LiquidityDepth {
  price: number;
  baseTokenAmount: bigint;
  tokenAmount: bigint;
  cumulativeUsdValue: number;
}

export interface PoolUpdate {
  type: PoolUpdateType;
  poolAddress: PublicKey;
  data: PoolUpdateData;
  timestamp: number;
}

export enum PoolUpdateType {
  SWAP = "swap",
  LIQUIDITY_CHANGE = "liquidity_change",
  LP_TRANSFER = "lp_transfer",
  PRICE_CHANGE = "price_change",
}

export interface PoolUpdateData {
  tokenDelta?: bigint;
  baseTokenDelta?: bigint;
  lpTokenDelta?: bigint;
  priceImpact?: number;
  newPrice?: number;
}

export interface DEXConfig {
  type: "RAYDIUM" | "ORCA";
  programId: PublicKey;
  poolStateLayout: any; // Buffer layout for pool state data
  endpoints?: {
    rest?: string;
    ws?: string;
  };
}
