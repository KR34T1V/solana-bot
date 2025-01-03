/**
 * @file Metaplex provider implementation
 * @version 1.0.0
 * @module lib/services/providers/metaplex.provider
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { type Connection, PublicKey } from "@solana/web3.js";
import {
  Metaplex,
  type Nft,
  type Metadata,
  type Sft,
} from "@metaplex-foundation/js";
import type { ManagedLoggingService } from "../core/managed-logging";
import type {
  MetaplexData,
  CreatorVerification,
  TokenValidation,
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
} from "../../types/provider";
import { ManagedProviderBase, type ProviderConfig } from "./base.provider";

interface CachedMetadata {
  data: MetaplexData;
  timestamp: number;
}

interface CachedCreator {
  data: CreatorVerification;
  timestamp: number;
}

interface CachedValidation {
  data: TokenValidation;
  timestamp: number;
}

export class MetaplexProvider extends ManagedProviderBase {
  private connection: Connection;
  private metaplex: Metaplex;
  private metadataCache: Map<string, CachedMetadata>;
  private creatorCache: Map<string, CachedCreator>;
  private validationCache: Map<string, CachedValidation>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CREATOR_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    config: ProviderConfig,
    logger: ManagedLoggingService,
    connection: Connection,
  ) {
    super(config, logger);
    this.connection = connection;
    this.metaplex = new Metaplex(connection);
    this.metadataCache = new Map();
    this.creatorCache = new Map();
    this.validationCache = new Map();
  }

  protected override async initializeProvider(): Promise<void> {
    try {
      // Test connection by fetching a known token's metadata
      const testMint = new PublicKey(
        "So11111111111111111111111111111111111111112",
      );
      await this.metaplex.nfts().findByMint({ mintAddress: testMint });
      this.logger.info("Metaplex connection established");
    } catch (error) {
      this.logger.error("Failed to initialize Metaplex connection", { error });
      throw error;
    }
  }

  protected override async cleanupProvider(): Promise<void> {
    // Clear caches
    this.metadataCache.clear();
    this.creatorCache.clear();
    this.validationCache.clear();
  }

  public override getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: false,
      canGetOHLCV: false,
      canGetOrderBook: false,
      canGetMetadata: true,
      canVerifyCreators: true,
      canValidateToken: true,
    };
  }

  // Required BaseProvider methods (not supported)
  protected override async getPriceImpl(
    _tokenMint: string,
  ): Promise<PriceData> {
    throw new Error("Price data not supported by Metaplex provider");
  }

  protected override async getOHLCVImpl(
    _tokenMint: string,
    _timeframe: number,
    _limit: number,
  ): Promise<OHLCVData> {
    throw new Error("OHLCV data not supported by Metaplex provider");
  }

  protected override async getOrderBookImpl(
    _tokenMint: string,
    _limit?: number,
  ): Promise<MarketDepth> {
    throw new Error("Order book not supported by Metaplex provider");
  }

  // Metaplex-specific methods
  public async getMetadata(mint: string): Promise<MetaplexData> {
    try {
      const cached = this.metadataCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const mintPubkey = new PublicKey(mint);
      const metadata = await this.metaplex
        .nfts()
        .findByMint({ mintAddress: mintPubkey });

      const metaplexData: MetaplexData = {
        mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
        creators:
          metadata.creators?.map((c) => ({
            address: c.address.toString(),
            verified: c.verified,
            share: c.share,
          })) || [],
        collection: metadata.collection
          ? {
              verified: metadata.collection.verified,
              key: metadata.collection.address.toString(),
            }
          : undefined,
        uses: metadata.uses
          ? {
              useMethod: metadata.uses.useMethod,
              remaining: metadata.uses.remaining,
              total: metadata.uses.total,
            }
          : undefined,
        isMutable: metadata.programmableConfig ? true : false,
        primarySaleHappened: metadata.programmableConfig ? true : false,
        updateAuthority: metadata.updateAuthorityAddress.toString(),
      };

      this.metadataCache.set(mint, {
        data: metaplexData,
        timestamp: Date.now(),
      });

      return metaplexData;
    } catch (error) {
      this.logger.error("Failed to fetch metadata", { error, mint });
      throw error;
    }
  }

  public async verifyCreator(address: string): Promise<CreatorVerification> {
    try {
      const cached = this.creatorCache.get(address);
      if (cached && Date.now() - cached.timestamp < this.CREATOR_CACHE_TTL) {
        return cached.data;
      }

      // Find all NFTs by creator
      const creatorPubkey = new PublicKey(address);
      const createdNFTs = await this.metaplex
        .nfts()
        .findAllByCreator({ creator: creatorPubkey });

      // Analyze creator's history
      const totalProjects = createdNFTs.length;
      const successfulProjects = createdNFTs.filter(
        (nft: Metadata | Sft | Nft) =>
          "programmableConfig" in nft && nft.programmableConfig?.ruleSet,
      ).length;

      const verification: CreatorVerification = {
        address,
        isVerified: createdNFTs.some((nft: Metadata | Sft | Nft) =>
          nft.creators?.some(
            (c) => c.address.equals(creatorPubkey) && c.verified,
          ),
        ),
        verificationMethod: "METAPLEX",
        signatureValid: true,
        projectHistory: {
          totalProjects,
          successfulProjects,
          rugPullCount: 0, // Would need external data source
          averageProjectDuration: 0, // Would need external data source
        },
        riskScore: this.calculateCreatorRiskScore(
          totalProjects,
          successfulProjects,
        ),
      };

      this.creatorCache.set(address, {
        data: verification,
        timestamp: Date.now(),
      });

      return verification;
    } catch (error) {
      this.logger.error("Failed to verify creator", { error, address });
      throw error;
    }
  }

  public async validateToken(mint: string): Promise<TokenValidation> {
    try {
      const cached = this.validationCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const metadata = await this.getMetadata(mint);
      const creator = metadata.creators[0]?.address;
      const creatorVerification = creator
        ? await this.verifyCreator(creator)
        : null;

      const validation: TokenValidation = {
        isValid: this.isTokenValid(metadata, creatorVerification),
        metadata,
        creator: creatorVerification!,
        riskFactors: this.analyzeRiskFactors(metadata, creatorVerification),
        riskScore: this.calculateTokenRiskScore(metadata, creatorVerification),
        lastChecked: Date.now(),
      };

      this.validationCache.set(mint, {
        data: validation,
        timestamp: Date.now(),
      });

      return validation;
    } catch (error) {
      this.logger.error("Failed to validate token", { error, mint });
      throw error;
    }
  }

  private calculateCreatorRiskScore(
    totalProjects: number,
    successfulProjects: number,
  ): number {
    if (totalProjects === 0) return 1; // Highest risk for new creators
    return Math.max(0, Math.min(1, successfulProjects / totalProjects));
  }

  private isTokenValid(
    metadata: MetaplexData,
    creatorVerification: CreatorVerification | null,
  ): boolean {
    return (
      metadata.name.length > 0 &&
      metadata.symbol.length > 0 &&
      metadata.creators.length > 0 &&
      (creatorVerification?.isVerified ?? false)
    );
  }

  private analyzeRiskFactors(
    metadata: MetaplexData,
    creatorVerification: CreatorVerification | null,
  ): {
    code: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
  }[] {
    const factors: {
      code: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      description: string;
    }[] = [];

    // Always check creator verification
    if (!creatorVerification) {
      factors.push({
        code: "NO_CREATOR_INFO",
        severity: "HIGH",
        description: "No creator information available",
      });
    } else if (!creatorVerification.isVerified) {
      factors.push({
        code: "UNVERIFIED_CREATOR",
        severity: "HIGH",
        description: "Token creator is not verified",
      });
    }

    if (metadata.isMutable) {
      factors.push({
        code: "MUTABLE_METADATA",
        severity: "MEDIUM",
        description: "Token metadata can be changed",
      });
    }

    if (creatorVerification && creatorVerification.riskScore > 0.7) {
      factors.push({
        code: "HIGH_RISK_CREATOR",
        severity: "HIGH",
        description: "Creator has high risk score",
      });
    }

    // Add basic metadata checks
    if (!metadata.name || metadata.name.length === 0) {
      factors.push({
        code: "MISSING_NAME",
        severity: "MEDIUM",
        description: "Token name is missing",
      });
    }

    if (!metadata.symbol || metadata.symbol.length === 0) {
      factors.push({
        code: "MISSING_SYMBOL",
        severity: "MEDIUM",
        description: "Token symbol is missing",
      });
    }

    return factors;
  }

  private calculateTokenRiskScore(
    metadata: MetaplexData,
    creatorVerification: CreatorVerification | null,
  ): number {
    let score = 0;

    // Creator verification weight: 40%
    score += (creatorVerification?.riskScore ?? 1) * 0.4;

    // Metadata quality weight: 30%
    const metadataScore =
      (metadata.name.length > 0 ? 0.2 : 0) +
      (metadata.symbol.length > 0 ? 0.2 : 0) +
      (metadata.uri.length > 0 ? 0.2 : 0) +
      (metadata.creators.length > 0 ? 0.2 : 0) +
      (metadata.collection?.verified ? 0.2 : 0);
    score += metadataScore * 0.3;

    // Mutability risk weight: 30%
    score += (metadata.isMutable ? 1 : 0) * 0.3;

    return Math.min(1, score);
  }
}
