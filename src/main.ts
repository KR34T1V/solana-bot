/**
 * @file Main Application Entry Point
 * @version 1.2.0
 * @module src/main
 * @author Development Team
 * @lastModified 2025-01-02
 */

import "reflect-metadata";

// Core exports
export * from "./lib/services/core/service.manager";
export * from "./lib/services/core/managed-logging";
export * from "./lib/services/core/managed-auth";

// Provider exports - explicitly re-export to avoid ambiguity
export {
  ServiceError,
  ManagedProviderBase,
} from "./lib/services/providers/base.provider";

export type {
  BaseProvider,
  ProviderCapabilities,
  PriceData,
  OHLCVData,
  MarketDepth,
} from "./lib/services/providers/base.provider";

export { JupiterProvider } from "./lib/services/providers/jupiter.provider";
export { RaydiumProvider } from "./lib/services/providers/raydium.provider";
export { MetaplexProvider } from "./lib/services/providers/metaplex.provider";
export { ProviderFactory } from "./lib/services/providers/provider.factory";

// Type exports
export type * from "./lib/types/provider";

// Testing utilities
export const TEST_UTILS =
  process.env.NODE_ENV === "development"
    ? {
        framework: require("./lib/services/providers/__tests__/shared/test.framework"),
        assertions: require("./lib/services/providers/__tests__/shared/test.assertions"),
        utils: require("./lib/services/providers/__tests__/shared/test.utils"),
      }
    : undefined;
