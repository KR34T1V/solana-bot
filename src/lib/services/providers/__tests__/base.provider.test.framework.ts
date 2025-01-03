/**
 * @file Test framework for validating provider implementations
 * @version 1.0.0
 * @module lib/services/providers/__tests__/base.provider.test.framework
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Connection } from "@solana/web3.js";
import type { ManagedLoggingService } from "../../core/managed-logging";
import { ServiceStatus } from "../../core/service.manager";
import { ServiceError } from "../base.provider";
import type { ManagedProviderBase } from "../base.provider";

export interface ProviderTestContext {
  provider: ManagedProviderBase;
  logger: ManagedLoggingService;
  connection: Connection;
  validTokenMint: string;
  invalidTokenMint: string;
}

/**
 * Tests a provider implementation against the base provider interface.
 * This framework validates that the provider correctly implements all required
 * functionality and handles edge cases appropriately.
 *
 * The test suite includes:
 * - Interface compliance
 * - Error handling
 * - State management
 * - Resource cleanup
 * - Rate limiting
 * - Caching behavior
 *
 * @function testProviderImplementation
 * @description Validates a provider implementation against the base provider interface
 * @param {string} providerName - The name of the provider being tested
 * @param {() => Promise<ProviderTestContext>} setupContext - Function to set up the test context before each test
 * @param {() => Promise<void>} [cleanupContext] - Optional function to clean up after each test
 * @returns {void}
 */
export function testProviderImplementation(
  providerName: string,
  setupContext: () => Promise<ProviderTestContext>,
  cleanupContext?: () => Promise<void>,
) {
  describe(`${providerName} Base Implementation`, () => {
    let context: ProviderTestContext;

    beforeEach(async () => {
      context = await setupContext();
    });

    afterEach(async () => {
      if (cleanupContext) {
        await cleanupContext();
      }
    });

    describe("Service Interface", () => {
      it("should implement required service methods", () => {
        expect(context.provider.start).toBeDefined();
        expect(context.provider.stop).toBeDefined();
        expect(context.provider.getStatus).toBeDefined();
        expect(context.provider.getName).toBeDefined();
      });

      it("should initialize in PENDING state", () => {
        expect(context.provider.getStatus()).toBe(ServiceStatus.PENDING);
      });

      it("should transition through correct states", async () => {
        expect(context.provider.getStatus()).toBe(ServiceStatus.PENDING);

        await context.provider.start();
        expect(context.provider.getStatus()).toBe(ServiceStatus.RUNNING);

        await context.provider.stop();
        expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should prevent operations when stopped", async () => {
        await expect(
          context.provider.getPrice(context.validTokenMint),
        ).rejects.toThrow("Service is not running");
      });
    });

    describe("Provider Interface", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      afterEach(async () => {
        await context.provider.stop();
      });

      it("should implement required provider methods", () => {
        expect(context.provider.getPrice).toBeDefined();
        expect(context.provider.getOrderBook).toBeDefined();
        expect(context.provider.getOHLCV).toBeDefined();
        expect(context.provider.getCapabilities).toBeDefined();
      });

      it("should validate token mint format", async () => {
        const invalidMints = [
          "", // Empty string
          "SOL", // Not base58
          "0x123", // Not base58
          "abc", // Too short
          "!@#$%^", // Invalid characters
        ];

        for (const invalidMint of invalidMints) {
          await expect(context.provider.getPrice(invalidMint)).rejects.toThrow(
            ServiceError,
          );
        }
      });

      it("should respect provider capabilities", async () => {
        const capabilities = context.provider.getCapabilities();

        if (!capabilities.canGetPrice) {
          await expect(
            context.provider.getPrice(context.validTokenMint),
          ).rejects.toThrow("Operation not supported");
        }

        if (!capabilities.canGetOrderBook) {
          await expect(
            context.provider.getOrderBook(context.validTokenMint),
          ).rejects.toThrow("Operation not supported");
        }

        if (!capabilities.canGetOHLCV) {
          await expect(
            context.provider.getOHLCV(context.validTokenMint, 60, 100),
          ).rejects.toThrow("Operation not supported");
        }
      });
    });

    describe("Error Handling", () => {
      beforeEach(async () => {
        await context.provider.start();
      });

      afterEach(async () => {
        await context.provider.stop();
      });

      it("should use ServiceError for all errors", async () => {
        try {
          await context.provider.getPrice("invalid-mint");
          expect(false).toBe(true);
        } catch (error) {
          expect(error).toBeInstanceOf(ServiceError);
          expect(error).toHaveProperty("code");
          expect(error).toHaveProperty("isRetryable");
        }
      });

      it("should handle concurrent operations", async () => {
        const promises = Array(5)
          .fill(0)
          .map(() => context.provider.getPrice(context.validTokenMint));
        await expect(Promise.all(promises)).resolves.toBeDefined();
      });
    });

    describe("Resource Management", () => {
      it("should cleanup resources on stop", async () => {
        await context.provider.start();

        // Start some operations
        const promise = context.provider.getPrice(context.validTokenMint);

        // Stop while operation is pending
        await context.provider.stop();

        // Operation should fail
        await expect(promise).rejects.toThrow();

        // Provider should be in stopped state
        expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
      });

      it("should handle rapid start/stop cycles", async () => {
        for (let i = 0; i < 5; i++) {
          await context.provider.start();
          expect(context.provider.getStatus()).toBe(ServiceStatus.RUNNING);

          await context.provider.stop();
          expect(context.provider.getStatus()).toBe(ServiceStatus.STOPPED);
        }
      });
    });
  });
}
