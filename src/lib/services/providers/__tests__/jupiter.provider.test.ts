/**
 * @file Jupiter Provider Tests
 * @version 1.0.0
 * @description Test suite for Jupiter provider implementation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../core/managed-logging";
import { JupiterProvider } from "../jupiter.provider";
import { ServiceStatus } from "../../core/service.manager";

describe("Jupiter Provider", () => {
  let provider: JupiterProvider;
  let mockLogger: ManagedLoggingService;
  let mockConnection: Connection;

  beforeEach(() => {
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      getName: () => "test-logger",
      getStatus: () => ServiceStatus.RUNNING,
      start: vi.fn(),
      stop: vi.fn(),
    } as unknown as ManagedLoggingService;

    mockConnection = {
      getSlot: vi.fn().mockResolvedValue(1),
    } as unknown as Connection;

    provider = new JupiterProvider(
      {
        name: "jupiter-provider",
        version: "1.0.0",
      },
      mockLogger,
      mockConnection,
    );
  });

  describe("Service Lifecycle", () => {
    it("should start correctly", async () => {
      expect(provider.getStatus()).toBe(ServiceStatus.PENDING);
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
    beforeEach(async () => {
      await provider.start();
    });

    it("should get price", async () => {
      const price = await provider.getPrice("test-token");
      expect(price).toEqual({
        price: expect.any(Number),
        timestamp: expect.any(Number),
        confidence: expect.any(Number),
      });
    });
  });
});

