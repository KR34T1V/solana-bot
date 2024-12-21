/**
 * Momentum Strategy with RSI
 * 
 * This strategy combines momentum analysis with RSI (Relative Strength Index) to identify
 * and trade strong market moves while avoiding overbought/oversold conditions.
 * 
 * Strengths:
 * - Excellent at capturing strong market moves
 * - Combines trend and momentum indicators
 * - Helps avoid false signals through RSI filter
 * - Good for volatile markets with clear direction
 * 
 * Weaknesses:
 * - Can be late to enter strong moves
 * - May miss opportunities waiting for confirmation
 * - Less effective in choppy markets
 * - Can give false signals during range-bound periods
 * 
 * Optimal Usage:
 * - Best used in volatile markets with clear trends
 * - More effective during high-volume periods
 * - Combine with volume analysis for confirmation
 * - Use multiple timeframes for trend alignment
 * 
 * Parameters:
 * - RSI Period: 14 (standard setting)
 * - RSI Overbought: 70
 * - RSI Oversold: 30
 * - Momentum Period: 10 (for calculating price momentum)
 * 
 * Risk Management:
 * - Use trailing stops to protect profits
 * - Consider volatility when sizing positions
 * - Monitor for divergences between price and RSI
 * - Be cautious of counter-trend signals
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class MomentumStrategy implements TradingStrategy {
  private prices: number[] = [];
  private readonly rsiPeriod = 14;
  private readonly rsiOverbought = 70;
  private readonly rsiOversold = 30;
  private readonly momentumPeriod = 10;

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

    if (this.prices.length < Math.max(this.rsiPeriod, this.momentumPeriod)) {
      return decision;
    }

    const rsi = this.calculateRSI();
    const momentum = this.calculateMomentum();
    const momentumThreshold = 0.5; // 0.5% price change

    // Buy when RSI is oversold and momentum is positive
    if (rsi < this.rsiOversold && momentum > momentumThreshold) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }
    // Sell when RSI is overbought and momentum is negative
    else if (rsi > this.rsiOverbought && momentum < -momentumThreshold) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(state.bestBid.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] Momentum Signal:
        Current Price: ${currentPrice.toFixed(4)}
        RSI: ${rsi.toFixed(2)}
        Momentum: ${momentum.toFixed(2)}%
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }

  private updatePrices(currentPrice: number) {
    this.prices.push(currentPrice);
    if (this.prices.length > Math.max(this.rsiPeriod, this.momentumPeriod)) {
      this.prices.shift();
    }
  }

  private calculateRSI(): number {
    const changes = [];
    for (let i = 1; i < this.prices.length; i++) {
      changes.push(this.prices[i] - this.prices[i - 1]);
    }

    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);

    const avgGain = gains.slice(-this.rsiPeriod).reduce((sum, gain) => sum + gain, 0) / this.rsiPeriod;
    const avgLoss = losses.slice(-this.rsiPeriod).reduce((sum, loss) => sum + loss, 0) / this.rsiPeriod;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMomentum(): number {
    const currentPrice = this.prices[this.prices.length - 1];
    const pastPrice = this.prices[this.prices.length - this.momentumPeriod];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }
} 