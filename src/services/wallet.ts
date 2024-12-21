import { Keypair, PublicKey } from '@solana/web3.js';
import { CONFIG, connection } from '../config/config';
import bs58 from 'bs58';

export class WalletService {
  private keypair: Keypair;

  constructor() {
    if (!CONFIG.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY is not set');
    }
    const decodedKey = bs58.decode(CONFIG.PRIVATE_KEY);
    this.keypair = Keypair.fromSecretKey(decodedKey);
  }

  async getBalance(): Promise<number> {
    return await connection.getBalance(this.keypair.publicKey);
  }

  // Add more wallet management functions
} 