import { Keypair, PublicKey } from '@solana/web3.js';
import { CONFIG, connection } from '../config/config';

export class WalletService {
  private keypair: Keypair;

  constructor() {
    this.keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(CONFIG.PRIVATE_KEY))
    );
  }

  async getBalance(): Promise<number> {
    return await connection.getBalance(this.keypair.publicKey);
  }

  // Add more wallet management functions
} 