/**
 * @file Test suite for MetaplexProvider
 * @version 1.0.0
 * @module lib/services/providers/__tests__/metaplex.provider.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, PublicKey } from "@solana/web3.js";
import { ManagedLoggingService } from "../../core/managed-logging";
import { ServiceStatus } from "../../core/service.manager";
import { MetaplexProvider } from "../metaplex.provider";

// Mock Metaplex
vi.mock("@metaplex-foundation/js", () => ({
  Metaplex: vi.fn().mockImplementation(() => ({
    nfts: () => ({
      findByMint: vi.fn().mockResolvedValue({
        name: "Test Token",
        symbol: "TEST",
        uri: "https://test.uri",
        sellerFeeBasisPoints: 500,
        creators: [
          {
            address: new PublicKey("11111111111111111111111111111111"),
            verified: true,
            share: 100,
          },
        ],
        collection: {
          verified: true,
          address: new PublicKey("11111111111111111111111111111111"),
        },
        uses: null,
        programmableConfig: null,
        updateAuthorityAddress: new PublicKey(
          "11111111111111111111111111111111",
        ),
      }),
      findAllByCreator: vi.fn().mockResolvedValue([
        {
          name: "Project 1",
          programmableConfig: { ruleSet: true },
          creators: [
            {
              address: new PublicKey("11111111111111111111111111111111"),
              verified: true,
              share: 100,
            },
          ],
        },
        {
          name: "Project 2",
          programmableConfig: null,
          creators: [
            {
              address: new PublicKey("11111111111111111111111111111111"),
              verified: true,
              share: 100,
            },
          ],
        },
      ]),
    }),
  })),
}));

describe("MetaplexProvider", () => {
  let provider: MetaplexProvider;
  let logger: ManagedLoggingService;
  let connection: Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new ManagedLoggingService({
      serviceName: "test-metaplex",
      level: "info",
      logDir: "./logs",
    });
    connection = new Connection("https://api.mainnet-beta.solana.com");
    provider = new MetaplexProvider(
      {
        name: "metaplex-provider",
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

  describe("Capabilities", () => {
    it("should report correct capabilities", () => {
      const capabilities = provider.getCapabilities();
      expect(capabilities).toEqual({
        canGetPrice: false,
        canGetOHLCV: false,
        canGetOrderBook: false,
        canGetMetadata: true,
        canVerifyCreators: true,
        canValidateToken: true,
      });
    });

    it("should throw on unsupported operations", async () => {
      await expect(provider.getPrice("test")).rejects.toThrow();
      await expect(provider.getOHLCV("test", 0, 0)).rejects.toThrow();
      await expect(provider.getOrderBook("test")).rejects.toThrow();
    });
  });

  describe("Metadata Operations", () => {
    it("should fetch metadata correctly", async () => {
      await provider.start();
      const metadata = await provider.getMetadata(
        "11111111111111111111111111111111",
      );

      expect(metadata).toEqual({
        mint: "11111111111111111111111111111111",
        name: "Test Token",
        symbol: "TEST",
        uri: "https://test.uri",
        sellerFeeBasisPoints: 500,
        creators: [
          {
            address: "11111111111111111111111111111111",
            verified: true,
            share: 100,
          },
        ],
        collection: {
          verified: true,
          key: "11111111111111111111111111111111",
        },
        isMutable: false,
        primarySaleHappened: false,
        updateAuthority: "11111111111111111111111111111111",
      });
    });

    it("should use cache for repeated metadata requests", async () => {
      await provider.start();
      const mint = "11111111111111111111111111111111";

      // First request
      await provider.getMetadata(mint);

      // Mock the Metaplex instance directly
      const findByMintMock = vi.fn().mockResolvedValue({
        name: "Test Token",
        symbol: "TEST",
        uri: "https://test.uri",
        sellerFeeBasisPoints: 500,
        creators: [
          {
            address: new PublicKey("11111111111111111111111111111111"),
            verified: true,
            share: 100,
          },
        ],
        collection: {
          verified: true,
          address: new PublicKey("11111111111111111111111111111111"),
        },
        uses: null,
        programmableConfig: null,
        updateAuthorityAddress: new PublicKey(
          "11111111111111111111111111111111",
        ),
      });

      const nftsMock = {
        findByMint: findByMintMock,
      };

      // @ts-expect-error - Mocking private property for testing
      provider["metaplex"].nfts = () => nftsMock;

      // Second request (should use cache)
      await provider.getMetadata(mint);
      expect(findByMintMock).not.toHaveBeenCalled();
    });
  });

  describe("Creator Verification", () => {
    it("should verify creator correctly", async () => {
      await provider.start();
      const verification = await provider.verifyCreator(
        "11111111111111111111111111111111",
      );

      expect(verification).toEqual({
        address: "11111111111111111111111111111111",
        isVerified: true,
        verificationMethod: "METAPLEX",
        signatureValid: true,
        projectHistory: {
          totalProjects: 2,
          successfulProjects: 1,
          rugPullCount: 0,
          averageProjectDuration: 0,
        },
        riskScore: expect.any(Number),
      });
    });

    it("should calculate creator risk score correctly", async () => {
      await provider.start();
      const verification = await provider.verifyCreator(
        "11111111111111111111111111111111",
      );

      expect(verification.riskScore).toBeGreaterThanOrEqual(0);
      expect(verification.riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Token Validation", () => {
    it("should validate token correctly", async () => {
      await provider.start();
      const validation = await provider.validateToken(
        "11111111111111111111111111111111",
      );

      expect(validation).toEqual({
        isValid: true,
        metadata: expect.any(Object),
        creator: expect.any(Object),
        riskFactors: expect.any(Array),
        riskScore: expect.any(Number),
        lastChecked: expect.any(Number),
      });
    });

    it("should identify risk factors correctly", async () => {
      await provider.start();

      // Mock data that will trigger risk factors
      const mockNft = {
        name: "", // Missing name to trigger MISSING_NAME
        symbol: "", // Missing symbol to trigger MISSING_SYMBOL
        uri: "https://test.uri",
        sellerFeeBasisPoints: 500,
        creators: [
          {
            address: new PublicKey("11111111111111111111111111111111"),
            verified: false, // Unverified creator
            share: 100,
          },
        ],
        collection: {
          verified: false,
          address: new PublicKey("11111111111111111111111111111111"),
        },
        uses: null,
        programmableConfig: true, // Mutable metadata
        updateAuthorityAddress: new PublicKey(
          "11111111111111111111111111111111",
        ),
      };

      // Mock the Metaplex instance
      const findByMintMock = vi.fn().mockResolvedValue(mockNft);
      const findAllByCreatorMock = vi.fn().mockResolvedValue([
        {
          name: "Project 1",
          programmableConfig: { ruleSet: true },
          creators: [
            {
              address: new PublicKey("11111111111111111111111111111111"),
              verified: false,
              share: 100,
            },
          ],
        },
      ]);

      const nftsMock = {
        findByMint: findByMintMock,
        findAllByCreator: findAllByCreatorMock,
      };

      // @ts-expect-error - Mocking private property for testing
      provider["metaplex"].nfts = () => nftsMock;

      const validation = await provider.validateToken(
        "11111111111111111111111111111111",
      );

      expect(validation.riskFactors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: expect.stringMatching(
              /^(MISSING_NAME|MISSING_SYMBOL|UNVERIFIED_CREATOR|MUTABLE_METADATA)$/,
            ),
            severity: expect.stringMatching(/^(LOW|MEDIUM|HIGH)$/),
            description: expect.any(String),
          }),
        ]),
      );

      // Verify specific risk factors
      const riskCodes = validation.riskFactors.map((f) => f.code);
      expect(riskCodes).toContain("MISSING_NAME");
      expect(riskCodes).toContain("MISSING_SYMBOL");
      expect(riskCodes).toContain("UNVERIFIED_CREATOR");
      expect(riskCodes).toContain("MUTABLE_METADATA");
    });

    it("should calculate token risk score correctly", async () => {
      await provider.start();
      const validation = await provider.validateToken(
        "11111111111111111111111111111111",
      );

      expect(validation.riskScore).toBeGreaterThanOrEqual(0);
      expect(validation.riskScore).toBeLessThanOrEqual(1);
    });
  });
});
