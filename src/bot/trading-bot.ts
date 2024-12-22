import { CONFIG } from '../config/config';
import type { WalletService } from '../services/wallet';
import type { MockWalletService } from '../services/mock-wallet';
import type { MarketService } from '../services/market';
import { logger } from '../utils/logger';
import type { TradingStrategy } from './trading-strategy';

export interface WalletServiceInterface {
  getBalance(): Promise<number>;
  executeTrade?(type: 'buy' | 'sell', amountSOL: number, price: number): Promise<boolean>;
  getPnL?(): { totalPnL: number; percentagePnL: number };
  getTradeHistory?(): Array<{ type: 'buy' | 'sell'; amount: number; price: number; timestamp: Date }>;
}

export interface MarketServiceInterface {
  initialize(marketAddress: string): Promise<void>;
  getOrderBook(): Promise<any>;
  getBestOrders(): Promise<{ bestBid: { price: number; size: number; } | null; bestAsk: { price: number; size: number; } | null; }>;
}

export class TradingBot {
  private isRunning: boolean;
  private errorCount: number;
  private readonly maxErrors: number = 3;
  private readonly errorRetryDelay: number = 5000;

  constructor(
    private readonly walletService: WalletServiceInterface,
    private readonly marketService: MarketServiceInterface,
    private readonly strategy: TradingStrategy
  ) {
    this.isRunning = false;
    this.errorCount = 0;
  }

  async initialize() {
    try {
      // Validate services
      if (!this.walletService) {
        throw new Error('Wallet service is required');
      }
      if (!this.marketService) {
        throw new Error('Market service is required');
      }
      if (!this.strategy) {
        throw new Error('Trading strategy is required');
      }

      // Check wallet balance
      let balance: number;
      try {
        balance = await this.walletService.getBalance();
        logger.info('Wallet balance', {
          balance: balance / 1e9,
          component: 'TradingBot'
        });
      } catch (err) {
        logger.error('Failed to get wallet balance', {
          error: err instanceof Error ? err : new Error(String(err)),
          component: 'TradingBot'
        });
        throw new Error('Failed to get wallet balance: ' + (err instanceof Error ? err.message : String(err)));
      }

      if (balance / 1e9 < CONFIG.MIN_SOL_BALANCE) {
        const error = new Error(`Insufficient balance. Minimum required: ${CONFIG.MIN_SOL_BALANCE} SOL`);
        logger.error('Insufficient balance', {
          balance: balance / 1e9,
          required: CONFIG.MIN_SOL_BALANCE,
          component: 'TradingBot'
        });
        throw error;
      }

      // Initialize market
      try {
        await this.marketService.initialize(CONFIG.MARKET_ADDRESS);
        logger.info('Market initialized successfully', {
          marketAddress: CONFIG.MARKET_ADDRESS,
          component: 'TradingBot'
        });
      } catch (err) {
        logger.error('Failed to initialize market', {
          error: err instanceof Error ? err : new Error(String(err)),
          marketAddress: CONFIG.MARKET_ADDRESS,
          component: 'TradingBot'
        });
        throw new Error('Failed to initialize market: ' + (err instanceof Error ? err.message : String(err)));
      }
      
      if (CONFIG.DRY_RUN) {
        logger.info('Running in DRY RUN mode', {
          initialBalance: CONFIG.DRY_RUN_INITIAL_SOL,
          component: 'TradingBot'
        });
      }

      // Start trading loop
      await this.startTradingLoop();
    } catch (err) {
      logger.error('Failed to initialize trading bot', {
        error: err instanceof Error ? err : new Error(String(err)),
        component: 'TradingBot'
      });
      throw err;
    }
  }

  private async startTradingLoop() {
    logger.info('Starting trading loop', {
      component: 'TradingBot'
    });
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Get current market state
        const { bestBid, bestAsk } = await this.marketService.getBestOrders();
        
        if (!bestBid || !bestAsk) {
          logger.warn('Invalid market state', {
            bestBid,
            bestAsk,
            component: 'TradingBot'
          });
          continue;
        }

        // Analyze market and get trading decision
        const decision = this.strategy.analyze({ bestBid, bestAsk });

        if (decision.shouldBuy || decision.shouldSell) {
          const executeTrade = this.walletService.executeTrade;
          if (CONFIG.DRY_RUN && executeTrade) {
            try {
              if (decision.shouldBuy && decision.buyPrice && decision.tradeSize) {
                await executeTrade('buy', decision.tradeSize, decision.buyPrice);
                logger.info('Buy order executed', {
                  size: decision.tradeSize,
                  price: decision.buyPrice,
                  component: 'TradingBot'
                });
              }
              if (decision.shouldSell && decision.sellPrice && decision.tradeSize) {
                await executeTrade('sell', decision.tradeSize, decision.sellPrice);
                logger.info('Sell order executed', {
                  size: decision.tradeSize,
                  price: decision.sellPrice,
                  component: 'TradingBot'
                });
              }

              // Log PnL information if available
              const getPnL = this.walletService.getPnL;
              if (getPnL) {
                const { totalPnL, percentagePnL } = getPnL();
                logger.info('Current PnL', {
                  totalPnL: totalPnL.toFixed(4),
                  percentagePnL: percentagePnL.toFixed(2),
                  component: 'TradingBot'
                });
              }
            } catch (err) {
              logger.error('Failed to execute trade', {
                error: err instanceof Error ? err : new Error(String(err)),
                decision,
                component: 'TradingBot'
              });
            }
          } else {
            logger.info('Order placement not implemented', {
              component: 'TradingBot'
            });
          }
        } else {
          logger.debug('No trading opportunity found', {
            component: 'TradingBot'
          });
        }

        // Reset error count on successful iteration
        this.errorCount = 0;

        // Add delay to prevent too frequent requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        this.errorCount++;
        logger.error('Error in trading loop', {
          error: err instanceof Error ? err : new Error(String(err)),
          errorCount: this.errorCount,
          maxErrors: this.maxErrors,
          component: 'TradingBot'
        });

        if (this.errorCount >= this.maxErrors) {
          logger.error('Max errors reached, stopping bot', {
            errorCount: this.errorCount,
            component: 'TradingBot'
          });
          this.stop();
          throw new Error('Max errors reached in trading loop');
        }

        // Add delay before retrying on error
        await new Promise(resolve => setTimeout(resolve, this.errorRetryDelay));
      }
    }
  }

  public stop() {
    this.isRunning = false;
    logger.info('Stopping trading bot', {
      component: 'TradingBot'
    });

    const getPnL = this.walletService.getPnL;
    const getTradeHistory = this.walletService.getTradeHistory;
    
    if (CONFIG.DRY_RUN && getPnL && getTradeHistory) {
      const { totalPnL, percentagePnL } = getPnL();
      const tradeHistory = getTradeHistory();

      logger.info('Trading session summary', {
        totalPnL: totalPnL.toFixed(4),
        percentagePnL: percentagePnL.toFixed(2),
        trades: tradeHistory.length,
        component: 'TradingBot'
      });

      logger.debug('Trade history', {
        history: tradeHistory,
        component: 'TradingBot'
      });
    }
  }
} 