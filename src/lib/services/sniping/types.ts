/**
 * @file Token Sniping Types
 * @version 1.0.0
 */

export interface TokenValidation {
  creatorWalletAge: number;
  creatorTransactions: number;
  creatorLiquidity: number;
  initialLiquidity: number;
}

export interface EntryConditions {
  minLiquidity: number;
  maxMintAge: number;
  maxPriceImpact: number;
  minHolders: number;
  maxTaxRate: number;
  minDEXPairs: number;
}

export interface RiskParameters {
  maxPositionSize: number;
  maxDailyExposure: number;
  stopLossLevel: number;
  profitTargets: {
    quick: number;
    target: number;
    moon: number;
  };
}

export interface SniperConfig {
  validation: TokenValidation;
  entry: EntryConditions;
  risk: RiskParameters;
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

export interface TradeResult {
  txHash: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  error?: string;
  timestamp: number;
  mint: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  fees?: {
    network: number;
    dex: number;
    total: number;
  };
  route?: {
    dex: string;
    path: string[];
    impact: number;
  };
}
