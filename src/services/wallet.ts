import { Keypair, PublicKey } from '@solana/web3.js';
import { CONFIG, connection } from '../config/config';
import { logger } from '../utils/logger';
import bs58 from 'bs58';

export class WalletService {
  private keypair: Keypair;

  constructor() {
    if (!CONFIG.PRIVATE_KEY) {
      logger.error('PRIVATE_KEY is not set in configuration');
      throw new Error('PRIVATE_KEY is not set');
    }
    try {
      const decodedKey = bs58.decode(CONFIG.PRIVATE_KEY);
      this.keypair = Keypair.fromSecretKey(decodedKey);
      logger.info(`Wallet initialized with public key: ${this.keypair.publicKey.toString()}`);
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    try {
      const balance = await connection.getBalance(this.keypair.publicKey);
      logger.debug(`Current wallet balance: ${balance / 1e9} SOL`);
      return balance;
    } catch (error) {
      logger.error('Failed to fetch wallet balance:', error);
      throw error;
    }
  }

  // Add more wallet management functions
} 