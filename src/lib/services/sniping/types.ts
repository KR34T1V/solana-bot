/**
 * @file Token Sniping Types
 * @version 1.0.0
 */

export interface TokenValidation {
  creatorWalletAge: number; // Minimum wallet age in milliseconds
  creatorTransactions: number; // Minimum number of transactions
  creatorLiquidity: number; // Minimum historical liquidity in SOL
  initialSupply?: number; // Initial token supply
  initialLiquidity: number; // Minimum initial liquidity in SOL
  initialMarketCap?: number; // Initial market cap in USD
  holderDistribution?: number[]; // Initial holder breakdown
  isHoneypot?: boolean; // Honeypot detection flag
  hasRenounced?: boolean; // Whether ownership is renounced
  transferDelay?: number; // Transfer delay in milliseconds
  taxAmount?: number; // Tax percentage as decimal
}

export interface EntryConditions {
  minLiquidity: number; // Minimum liquidity in SOL
  maxMintAge: number; // Maximum age for entry in milliseconds
  maxPriceImpact: number; // Maximum price impact as decimal
  minHolders: number; // Minimum number of unique holders
  maxTaxRate: number; // Maximum tax rate as decimal
  minDEXPairs: number; // Minimum number of DEX pairs
}

export interface RiskParameters {
  maxPositionSize: number; // Maximum position size as portfolio percentage
  maxDailyExposure: number; // Maximum daily exposure as portfolio percentage
  stopLossLevel: number; // Stop loss level as decimal
  profitTargets: {
    quick: number; // Quick profit target as decimal
    target: number; // Main profit target as decimal
    moon: number; // Moon bag target as decimal
  };
}

export interface TokenAnalysis {
  mint: string;
  isEnterable: boolean;
  liquidityScore: number;
  riskScore: number;
  metrics: {
    price: number;
    liquidity: number;
    volume: number;
    holders: number;
    pairs: number;
  };
  safety: {
    isHoneypot: boolean;
    hasLock: boolean;
    lockDuration?: number;
    transferDelay?: number;
    buyTax?: number;
    sellTax?: number;
  };
}

export interface TradeRecord {
  mint: string;
  profit: number;
  duration: number;
  timestamp: number;
  entryPrice?: number;
  exitPrice?: number;
  size?: number;
}

export interface PerformanceMetrics {
  winRate: number;
  averageReturn: number;
  riskRewardRatio: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  recoveryFactor?: number;
}

export interface SystemStatus {
  isActive: boolean;
  isPaused: boolean;
  isCircuitBroken: boolean;
  errors: {
    count: number;
    lastError?: string;
    timestamp?: number;
  };
  performance: {
    latency: number;
    successRate: number;
    uptime: number;
  };
}

export interface TokenData {
  mint: string;
  creator: string;
  timestamp: number;
  metadata?: {
    name?: string;
    symbol?: string;
    decimals: number;
  };
  supply?: {
    total: number;
    circulating: number;
  };
  contract?: {
    hasProxy: boolean;
    hasMintAuthority: boolean;
    isVerified: boolean;
  };
}

export interface SafetyScore {
  overall: number; // 0-1 score
  factors: {
    contractSafety: number;
    creatorTrust: number;
    liquidityHealth: number;
    tradingPattern: number;
  };
  flags: {
    isHoneypot: boolean;
    hasRugPullRisk: boolean;
    hasMEVRisk: boolean;
    hasAbnormalActivity: boolean;
  };
}

export interface CreatorScore {
  overall: number; // 0-1 score
  metrics: {
    walletAge: number; // in seconds
    transactionCount: number;
    successfulTokens: number;
    rugPullCount: number;
  };
  risk: {
    isKnownScammer: boolean;
    hasScamConnections: boolean;
    hasAbnormalPatterns: boolean;
  };
}

export interface LiquidityData {
  poolId: string;
  dex: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  timestamp: number;
  metrics: {
    depth: number;
    distribution: number;
    stability: number;
  };
  flags: {
    isLocked: boolean;
    lockDuration?: number;
    isSuspicious: boolean;
  };
}
