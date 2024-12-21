import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import { MarketState, TradeDecision, TradingStrategy } from './types';

export class SpreadTradingStrategy implements TradingStrategy {
  analyze(state: MarketState): TradeDecision {
    const decision: TradeDecision = {
      shouldBuy: false,
      shouldSell: false,
    };

    if (!state.bestBid || !state.bestAsk) {
      logger.debug('Insufficient market data for analysis');
      return decision;
    }

    const spread = state.bestAsk.price - state.bestBid.price;
    const spreadPercentage = (spread / state.bestBid.price) * 100;

    if (spreadPercentage >= CONFIG.MIN_SPREAD_PERCENTAGE) {
      // In a real strategy, you might want to place orders slightly better than best bid/ask
      const buyPrice = state.bestBid.price * 1.001; // 0.1% above best bid
      const sellPrice = state.bestAsk.price * 0.999; // 0.1% below best ask
      const tradeSize = Math.min(state.bestBid.size, state.bestAsk.size, CONFIG.MAX_TRADE_SIZE_SOL);

      decision.shouldBuy = true;
      decision.shouldSell = true;
      decision.buyPrice = buyPrice;
      decision.sellPrice = sellPrice;
      decision.tradeSize = tradeSize;

      if (CONFIG.DRY_RUN) {
        logger.info(`[DRY RUN] Would place orders:
          Buy: ${tradeSize} SOL at ${buyPrice}
          Sell: ${tradeSize} SOL at ${sellPrice}
          Expected profit: ${((sellPrice - buyPrice) * tradeSize).toFixed(4)} SOL`);
      }
    }

    return decision;
  }
} 