/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module lib/services/detection/__tests__/token-detector.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import {
  TokenDetector,
  type TokenConfig,
  type ValidationResult,
} from "../token-detector";
import { logger } from "../../logging.service";

// Mock the logger
vi.mock("../../logging.service", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TokenDetector", () => {
  let detector: TokenDetector;
  let connection: Connection;
  let mockSubscriptionId: number;

  const defaultConfig: TokenConfig = {
    minDecimals: 0,
    maxDecimals: 9,
    requiredMetadataFields: ["name", "symbol"],
  };

  // Sample logs for testing
  const mockMintAddress = "CK1LHEANTu7RFqN3XMzo2AnZhyus2W1vue1njrxLEM1d";
  const mockCreatorAddress = "BKz5ZgX2BZX6XyVhsoNFmZNQG2TXvzpqEj5RJvH8vb3c";

  const mockLogs = {
    signature: "123",
    err: null,
    logs: [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      `Program log: Initialize mint ${mockMintAddress}`,
      "Program log: Instruction: InitializeMint",
      `Program log: Signature: ${mockCreatorAddress}`,
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ],
  };

  const mockMintInfo = {
    value: {
      data: {
        parsed: {
          type: "mint",
          info: {
            decimals: 9,
            mintAuthority: mockCreatorAddress,
            freezeAuthority: null,
            supply: "0",
          },
        },
      },
    },
  };

  beforeEach(() => {
    mockSubscriptionId = 1;
    connection = {
      onLogs: vi.fn().mockReturnValue(mockSubscriptionId),
      removeOnLogsListener: vi.fn().mockResolvedValue(undefined),
      getParsedAccountInfo: vi.fn().mockResolvedValue(mockMintInfo),
    } as unknown as Connection;

    detector = new TokenDetector(connection, defaultConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("start", () => {
    it("should start monitoring token program logs", async () => {
      await detector.start();

      expect(connection.onLogs).toHaveBeenCalledWith(
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        expect.any(Function),
        "confirmed",
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Token detector started successfully",
      );
    });

    it("should not start if already running", async () => {
      await detector.start();
      await detector.start();

      expect(connection.onLogs).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        "Token detector is already running",
      );
    });

    it("should handle start errors", async () => {
      const error = new Error("Failed to start");
      connection.onLogs = vi.fn().mockImplementation(() => {
        throw error;
      });

      await expect(detector.start()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to start token detector:",
        { error: "Failed to start" },
      );
    });
  });

  describe("stop", () => {
    it("should stop monitoring token program logs", async () => {
      await detector.start();
      await detector.stop();

      expect(connection.removeOnLogsListener).toHaveBeenCalledWith(
        mockSubscriptionId,
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Token detector stopped successfully",
      );
    });

    it("should not stop if not running", async () => {
      await detector.stop();

      expect(connection.removeOnLogsListener).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("Token detector is not running");
    });

    it("should handle stop errors", async () => {
      const error = new Error("Failed to stop");
      connection.removeOnLogsListener = vi.fn().mockRejectedValue(error);

      await detector.start();
      await expect(detector.stop()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to stop token detector:",
        { error: "Failed to stop" },
      );
    });
  });

  describe("event handling", () => {
    it("should emit detection event for valid token", async () => {
      const onDetection = vi.fn();
      detector.on("detection", onDetection);

      await detector.start();
      const mockFn = connection.onLogs as ReturnType<typeof vi.fn>;
      const callback = mockFn.mock.calls[0][1];
      await callback(mockLogs);

      expect(onDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.objectContaining({
            mint: expect.any(String),
            decimals: expect.any(Number),
            creator: expect.any(String),
            timestamp: expect.any(Number),
          }),
          confidence: expect.any(Number),
          validationResults: expect.any(Array),
        }),
      );
    });

    it("should emit error event on processing failure", async () => {
      const onError = vi.fn();
      detector.on("error", onError);

      await detector.start();
      const mockFn = connection.onLogs as ReturnType<typeof vi.fn>;
      const callback = mockFn.mock.calls[0][1];
      const error = new Error("Processing failed");

      // Mock extractMintInfo to throw an error
      vi.spyOn(detector as any, "extractMintInfo").mockRejectedValue(error);

      await callback(mockLogs);

      expect(onError).toHaveBeenCalledWith(error);
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing token program logs:",
        { error: "Processing failed" },
      );
    });
  });

  describe("validation", () => {
    it("should validate token decimals", async () => {
      const token = {
        mint: "test",
        decimals: 8,
        creator: "test",
        timestamp: Date.now(),
      };

      const results = await (detector as any).validateToken(token);
      const decimalsResult = results.find(
        (result: ValidationResult) => result.check === "decimals",
      );

      expect(decimalsResult).toBeDefined();
      expect(decimalsResult?.passed).toBe(true);
    });

    it("should validate required metadata fields", async () => {
      const token = {
        mint: "test",
        decimals: 8,
        creator: "test",
        timestamp: Date.now(),
        metadata: {
          name: "Test Token",
          symbol: "TEST",
        },
      };

      const results = await (detector as any).validateToken(token);
      const metadataResult = results.find(
        (result: ValidationResult) => result.check === "metadata",
      );

      expect(metadataResult).toBeDefined();
      expect(metadataResult?.passed).toBe(true);
    });

    it("should validate excluded creators", async () => {
      const config: TokenConfig = {
        ...defaultConfig,
        excludedCreators: ["excluded"],
      };
      detector = new TokenDetector(connection, config);

      const token = {
        mint: "test",
        decimals: 8,
        creator: "excluded",
        timestamp: Date.now(),
      };

      const results = await (detector as any).validateToken(token);
      const creatorResult = results.find(
        (result: ValidationResult) => result.check === "creator",
      );

      expect(creatorResult).toBeDefined();
      expect(creatorResult?.passed).toBe(false);
    });
  });

  describe("mint detection", () => {
    describe("extractMintAddress", () => {
      it("should extract mint address from Initialize mint log", async () => {
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo?.mint).toBe(mockMintAddress);
      });

      it("should extract mint address from New token mint log", async () => {
        const altLogs = {
          ...mockLogs,
          logs: [
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
            `Program log: New token mint: ${mockMintAddress}`,
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
          ],
        };
        const mintInfo = await (detector as any).extractMintInfo(altLogs);
        expect(mintInfo?.mint).toBe(mockMintAddress);
      });

      it("should return null for invalid mint address format", async () => {
        const invalidLogs = {
          ...mockLogs,
          logs: [
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
            "Program log: Initialize mint INVALID_ADDRESS",
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
          ],
        };
        const mintInfo = await (detector as any).extractMintInfo(invalidLogs);
        expect(mintInfo).toBeNull();
      });
    });

    describe("extractCreator", () => {
      it("should extract creator from signature log", async () => {
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo?.creator).toBe(mockCreatorAddress);
      });

      it("should handle missing creator gracefully", async () => {
        const logsWithoutCreator = {
          ...mockLogs,
          logs: mockLogs.logs.filter((log) => !log.includes("Signature:")),
        };
        const mintInfo = await (detector as any).extractMintInfo(
          logsWithoutCreator,
        );
        expect(mintInfo?.creator).toBe("");
      });
    });

    describe("account data parsing", () => {
      it("should parse mint account data correctly", async () => {
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo).toEqual({
          mint: mockMintAddress,
          decimals: 9,
          creator: mockCreatorAddress,
          timestamp: expect.any(Number),
          metadata: {
            mintAuthority: mockCreatorAddress,
            freezeAuthority: null,
            supply: "0",
          },
        });
      });

      it("should handle invalid account data", async () => {
        connection.getParsedAccountInfo = vi.fn().mockResolvedValue({
          value: { data: "invalid" },
        });
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo).toBeNull();
      });

      it("should handle missing account data", async () => {
        connection.getParsedAccountInfo = vi
          .fn()
          .mockResolvedValue({ value: null });
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo).toBeNull();
      });

      it("should handle invalid mint type", async () => {
        connection.getParsedAccountInfo = vi.fn().mockResolvedValue({
          value: {
            data: {
              parsed: {
                type: "notMint",
                info: {},
              },
            },
          },
        });
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo).toBeNull();
      });
    });

    describe("error handling", () => {
      it("should handle getParsedAccountInfo errors", async () => {
        connection.getParsedAccountInfo = vi
          .fn()
          .mockRejectedValue(new Error("RPC error"));
        const mintInfo = await (detector as any).extractMintInfo(mockLogs);
        expect(mintInfo).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          "Failed to extract mint info:",
          { error: "RPC error" },
        );
      });

      it("should handle invalid public key errors", async () => {
        const invalidLogs = {
          ...mockLogs,
          logs: [
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
            "Program log: Initialize mint invalid_public_key",
            "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
          ],
        };
        const mintInfo = await (detector as any).extractMintInfo(invalidLogs);
        expect(mintInfo).toBeNull();
      });
    });
  });
});
