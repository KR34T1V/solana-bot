/**
 * @file Tests for provider factory
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderFactory, ProviderType } from "../provider.factory";
import { JupiterProvider } from "../jupiter.provider";

describe("ProviderFactory", () => {
  beforeEach(() => {
    ProviderFactory.clearProviders();
  });

  it("should create Jupiter provider", () => {
    const provider = ProviderFactory.getProvider(ProviderType.JUPITER);
    expect(provider).toBeInstanceOf(JupiterProvider);
  });

  it("should reuse existing provider instance", () => {
    const provider1 = ProviderFactory.getProvider(ProviderType.JUPITER);
    const provider2 = ProviderFactory.getProvider(ProviderType.JUPITER);
    expect(provider1).toBe(provider2);
  });

  it("should throw error for unsupported provider type", () => {
    // @ts-expect-error Testing invalid provider type
    expect(() => ProviderFactory.getProvider("invalid")).toThrow(
      "Unsupported provider type: invalid",
    );
  });

  it("should clear providers", () => {
    const provider1 = ProviderFactory.getProvider(ProviderType.JUPITER);
    ProviderFactory.clearProviders();
    const provider2 = ProviderFactory.getProvider(ProviderType.JUPITER);
    expect(provider1).not.toBe(provider2);
  });
});
