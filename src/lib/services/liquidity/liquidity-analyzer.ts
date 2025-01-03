/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/liquidity/liquidity-analyzer
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Connection } from "@solana/web3.js";
import { EventEmitter } from "events";
import { ProviderFactory, ProviderType } from "../providers/provider.factory";
import type { BaseProvider } from "../../types/provider";
import type { LPTokenData, CreatorData } from "../../types/provider";
import type { ManagedLoggingService } from "../core/managed-logging";
import type { PriceImpact, VestingSchedule, TokenBalances } from "./types";

export interface LiquidityConfig {
  minLiquidityUSD: number;
  maxInitialMCap: number;
  minLPTokenLocked: number;
  maxCreatorTokens: number;
  monitorDuration: number;
  suspiciousChanges: {
    maxLiquidityRemoval: number;
    minTimelock: number;
  };
}

export interface ProjectHistory {
  totalProjects: number;
  successfulProjects: number;
  rugPullCount: number;
  averageProjectDuration: number;
}

export interface PoolInfo {
  poolAddress: string;
  tokenMint: string;
  baseTokenMint: string;
  liquidity: {
    tokenAmount: number;
    baseTokenAmount: number;
    usdValue: number;
    priceImpact: PriceImpact;
    distribution: {
      gini: number;
      top10Percentage: number;
      holderCount: number;
    } | null;
  };
  lpTokens: {
    totalSupply: number;
    locked: number;
    lockDuration?: number;
    vestingSchedules?: VestingSchedule[];
  };
  creatorInfo: {
    address: string;
    tokenBalance: number;
    percentageOwned: number;
    verificationStatus: string;
    projectHistory?: ProjectHistory;
  };
  timestamp: number;
}

export interface LiquidityAnalysis {
  pool: PoolInfo;
  riskScore: number;
  warnings: LiquidityWarning[];
  confidence: number;
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

export interface ExtendedBaseProvider extends BaseProvider {
  getTokenBalances?(tokenMint: string): Promise<TokenBalances>;
  getLPInfo?(
    poolAddress: string,
  ): Promise<LPTokenData & { vestingSchedules?: VestingSchedule[] }>;
  getCreatorInfo?(
    tokenMint: string,
  ): Promise<CreatorData & { projectHistory?: ProjectHistory }>;
}

interface LiquidityAnalyzerEvents {
  analysis: (result: LiquidityAnalysis) => void;
  warning: (warning: LiquidityWarning) => void;
  error: (error: Error) => void;
}

export class LiquidityAnalyzer extends EventEmitter {
  private readonly connection: Connection;
  private readonly config: LiquidityConfig;
  private readonly poolMonitors: Map<string, NodeJS.Timeout>;
  private readonly providers: Map<string, ExtendedBaseProvider>;
  private readonly logger: ManagedLoggingService;

  constructor(
    connection: Connection,
    logger: ManagedLoggingService,
    config: LiquidityConfig = {
      minLiquidityUSD: 10000,
      maxInitialMCap: 1000000,
      minLPTokenLocked: 80,
      maxCreatorTokens: 20,
      monitorDuration: 3600000,
      suspiciousChanges: {
        maxLiquidityRemoval: 20,
        minTimelock: 15552000,
      },
    },
  ) {
    super();
    this.connection = connection;
    this.config = config;
    this.poolMonitors = new Map();
    this.providers = new Map();
    this.logger = logger;
  }

  public override emit<K extends keyof LiquidityAnalyzerEvents>(
    event: K,
    ...args: Parameters<LiquidityAnalyzerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  private async getProviderForPool(
    poolAddress: string,
  ): Promise<ExtendedBaseProvider> {
    if (this.providers.has(poolAddress)) {
      return this.providers.get(poolAddress)!;
    }

    const provider = ProviderFactory.getProvider(
      ProviderType.RAYDIUM,
      this.logger,
      this.connection,
    ) as ExtendedBaseProvider;

    await provider.start();
    this.providers.set(poolAddress, provider);
    return provider;
  }

  private analyzeTokenDistribution(balances: TokenBalances): {
    gini: number;
    top10Percentage: number;
    holderCount: number;
  } {
    if (balances.holders.length === 0) {
      return {
        gini: 0,
        top10Percentage: 0,
        holderCount: 0,
      };
    }

    const holders = balances.holders.sort((a, b) =>
      Number(b.balance - a.balance),
    );

    let sumOfDifferences = 0;
    let sumOfBalances = 0;
    for (let i = 0; i < holders.length; i++) {
      for (let j = 0; j < holders.length; j++) {
        sumOfDifferences += Math.abs(
          Number(holders[i].balance) - Number(holders[j].balance),
        );
      }
      sumOfBalances += Number(holders[i].balance);
    }
    const gini = sumOfDifferences / (2 * holders.length * sumOfBalances);

    const top10 = holders.slice(0, Math.min(10, holders.length));
    const top10Sum = top10.reduce(
      (sum, holder) => sum + Number(holder.balance),
      0,
    );
    const top10Percentage = (top10Sum / Number(balances.totalSupply)) * 100;

    return {
      gini,
      top10Percentage,
      holderCount: holders.length,
    };
  }
}
