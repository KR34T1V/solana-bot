/**
 * Volume-Weighted Average Price (VWAP) Strategy
 * 
 * This strategy uses VWAP as a reference point to identify potential buying and selling
 * opportunities based on price deviations from the average.
 * 
 * Strengths:
 * - Incorporates both price and volume data
 * - Excellent for identifying fair value and price extremes
 * - Popular among institutional traders, making it a reliable indicator
 * - Good for intraday trading and mean reversion
 * 
 * Weaknesses:
 * - Less effective in trending markets
 * - May not capture sudden market shifts
 * - Requires significant volume data for accuracy
 * - Can be less reliable during low-volume periods
 * 
 * Optimal Usage:
 * - Best used in liquid markets with consistent volume
 * - Most effective during regular trading hours
 * - Combine with trend indicators for better context
 * - Use multiple timeframe analysis for confirmation
 * 
 * Parameters:
 * - Period: 24 hours (rolling window)
 * - Deviation Threshold: 1.5% (triggers trades when price deviates significantly)
 * 
 * Risk Management:
 * - Use tighter stops during high-volatility periods
 * - Monitor volume for signal validation
 * - Consider reducing position size during pre/post market hours
 * - Avoid trading when volume is significantly below average
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

interface VWAPDataPoint {
  price: number;
  volume: number;
  timestamp: number;
}

export class VWAPStrategy implements TradingStrategy {
  private vwapData: VWAPDataPoint[] = [];
  private readonly periodMs = 24 * 60 * 60 * 1000; // 24 hours

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
    const currentVolume = (state.bestBid.size + state.bestAsk.size) / 2;
    const now = Date.now();

    this.updateVWAPData({
      price: currentPrice,
      volume: currentVolume,
      timestamp: now
    });

    const vwap = this.calculateVWAP();
    if (!vwap) return decision;

    const deviation = (currentPrice - vwap) / vwap * 100;
    const deviationThreshold = 1.5; // 1.5% deviation threshold

    // Buy when price is significantly below VWAP
    if (deviation < -deviationThreshold) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }
    // Sell when price is significantly above VWAP
    else if (deviation > deviationThreshold) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(state.bestBid.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] VWAP Signal:
        Current Price: ${currentPrice.toFixed(4)}
        VWAP: ${vwap.toFixed(4)}
        Deviation: ${deviation.toFixed(2)}%
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }

  private updateVWAPData(dataPoint: VWAPDataPoint) {
    const cutoffTime = Date.now() - this.periodMs;
    this.vwapData = [...this.vwapData.filter(d => d.timestamp > cutoffTime), dataPoint];
  }

  private calculateVWAP(): number | null {
    if (this.vwapData.length === 0) return null;

    let sumPriceVolume = 0;
    let sumVolume = 0;

    for (const data of this.vwapData) {
      sumPriceVolume += data.price * data.volume;
      sumVolume += data.volume;
    }

    return sumVolume === 0 ? null : sumPriceVolume / sumVolume;
  }
} 