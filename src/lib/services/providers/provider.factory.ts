/**
 * @file Market data provider factory
 * @version 1.0.0
 */

import type { BaseProvider } from "$lib/types/provider";
import { JupiterProvider } from "./jupiter.provider";

export enum ProviderType {
  JUPITER = "jupiter",
  // Add more providers as they are implemented
  // BIRDEYE = 'birdeye',
  // RAYDIUM = 'raydium',
}

export class ProviderFactory {
  private static providers: Map<ProviderType, BaseProvider> = new Map();

  static getProvider(type: ProviderType): BaseProvider {
    let provider = this.providers.get(type);

    if (!provider) {
      provider = ProviderFactory.createProvider(type);
      this.providers.set(type, provider);
    }

    return provider;
  }

  private static createProvider(type: ProviderType): BaseProvider {
    switch (type) {
      case ProviderType.JUPITER:
        return new JupiterProvider();
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  // Clear provider instances (useful for testing)
  static clearProviders(): void {
    this.providers.clear();
  }
}
