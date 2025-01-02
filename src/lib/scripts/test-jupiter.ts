/**
 * @file Jupiter Provider Test Script
 * @version 1.0.0
 * @description Test script for Jupiter provider implementation
 */

import { Connection } from "@solana/web3.js";
import { ProviderFactory, ProviderType } from "../services/providers/provider.factory";
import { ManagedLoggingService } from "../services/core/managed-logging";
import type { ManagedProviderBase } from "../services/providers/base.provider";

async function main() {
  const logger = new ManagedLoggingService({
    logDir: "./logs",
    level: "info",
    serviceName: "test-logger",
  });

  await logger.start();

  const connection = new Connection("https://api.mainnet-beta.solana.com");

  const provider = ProviderFactory.getProvider(
    ProviderType.JUPITER,
    logger,
    connection,
  ) as ManagedProviderBase;

  await provider.start();

  try {
    const price = await provider.getPrice("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
    console.log("USDC Price:", price);

    const orderBook = await provider.getOrderBook("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    console.log("USDC Order Book:", orderBook);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await provider.stop();
    await logger.stop();
  }
}

main().catch(console.error);
