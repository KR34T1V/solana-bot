/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/providers/provider.factory
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../core/managed-logging";
import type { BaseProvider } from "../../types/provider";
import { JupiterProvider } from "./jupiter.provider";
import { RaydiumProvider } from "./raydium.provider";
import { MetaplexProvider } from "./metaplex.provider";

export enum ProviderType {
  JUPITER = "jupiter",
  RAYDIUM = "raydium",
  METAPLEX = "metaplex",
}

export interface ProviderConfig {
  name: string;
  version: string;
  rpcEndpoint?: string;
  metaplexEndpoint?: string;
  apiKeys?: {
    birdeye?: string;
    dexscreener?: string;
  };
}

export class ProviderFactory {
  private static providers = new Map<string, BaseProvider>();
  private static metaplexConnection: Connection;

  static initialize(config: ProviderConfig, connection: Connection) {
    this.metaplexConnection = connection;
  }

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

      case ProviderType.METAPLEX:
        provider = new MetaplexProvider(
          {
            name: "metaplex-provider",
            version: "1.0.0",
          },
          logger,
          this.metaplexConnection || connection,
        );
        break;

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(key, provider);
    return provider;
  }

  static clearProviders(): void {
    this.providers.clear();
  }
}
