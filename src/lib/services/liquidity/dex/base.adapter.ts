/**
 * @file Base DEX adapter interface
 * @version 1.0.0
 * @module lib/services/liquidity/dex/base.adapter
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Connection, PublicKey } from "@solana/web3.js";
import type { Observable } from "rxjs";
import type {
  PoolData,
  LPTokenInfo,
  TokenBalances,
  PriceImpact,
  PoolUpdate,
  DEXConfig,
} from "../types";

export interface PoolDataProvider {
  getPoolData(poolAddress: string): Promise<PoolData>;
  getLPTokenInfo(poolAddress: string): Promise<LPTokenInfo>;
  getTokenBalances(tokenMint: string): Promise<TokenBalances>;
  getPriceImpact(poolAddress: string, amount: number): Promise<PriceImpact>;
}

export abstract class BaseDEXAdapter implements PoolDataProvider {
  protected readonly connection: Connection;
  protected readonly config: DEXConfig;

  constructor(connection: Connection, config: DEXConfig) {
    this.connection = connection;
    this.config = config;
  }

  abstract getPoolData(poolAddress: string): Promise<PoolData>;
  abstract getLPTokenInfo(poolAddress: string): Promise<LPTokenInfo>;
  abstract getTokenBalances(tokenMint: string): Promise<TokenBalances>;
  abstract getPriceImpact(
    poolAddress: string,
    amount: number,
  ): Promise<PriceImpact>;

  /**
   * Validate if a pool exists and is properly initialized
   */
  abstract validatePool(poolAddress: string): Promise<boolean>;

  /**
   * Subscribe to real-time pool updates
   */
  abstract subscribeToPoolChanges(poolAddress: string): Observable<PoolUpdate>;

  /**
   * Get the program ID for this DEX
   */
  getProgramId(): PublicKey {
    return this.config.programId;
  }

  /**
   * Get the DEX type
   */
  getDEXType(): "RAYDIUM" | "ORCA" {
    return this.config.type;
  }

  /**
   * Clean up resources
   */
  abstract cleanup(): Promise<void>;
}
