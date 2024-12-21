/**
 * Order Book Imbalance Strategy
 * 
 * This strategy analyzes the order book to identify significant imbalances between
 * buying and selling pressure, potentially predicting short-term price movements.
 * 
 * Strengths:
 * - Can predict short-term price movements
 * - Based on actual market supply/demand
 * - Quick to respond to market changes
 * - Effective in liquid markets
 * 
 * Weaknesses:
 * - Susceptible to order book manipulation
 * - May not capture hidden liquidity
 * - Less effective in thin markets
 * - Can generate false signals during rapid order book changes
 * 
 * Optimal Usage:
 * - Best used in highly liquid markets
 * - More effective during active trading hours
 * - Combine with price action analysis
 * - Use multiple order book levels for confirmation
 * 
 * Parameters:
 * - Imbalance Threshold: 2.0 (ratio between bid and ask sizes)
 * - Price Impact Threshold: 0.5% (maximum acceptable spread)
 * 
 * Risk Management:
 * - Use tight stops due to short-term nature
 * - Monitor for large hidden orders
 * - Be cautious during news events
 * - Consider reducing size in low liquidity periods
 */

import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class OrderBookImbalanceStrategy implements TradingStrategy {
  private readonly imbalanceThreshold = 2.0; // Ratio threshold for imbalance
  private readonly priceImpactThreshold = 0.5; // 0.5% price impact threshold

  analyze(state: MarketState): TradeDecision {
    const decision: TradeDecision = {
      shouldBuy: false,
      shouldSell: false,
    };

    if (!state.bestBid || !state.bestAsk) {
      logger.debug('Insufficient market data for analysis');
      return decision;
    }

    // Calculate order book imbalance ratio (bid size / ask size)
    const imbalanceRatio = state.bestBid.size / state.bestAsk.size;
    
    // Calculate price impact as spread percentage
    const spread = state.bestAsk.price - state.bestBid.price;
    const priceImpact = (spread / state.bestBid.price) * 100;

    // Buy when there's strong buying pressure (high bid/ask ratio) and reasonable spread
    if (imbalanceRatio > this.imbalanceThreshold && priceImpact < this.priceImpactThreshold) {
      decision.shouldBuy = true;
      decision.buyPrice = state.bestAsk.price;
      decision.tradeSize = Math.min(state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }
    // Sell when there's strong selling pressure (low bid/ask ratio) and reasonable spread
    else if (imbalanceRatio < 1 / this.imbalanceThreshold && priceImpact < this.priceImpactThreshold) {
      decision.shouldSell = true;
      decision.sellPrice = state.bestBid.price;
      decision.tradeSize = Math.min(state.bestBid.size, CONFIG.MAX_TRADE_SIZE_SOL);
    }

    if ((decision.shouldBuy || decision.shouldSell) && CONFIG.DRY_RUN) {
      logger.info(`[DRY RUN] Order Book Imbalance Signal:
        Imbalance Ratio: ${imbalanceRatio.toFixed(2)}
        Price Impact: ${priceImpact.toFixed(2)}%
        Best Bid Size: ${state.bestBid.size} SOL
        Best Ask Size: ${state.bestAsk.size} SOL
        Action: ${decision.shouldBuy ? 'BUY' : 'SELL'}
        Price: ${decision.shouldBuy ? decision.buyPrice : decision.sellPrice}
        Size: ${decision.tradeSize} SOL`);
    }

    return decision;
  }
} 