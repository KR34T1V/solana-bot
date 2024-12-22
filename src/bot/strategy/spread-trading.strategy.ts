import { logger } from '../../utils/logger';
import { CONFIG } from '../../config/config';
import type { MarketState, TradeDecision, TradingStrategy } from './types';

export class SpreadTradingStrategy implements TradingStrategy {
  analyze(state: MarketState): TradeDecision {
    try {
      const decision: TradeDecision = {
        shouldBuy: false,
        shouldSell: false,
      };

      // Validate market state
      if (!state) {
        logger.error('Invalid market state', {
          state,
          component: 'SpreadTradingStrategy'
        });
        return decision;
      }

      if (!state.bestBid || !state.bestAsk) {
        logger.debug('Insufficient market data', {
          bestBid: state.bestBid,
          bestAsk: state.bestAsk,
          component: 'SpreadTradingStrategy'
        });
        return decision;
      }

      // Validate prices
      if (state.bestBid.price <= 0 || state.bestAsk.price <= 0) {
        logger.error('Invalid prices', {
          bestBid: state.bestBid.price,
          bestAsk: state.bestAsk.price,
          component: 'SpreadTradingStrategy'
        });
        return decision;
      }

      // Validate sizes
      if (state.bestBid.size <= 0 || state.bestAsk.size <= 0) {
        logger.error('Invalid sizes', {
          bestBidSize: state.bestBid.size,
          bestAskSize: state.bestAsk.size,
          component: 'SpreadTradingStrategy'
        });
        return decision;
      }

      // Calculate spread
      const spread = state.bestAsk.price - state.bestBid.price;
      const spreadPercentage = (spread / state.bestBid.price) * 100;

      logger.debug('Market analysis', {
        spread,
        spreadPercentage,
        minSpreadRequired: CONFIG.MIN_SPREAD_PERCENTAGE,
        component: 'SpreadTradingStrategy'
      });

      if (spreadPercentage >= CONFIG.MIN_SPREAD_PERCENTAGE) {
        try {
          // Calculate trade parameters
          const buyPrice = state.bestBid.price * 1.001; // 0.1% above best bid
          const sellPrice = state.bestAsk.price * 0.999; // 0.1% below best ask
          const tradeSize = Math.min(
            state.bestBid.size,
            state.bestAsk.size,
            CONFIG.MAX_TRADE_SIZE_SOL
          );

          // Validate trade parameters
          if (buyPrice >= sellPrice) {
            logger.warn('Invalid trade prices', {
              buyPrice,
              sellPrice,
              component: 'SpreadTradingStrategy'
            });
            return decision;
          }

          if (tradeSize <= 0 || tradeSize > CONFIG.MAX_TRADE_SIZE_SOL) {
            logger.warn('Invalid trade size', {
              tradeSize,
              maxSize: CONFIG.MAX_TRADE_SIZE_SOL,
              component: 'SpreadTradingStrategy'
            });
            return decision;
          }

          // Set trade decision
          decision.shouldBuy = true;
          decision.shouldSell = true;
          decision.buyPrice = buyPrice;
          decision.sellPrice = sellPrice;
          decision.tradeSize = tradeSize;

          const expectedProfit = (sellPrice - buyPrice) * tradeSize;
          logger.info('Trade opportunity found', {
            buyPrice,
            sellPrice,
            tradeSize,
            expectedProfit: expectedProfit.toFixed(4),
            spreadPercentage: spreadPercentage.toFixed(2),
            component: 'SpreadTradingStrategy'
          });
        } catch (err) {
          logger.error('Failed to calculate trade parameters', {
            error: err instanceof Error ? err : new Error(String(err)),
            spread,
            spreadPercentage,
            component: 'SpreadTradingStrategy'
          });
          return decision;
        }
      } else {
        logger.debug('Spread too small', {
          spreadPercentage,
          minRequired: CONFIG.MIN_SPREAD_PERCENTAGE,
          component: 'SpreadTradingStrategy'
        });
      }

      return decision;
    } catch (err) {
      logger.error('Strategy analysis failed', {
        error: err instanceof Error ? err : new Error(String(err)),
        state,
        component: 'SpreadTradingStrategy'
      });
      return {
        shouldBuy: false,
        shouldSell: false
      };
    }
  }
} 