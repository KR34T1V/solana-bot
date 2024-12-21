import { WalletServiceInterface } from '../bot/trading-bot';
import { logger } from '../utils/logger';

interface Trade {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
}

interface Position {
  amount: number;
  averagePrice: number;
}

export class BacktestWalletService implements WalletServiceInterface {
  private initialBalance: number;
  private balance: number;
  private trades: Trade[];
  private position: Position;
  private startTime: Date;

  constructor(initialBalanceSOL: number) {
    this.initialBalance = initialBalanceSOL;
    this.balance = initialBalanceSOL;
    this.trades = [];
    this.position = { amount: 0, averagePrice: 0 };
    this.startTime = new Date();
  }

  async getBalance(): Promise<number> {
    return this.balance * 1e9; // Convert SOL to lamports
  }

  async executeTrade(type: 'buy' | 'sell', amountSOL: number, price: number): Promise<boolean> {
    const totalCost = amountSOL * price;

    if (type === 'buy') {
      if (this.balance < totalCost) {
        logger.warn(`[BACKTEST] Insufficient balance for buy: ${this.balance} SOL < ${totalCost} SOL`);
        return false;
      }
      this.balance -= totalCost;
      this.updatePosition('buy', amountSOL, price);
    } else {
      this.balance += totalCost;
      this.updatePosition('sell', amountSOL, price);
    }

    const trade: Trade = {
      type,
      amount: amountSOL,
      price,
      timestamp: new Date(),
    };
    this.trades.push(trade);

    logger.info(`[BACKTEST] ${type.toUpperCase()} executed: ${amountSOL} SOL at ${price} SOL`);
    logger.info(`[BACKTEST] New balance: ${this.balance.toFixed(4)} SOL`);
    logger.info(`[BACKTEST] Current position: ${this.position.amount} SOL @ ${this.position.averagePrice} SOL`);

    return true;
  }

  private updatePosition(type: 'buy' | 'sell', amount: number, price: number) {
    if (type === 'buy') {
      const newAmount = this.position.amount + amount;
      const newCost = this.position.amount * this.position.averagePrice + amount * price;
      this.position = {
        amount: newAmount,
        averagePrice: newCost / newAmount,
      };
    } else {
      this.position.amount -= amount;
      if (this.position.amount <= 0) {
        this.position = { amount: 0, averagePrice: 0 };
      }
    }
  }

  getTradeHistory(): Trade[] {
    return [...this.trades];
  }

  getPnL(): { totalPnL: number; percentagePnL: number } {
    const currentValue = this.balance + (this.position.amount * this.position.averagePrice);
    const totalPnL = currentValue - this.initialBalance;
    const percentagePnL = (totalPnL / this.initialBalance) * 100;

    return {
      totalPnL,
      percentagePnL,
    };
  }

  getMetrics() {
    const trades = this.trades;
    const winningTrades = trades.filter(t => t.type === 'sell' && t.price > this.position.averagePrice);
    const losingTrades = trades.filter(t => t.type === 'sell' && t.price < this.position.averagePrice);
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winningTrades.length / (winningTrades.length + losingTrades.length) * 100,
      averagePosition: this.position.averagePrice,
      currentPosition: this.position.amount,
      ...this.getPnL(),
    };
  }
} 