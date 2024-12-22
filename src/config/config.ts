import pkg from '@solana/web3.js';
const { Connection } = pkg;
import type { Cluster } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  CLUSTER: (process.env.SOLANA_CLUSTER as Cluster) || 'mainnet-beta',
  RPC_ENDPOINT: process.env.RPC_ENDPOINT || '',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  MARKET_ADDRESS: process.env.MARKET_ADDRESS || '',
  
  // Trading parameters
  DRY_RUN: process.env.DRY_RUN === 'true',
  MIN_SPREAD_PERCENTAGE: parseFloat(process.env.MIN_SPREAD_PERCENTAGE || '1.5'),
  MAX_TRADE_SIZE_SOL: parseFloat(process.env.MAX_TRADE_SIZE_SOL || '1.0'),
  MIN_SOL_BALANCE: parseFloat(process.env.MIN_SOL_BALANCE || '0.1'),
  
  // Dry run parameters
  DRY_RUN_INITIAL_SOL: parseFloat(process.env.DRY_RUN_INITIAL_SOL || '10.0'),
}

if (!CONFIG.RPC_ENDPOINT) {
  throw new Error('RPC_ENDPOINT is not set');
}

export const connection = new Connection(CONFIG.RPC_ENDPOINT); 
