/**
 * @file Services Barrel File
 * @version 1.2.0
 * @module lib/services
 * @author Development Team
 * @lastModified 2025-01-02
 */

// Core services
export * from "./core/service.manager";
export * from "./core/managed-logging";
export * from "./core/managed-auth";

// Providers
export {
  ServiceError,
  ManagedProviderBase,
  type ProviderConfig,
  type CachedData,
} from "./providers/base.provider";

export {
  RaydiumProvider,
  type PoolInfo as RaydiumPoolInfo,
  type LiquidityDepth as RaydiumLiquidityDepth,
  type LiquidityChange,
  type LiquidityImbalance,
  type ConcentrationMetrics,
  type TradeFlow,
} from "./providers/raydium.provider";

export * from "./providers/jupiter.provider";
export * from "./providers/metaplex.provider";
export * from "./providers/provider.factory";

// Trading services
export * from "./trading/managed-portfolio-tracker";
export * from "./trading/types";

// Sniping services
export * from "./sniping/managed-token-sniper";
export * from "./sniping/types";

// Liquidity services
export * from "./liquidity/liquidity-analyzer";
export * from "./liquidity/types";

// Detection services
export * from "./detection/token-detector";
