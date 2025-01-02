/**
 * @file TypeScript type definitions and interfaces
 * @version 1.0.0
 * @module lib/types/token
 * @author Development Team
 * @lastModified 2025-01-02
 */

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  extensions?: Record<string, unknown>;
}

export interface TokenPair {
  inputMint: string;
  outputMint: string;
}

export interface TokenAmount {
  mint: string;
  amount: number;
  decimals: number;
}

export interface TokenPrice {
  mint: string;
  value: number;
  decimals: number;
  timestamp: number;
}
