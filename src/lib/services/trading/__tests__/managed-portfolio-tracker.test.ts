/**
 * @file Test suite for portfolio tracking service
 * @version 1.0.0
 * @module lib/services/trading/__tests__/managed-portfolio-tracker.test
 * @author Development Team
 * @lastModified 2024-01-02
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { createLogger } from "winston";
import type { PortfolioConfig } from "../types";
import { PositionStatus, PositionType } from "../types";
import { ManagedPortfolioTracker } from "../managed-portfolio-tracker";

describe("ManagedPortfolioTracker", () => {
  let service: ManagedPortfolioTracker;
  let config: PortfolioConfig;
  const mockConnection = {} as Connection;
  const mockLogger = createLogger();

  beforeEach(() => {
    config = {
      name: "test-portfolio",
      version: "1.0.0",
      maxPositions: 5,
      maxPositionSize: 10000,
      minLiquidity: 1000,
      riskParams: {
        volatilityWeight: 0.4,
        liquidityWeight: 0.3,
        concentrationWeight: 0.3,
      },
    };

    service = new ManagedPortfolioTracker(mockLogger, config, mockConnection);
  });

  describe("Portfolio Management", () => {
    const TEST_TOKEN_MINT = new PublicKey(
      "7hoYJc4aqttctANrNe75gscdmQD9HcXPwcXHwK4AF1xb",
    );

    beforeEach(async () => {
      await service.start();
    });

    it("should open a new position", async () => {
      const position = await service.openPosition(TEST_TOKEN_MINT, 1000);

      expect(position).toBeDefined();
      expect(position.tokenMint).toBe(TEST_TOKEN_MINT);
      expect(position.size).toBe(1000);
      expect(position.type).toBe(PositionType.LONG);
      expect(position.status).toBe(PositionStatus.PENDING);
    });

    it("should enforce maximum position size", async () => {
      await expect(
        service.openPosition(TEST_TOKEN_MINT, config.maxPositionSize + 1),
      ).rejects.toThrow("Position size exceeds maximum allowed");
    });

    it("should enforce maximum positions limit", async () => {
      // Open max number of positions
      for (let i = 0; i < config.maxPositions; i++) {
        await service.openPosition(TEST_TOKEN_MINT, 1000);
      }

      // Try to open one more
      await expect(service.openPosition(TEST_TOKEN_MINT, 1000)).rejects.toThrow(
        "Maximum number of positions reached",
      );
    });

    it("should close a position", async () => {
      const position = await service.openPosition(TEST_TOKEN_MINT, 1000);

      await service.closePosition(position.id);
      const positions = service.getPositions();
      const closedPosition = positions.find((p) => p.id === position.id);

      expect(closedPosition).toBeDefined();
      expect(closedPosition?.status).toBe(PositionStatus.CLOSED);
      expect(closedPosition?.closedAt).toBeDefined();
    });

    it("should not close an already closed position", async () => {
      const position = await service.openPosition(TEST_TOKEN_MINT, 1000);

      await service.closePosition(position.id);
      await expect(service.closePosition(position.id)).rejects.toThrow(
        "Position is already closed",
      );
    });

    it("should update position metrics", async () => {
      const position = await service.openPosition(TEST_TOKEN_MINT, 1000);
      const initialTimestamp = position.updatedAt;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      await service.updatePosition(position.id);
      const positions = service.getPositions();
      const updatedPosition = positions.find((p) => p.id === position.id);

      expect(updatedPosition).toBeDefined();
      expect(updatedPosition?.metrics).toBeDefined();
      expect(updatedPosition?.updatedAt).toBeGreaterThan(initialTimestamp);
    });

    it("should calculate portfolio metrics", async () => {
      await service.openPosition(TEST_TOKEN_MINT, 1000);
      await service.openPosition(TEST_TOKEN_MINT, 2000);

      const metrics = service.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.positionCount).toBe(2);
      expect(metrics.totalValue).toBeDefined();
      expect(metrics.riskScore).toBeDefined();
      expect(metrics.lastUpdated).toBeDefined();
    });

    it("should not allow operations when service is not running", async () => {
      await service.stop();

      // Test each operation
      const operations = [
        {
          fn: () => service.openPosition(TEST_TOKEN_MINT, 1000),
          operation: "open position",
        },
        {
          fn: () => service.closePosition("some-id"),
          operation: "close position",
        },
        {
          fn: () => service.updatePosition("some-id"),
          operation: "update position",
        },
        {
          fn: () => service.getMetrics(),
          operation: "get metrics",
        },
        {
          fn: () => service.getPositions(),
          operation: "get positions",
        },
      ];

      // Test each operation
      for (const { fn, operation } of operations) {
        try {
          await fn();
          // If we get here, the operation didn't throw as expected
          throw new Error(`Expected operation "${operation}" to fail`);
        } catch (error: any) {
          expect(error.message).toBe(
            `Cannot ${operation}: service is not running`,
          );
        }
      }
    });
  });
});
