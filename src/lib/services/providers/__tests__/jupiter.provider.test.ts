/**
 * @file Jupiter Provider Tests
 * @version 1.0.0
 * @description Test suite for Jupiter provider implementation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection } from "@solana/web3.js";
import { JupiterProvider } from "../jupiter.provider";
import { ManagedLoggingService } from "../../core/managed-logging";
import { ServiceStatus } from "../../core/service.manager";

// Mock axios
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

// Mock Connection
vi.mock("@solana/web3.js", () => ({
  Connection: vi.fn().mockImplementation(() => ({
    getSlot: vi.fn().mockResolvedValue(1),
  })),
}));

// Mock logging service
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
