/**
 * @file Test Utilities
 * @version 1.2.0
 * @module lib/services/providers/__tests__/shared/test.utils
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { ManagedLoggingService } from "../../../core/managed-logging";
import { ServiceStatus } from "../../../core/service.manager";
import type { Connection } from "@solana/web3.js";

/**
 * Creates a mock logging service for testing
 * @function createMockLogger
 * @description Creates a mock implementation of ManagedLoggingService for testing purposes
 * @returns {ManagedLoggingService} Mock logging service instance with no-op implementations
 */
export function createMockLogger(): ManagedLoggingService {
  return {
    start: async () => {},
    stop: async () => {},
    getStatus: () => ServiceStatus.RUNNING,
    getName: () => "mock-logger",
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    logger: console,
    config: {
      level: "info",
      serviceName: "mock-service",
    },
    serviceStatus: ServiceStatus.RUNNING,
    LOG_DIR: "/tmp/logs",
    LOG_FILE: "mock.log",
    LOG_LEVEL: "info",
    LOG_FORMAT: "json",
    LOG_MAX_SIZE: 10485760,
    LOG_MAX_FILES: 5,
    LOG_COLORIZE: true,
    LOG_TIMESTAMP: true,
    LOG_LABEL: "mock-logger",
    LOG_SILENT: false,
    LOG_CONSOLE: true,
    LOG_FILE_ENABLED: false,
  } as unknown as ManagedLoggingService;
}

/**
 * Creates a mock Solana connection for testing
 * @function createMockConnection
 * @description Creates a mock implementation of Solana Connection for testing purposes
 * @returns {Connection} Mock connection instance with default responses
 */
export function createMockConnection(): Connection {
  return {
    getAccountInfo: async () => null,
    getParsedAccountInfo: async () => ({ value: null }),
    getBalance: async () => 0,
    getSlot: async () => 0,
    getBlockTime: async () => null,
    getConfirmedTransaction: async () => null,
    getConfirmedSignaturesForAddress2: async () => [],
    getSignatureStatus: async () => null,
    getTokenAccountBalance: async () => ({
      value: { amount: "0", decimals: 0, uiAmount: 0 },
    }),
    getTokenSupply: async () => ({
      value: { amount: "0", decimals: 0, uiAmount: 0 },
    }),
    onAccountChange: () => 0,
    onSlotChange: () => 0,
    removeAccountChangeListener: () => {},
    removeSlotChangeListener: () => {},
    requestAirdrop: async () => "",
    sendTransaction: async () => "",
    simulateTransaction: async () => ({ value: { err: null, logs: [] } }),
    getMinimumBalanceForRentExemption: async () => 0,
    getLatestBlockhash: async () => ({
      blockhash: "",
      lastValidBlockHeight: 0,
    }),
    confirmTransaction: async () => ({ value: { err: null } }),
    getVersion: async () => ({ "solana-core": "1.0.0" }),
    getSlotLeader: async () => "",
    getClusterNodes: async () => [],
    getVoteAccounts: async () => ({ current: [], delinquent: [] }),
    getInflationGovernor: async () => ({
      foundation: 0,
      foundationTerm: 0,
      initial: 0,
      taper: 0,
      terminal: 0,
    }),
    getEpochInfo: async () => ({
      absoluteSlot: 0,
      blockHeight: 0,
      epoch: 0,
      slotIndex: 0,
      slotsInEpoch: 0,
    }),
    getSignatureStatuses: async () => ({ value: [] }),
    getRecentBlockhash: async () => ({
      blockhash: "",
      feeCalculator: { lamportsPerSignature: 0 },
    }),
    getGenesisHash: async () => "",
    getEpochSchedule: async () => ({
      firstNormalEpoch: 0,
      firstNormalSlot: 0,
      leaderScheduleSlotOffset: 0,
      slotsPerEpoch: 0,
      warmup: false,
    }),
  } as unknown as Connection;
}

/**
 * Delays execution for a specified time
 * @function delay
 * @description Creates a promise that resolves after the specified delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates network latency
 * @function simulateNetworkLatency
 * @description Adds a random delay between 50-150ms to simulate network conditions
 * @returns {Promise<void>} Promise that resolves after the random delay
 */
export async function simulateNetworkLatency(): Promise<void> {
  const latency = Math.random() * 100 + 50; // Random delay between 50-150ms
  return delay(latency);
}

/**
 * Creates a random token mint address
 * @function createRandomTokenMint
 * @description Generates a random Solana-style public key string
 * @returns {string} Random token mint address
 */
export function createRandomTokenMint(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let mint = "";
  for (let i = 0; i < 44; i++) {
    mint += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return mint;
}
