import { Connection, Cluster } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  CLUSTER: (process.env.SOLANA_CLUSTER as Cluster) || 'mainnet-beta',
  RPC_ENDPOINT: process.env.RPC_ENDPOINT || '',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  MARKET_ADDRESS: process.env.MARKET_ADDRESS || '',
}

export const connection = new Connection(CONFIG.RPC_ENDPOINT); 