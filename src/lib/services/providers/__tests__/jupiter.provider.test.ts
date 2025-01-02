/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/providers/__tests__/jupiter.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection } from "@solana/web3.js";
import { JupiterProvider } from "../jupiter.provider";
import { ManagedLoggingService } from "../../core/managed-logging";
import { ServiceStatus } from "../../core/service.manager";

/**
 * Mock Configuration
 * -----------------
 * The following section sets up all necessary mocks for isolated testing.
 * Each mock is documented with its purpose and behavior.
 */

/**
 * Mock axios for price feed simulation
 * Provides consistent test data for price queries
 */
vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: {
          SOL: {
            id: "SOL",
            type: "token",
            price: "1.0",
          },
        },
        timeTaken: 100,
      },
    }),
  },
}));

/**
 * Mock Solana Connection
 * Simulates blockchain interaction without network calls
 */
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getSlot: vi.fn().mockResolvedValue(1),
  })),
}));

/**
 * Mock logging service
 * Provides logging interface without actual logging
 */
vi.mock("../../core/managed-logging", () => ({
  ManagedLoggingService: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("Jupiter Provider", () => {
  let provider: JupiterProvider;
  let logger: ManagedLoggingService;
  let connection: Connection;

  /**
   * Test Setup
   * ----------
   * Before each test:
   * 1. Clear all mocks
   * 2. Create fresh logger instance
   * 3. Initialize Solana connection
   * 4. Create new provider instance
   */
  beforeEach(() => {
    vi.clearAllMocks();
    logger = new ManagedLoggingService({
      serviceName: "test-jupiter",
      level: "info",
      logDir: "./logs",
    });
    connection = new Connection("https://api.mainnet-beta.solana.com");
    provider = new JupiterProvider(
      {
        name: "jupiter-provider",
        version: "1.0.0",
      },
      logger,
      connection,
    );
  });

  /**
   * Service Lifecycle Tests
   * ----------------------
   * Verify proper implementation of the Service interface
   */
  describe("Service Lifecycle", () => {
    it("should start correctly", async () => {
      await provider.start();
      expect(provider.getStatus()).toBe(ServiceStatus.RUNNING);
    });

    it("should stop correctly", async () => {
      await provider.start();
      await provider.stop();
      expect(provider.getStatus()).toBe(ServiceStatus.STOPPED);
    });
  });

  /**
   * Provider Operations Tests
   * -----------------------
   * Verify core provider functionality
   */
  describe("Provider Operations", () => {
    it("should get price", async () => {
      await provider.start();
      const price = await provider.getPrice("SOL");
      expect(price).toEqual({
        price: 1.0,
        timestamp: expect.any(Number),
        confidence: 1,
      });
    });
  });
});
