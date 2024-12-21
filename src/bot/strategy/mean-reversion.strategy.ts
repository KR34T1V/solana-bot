/**
 * Mean Reversion Strategy
 * 
 * This strategy capitalizes on the tendency of asset prices to return to their
 * statistical mean, trading on significant deviations from this average.
 * 
 * Strengths:
 * - Highly effective in range-bound markets
 * - Based on solid statistical principles
 * - Can identify overbought/oversold conditions
 * - Works well in stable market conditions
 * 
 * Weaknesses:
 * - Can face significant losses in trending markets
 * - May enter positions too early during strong moves
 * - Requires stable market conditions
 * - Less effective during fundamental shifts or news events
 * 
 * Optimal Usage:
 * - Best used in sideways or range-bound markets
 * - More effective on assets with established trading ranges
 * - Combine with volatility analysis
 * - Use with support/resistance levels for better entry/exit
 * 
 * Parameters:
 * - Window Size: 100 periods (for calculating mean and standard deviation)
 * - Deviation Threshold: 2 standard deviations (triggers trades on significant moves)
 * 
 * Risk Management:
 * - Implement hard stop losses for trend protection
 * - Consider market regime before trading
 * - Monitor for fundamental changes that could break the range
 * - Size positions based on deviation magnitude
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class MeanReversionStrategy implements TradingStrategy {
  private prices: number[] = [];
  private readonly windowSize = 100; // Look back period
  private readonly deviationThreshold = 2; // Standard deviations

  analyze(state: MarketState): TradeDecision {
    const decision: TradeDecision = {
      shouldBuy: false,
      shouldSell: false,
    };

    if (!state.bestBid || !state.bestAsk) {
      logger.debug('Insufficient market data for analysis');
      return decision;
    }

    const currentPrice = (state.bestBid.price + state.bestAsk.price) / 2;
    this.updatePrices(currentPrice);

    if (this.prices.length < this.windowSize) {
      return decision;
    }

    const { mean, standardDeviation } = this.calculateStats();
    const zScore = (currentPrice - mean) / standardDeviation;

    // Buy when price is significantly below mean (oversold)
    if (zScore < -this.deviationThreshold) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }
    // Sell when price is significantly above mean (overbought)
    else if (zScore > this.deviationThreshold) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(state.bestBid.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] Mean Reversion Signal:
        Current Price: ${currentPrice.toFixed(4)}
        Mean: ${mean.toFixed(4)}
        Standard Deviation: ${standardDeviation.toFixed(4)}
        Z-Score: ${zScore.toFixed(2)}
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }

  private updatePrices(currentPrice: number) {
    this.prices.push(currentPrice);
    if (this.prices.length > this.windowSize) {
      this.prices.shift();
    }
  }

  private calculateStats() {
    const mean = this.prices.reduce((sum, price) => sum + price, 0) / this.prices.length;
    
    const squaredDiffs = this.prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / this.prices.length;
    const standardDeviation = Math.sqrt(variance);

    return { mean, standardDeviation };
  }
} 