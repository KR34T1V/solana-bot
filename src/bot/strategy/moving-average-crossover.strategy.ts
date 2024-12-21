/**
 * Moving Average Crossover Strategy
 * 
 * This strategy uses two moving averages of different periods to identify trend changes
 * and generate trading signals.
 * 
 * Strengths:
 * - Excellent for identifying and following strong trends
 * - Reduces noise in price action through averaging
 * - Clear, objective entry and exit signals
 * - Works well in markets with clear directional movements
 * 
 * Weaknesses:
 * - Lag in signals due to moving average calculation
 * - Can generate false signals in choppy/sideways markets
 * - May miss sudden price movements due to delayed response
 * - Less effective in highly volatile markets
 * 
 * Optimal Usage:
 * - Best used in trending markets with clear directional movement
 * - More effective on higher timeframes (1h, 4h, daily)
 * - Combine with volume analysis for confirmation
 * - Consider using wider stops to avoid getting shaken out by normal market noise
 * 
 * Parameters:
 * - Short-term MA Period: 10 (faster response, more signals)
 * - Long-term MA Period: 30 (slower response, fewer false signals)
 * 
 * Risk Management:
 * - Use appropriate position sizing (controlled by CONFIG.MAX_TRADE_SIZE_SOL)
 * - Consider implementing trailing stops
 * - Monitor for potential divergences
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class MovingAverageCrossoverStrategy implements TradingStrategy {
  private shortTermPrices: number[] = [];
  private longTermPrices: number[] = [];
  private readonly shortTermPeriod = 10; // 10-period MA
  private readonly longTermPeriod = 30; // 30-period MA

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

    if (this.shortTermPrices.length < this.shortTermPeriod || 
        this.longTermPrices.length < this.longTermPeriod) {
      return decision;
    }

    const shortTermMA = this.calculateMA(this.shortTermPrices);
    const longTermMA = this.calculateMA(this.longTermPrices);
    const previousShortTermMA = this.calculateMA(this.shortTermPrices.slice(0, -1));
    const previousLongTermMA = this.calculateMA(this.longTermPrices.slice(0, -1));

    // Buy when short-term MA crosses above long-term MA
    if (previousShortTermMA <= previousLongTermMA && shortTermMA > longTermMA) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }
    // Sell when short-term MA crosses below long-term MA
    else if (previousShortTermMA >= previousLongTermMA && shortTermMA < longTermMA) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(state.bestBid.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] Moving Average Crossover Signal:
        Short-term MA: ${shortTermMA.toFixed(4)}
        Long-term MA: ${longTermMA.toFixed(4)}
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }

  private updatePrices(currentPrice: number) {
    this.shortTermPrices.push(currentPrice);
    this.longTermPrices.push(currentPrice);

    if (this.shortTermPrices.length > this.shortTermPeriod) {
      this.shortTermPrices.shift();
    }
    if (this.longTermPrices.length > this.longTermPeriod) {
      this.longTermPrices.shift();
    }
  }

  private calculateMA(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }
} 