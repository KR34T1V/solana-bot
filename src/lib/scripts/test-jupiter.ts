/**
 * @file Test script for Jupiter DEX integration
 * @version 1.0.0
 * @module lib/scripts/test-jupiter
 * @author Development Team
 * @lastModified 2024-01-02
 */

import { Connection } from "@solana/web3.js";
import {
  ProviderFactory,
  ProviderType,
} from "$lib/services/providers/provider.factory";
import { ManagedLoggingService } from "$lib/services/core/managed-logging";
import type { ManagedProviderBase } from "$lib/services/providers/base.provider";

/**
 * @function main
 * @description Main entry point for testing Jupiter DEX integration
 *
 * @returns {Promise<void>} Resolves when test is complete
 * @throws {Error} If any Jupiter operations fail
 */
async function main(): Promise<void> {
  const logger = new ManagedLoggingService({
    logDir: "./logs",
    level: "debug",
    serviceName: "jupiter-test",
  });

  await logger.start();

  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const provider = ProviderFactory.getProvider(
    ProviderType.JUPITER,
    logger,
    connection,
  ) as ManagedProviderBase;

  try {
    await provider.start();

    // Test USDC price and order book
    const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const price = await provider.getPrice(usdcMint);
    console.log("USDC Price:", price);

    const orderBook = await provider.getOrderBook(usdcMint);
    console.log("USDC Order Book:", orderBook);
  } finally {
    await provider.stop();
    await logger.stop();
  }
}

main().catch(console.error);
