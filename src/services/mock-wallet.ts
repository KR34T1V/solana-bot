import { Keypair } from '@solana/web3.js';
import { logger } from '../utils/logger';

export class MockWalletService {
  private balance: number;
  private trades: Array<{ type: 'buy' | 'sell'; amount: number; price: number; timestamp: Date }>;
  private keypair: Keypair;

  constructor(initialBalanceSOL: number) {
    this.balance = initialBalanceSOL;
    this.trades = [];
    this.keypair = Keypair.generate(); // Generate a fake keypair for testing
  }

  async getBalance(): Promise<number> {
    return this.balance * 1e9; // Convert SOL to lamports
  }

  async executeTrade(type: 'buy' | 'sell', amountSOL: number, price: number): Promise<boolean> {
    const totalCost = amountSOL * price;

    if (type === 'buy') {
      if (this.balance < totalCost) {
        logger.warn(`[DRY RUN] Insufficient balance for buy: ${this.balance} SOL < ${totalCost} SOL`);
        return false;
      }
      this.balance -= totalCost;
    } else {
      this.balance += totalCost;
    }

    this.trades.push({
      type,
      amount: amountSOL,
      price,
      timestamp: new Date(),
    });

    logger.info(`[DRY RUN] ${type.toUpperCase()} executed: ${amountSOL} SOL at ${price} SOL`);
    logger.info(`[DRY RUN] New balance: ${this.balance.toFixed(4)} SOL`);

    return true;
  }

  getTradeHistory(): Array<{ type: 'buy' | 'sell'; amount: number; price: number; timestamp: Date }> {
    return [...this.trades];
  }

  getPnL(): { totalPnL: number; percentagePnL: number } {
    const initialBalance = this.trades.length > 0 ? 
      this.trades[0].price * this.trades[0].amount : 
      this.balance;
    
    const currentBalance = this.balance;
    const totalPnL = currentBalance - initialBalance;
    const percentagePnL = (totalPnL / initialBalance) * 100;

    return {
      totalPnL,
      percentagePnL,
    };
  }
} 