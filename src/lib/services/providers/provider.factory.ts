/**
 * @file Provider Factory Implementation
 * @version 1.0.0
 * @description Factory for creating and managing market data providers
 */

import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../core/managed-logging";
import type { BaseProvider } from "../../types/provider";
import { JupiterProvider } from "./jupiter.provider";
import { RaydiumProvider } from "./raydium.provider";

export enum ProviderType {
  JUPITER = "jupiter",
  RAYDIUM = "raydium",
}

export class ProviderFactory {
  private static providers = new Map<string, BaseProvider>();

  static getProvider(
    type: ProviderType,
    logger: ManagedLoggingService,
    connection: Connection,
  ): BaseProvider {
    const key = `${type}`;
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: BaseProvider;

    switch (type) {
      case ProviderType.JUPITER:
        provider = new JupiterProvider(
          {
            name: "jupiter-provider",
            version: "1.0.0",
          },
          logger,
          connection,
        );
        break;

      case ProviderType.RAYDIUM:
        provider = new RaydiumProvider(
          {
            name: "raydium-provider",
            version: "1.0.0",
          },
          logger,
          connection,
        );
        break;

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(key, provider);
    return provider;
  }
}
