/**
 * Volume-Enhanced Moving Average Strategy
 * 
 * This strategy combines moving average crossovers with volume analysis to generate
 * stronger, more reliable trading signals. It requires both price and volume
 * conditions to be met before entering trades.
 * 
 * Strengths:
 * - More reliable signals than simple MA crossovers
 * - Volume confirmation reduces false breakouts
 * - Can identify strong trend initiations
 * - Better at filtering out market noise
 * 
 * Weaknesses:
 * - May miss some opportunities waiting for volume confirmation
 * - More complex logic can lead to delayed entries
 * - Still susceptible to whipsaws in highly volatile markets
 * - Requires more data points for analysis
 * 
 * Optimal Usage:
 * - Best in trending markets with good volume
 * - Use during regular market hours
 * - More effective on higher timeframes (1h+)
 * - Combine with support/resistance levels
 * 
 * Parameters:
 * - Short MA: 10 periods
 * - Long MA: 30 periods
 * - Volume MA: 20 periods
 * - Volume Threshold: 1.5 (minimum volume increase for confirmation)
 * 
 * Risk Management:
 * - Use wider stops due to volume volatility
 * - Scale position sizes based on volume strength
 * - Consider reducing size in pre/post market
 * - Monitor for divergences between price and volume
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class VolumeEnhancedMAStrategy implements TradingStrategy {
  private prices: number[] = [];
  private volumes: number[] = [];
  private readonly shortMAPeriod = 10;
  private readonly longMAPeriod = 30;
  private readonly volumeMAPeriod = 20;
  private readonly volumeThreshold = 1.5; // Volume should be 50% above average

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

    this.updateData(currentPrice, currentVolume);

    if (this.prices.length < Math.max(this.shortMAPeriod, this.longMAPeriod, this.volumeMAPeriod)) {
      return decision;
    }

    // Calculate moving averages
    const shortMA = this.calculateMA(this.prices.slice(-this.shortMAPeriod));
    const longMA = this.calculateMA(this.prices.slice(-this.longMAPeriod));
    const volumeMA = this.calculateMA(this.volumes.slice(-this.volumeMAPeriod));

    // Calculate previous moving averages for crossover detection
    const prevShortMA = this.calculateMA(this.prices.slice(-this.shortMAPeriod - 1, -1));
    const prevLongMA = this.calculateMA(this.prices.slice(-this.longMAPeriod - 1, -1));

    // Check volume condition
    const isHighVolume = currentVolume > volumeMA * this.volumeThreshold;

    // Buy when short MA crosses above long MA with high volume
    if (prevShortMA <= prevLongMA && shortMA > longMA && isHighVolume) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(
        state.bestAsk.size,
        CONFIG.MAX_TRADE_SIZE_SOL * (currentVolume / volumeMA) // Scale position size with volume
      );
    }
    // Sell when short MA crosses below long MA with high volume
    else if (prevShortMA >= prevLongMA && shortMA < longMA && isHighVolume) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(
        state.bestBid.size,
        CONFIG.MAX_TRADE_SIZE_SOL * (currentVolume / volumeMA) // Scale position size with volume
      );
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] Volume-Enhanced MA Signal:
        Short MA: ${shortMA.toFixed(4)}
        Long MA: ${longMA.toFixed(4)}
        Current Volume: ${currentVolume.toFixed(4)}
        Volume MA: ${volumeMA.toFixed(4)}
        Volume Ratio: ${(currentVolume / volumeMA).toFixed(2)}
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }

  private updateData(price: number, volume: number) {
    this.prices.push(price);
    this.volumes.push(volume);

    const maxPeriod = Math.max(this.shortMAPeriod, this.longMAPeriod, this.volumeMAPeriod);
    
    if (this.prices.length > maxPeriod) {
      this.prices.shift();
    }
    if (this.volumes.length > maxPeriod) {
      this.volumes.shift();
    }
  }

  private calculateMA(data: number[]): number {
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  }
} 