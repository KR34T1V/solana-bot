/**
 * @file Test script for Jupiter provider
 * @version 1.0.0
 */

import { JupiterProvider } from "../services/providers/jupiter.provider";
import { logger } from "../services/logging.service";

async function main() {
  const provider = new JupiterProvider();

  // Common token mints for testing
  const tokens = {
    SOL: "So11111111111111111111111111111111111111112",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  };

  for (const [symbol, mint] of Object.entries(tokens)) {
    try {
      logger.info(`Fetching ${symbol} price...`, { symbol, mint });
      const price = await provider.getPrice(mint);
      logger.info(`${symbol} Price:`, { symbol, mint, ...price });
    } catch (error) {
      logger.error(`Error fetching ${symbol} price:`, {
        symbol,
        mint,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

main().catch((error) => {
  logger.error("Script failed:", {
    error: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});
