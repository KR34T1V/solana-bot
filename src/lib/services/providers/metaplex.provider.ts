/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/providers/metaplex.provider
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { type Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import type { ManagedLoggingService } from "../core/managed-logging";
import type {
  ProviderCapabilities,
  PriceData,
  OHLCVData,
  MarketDepth,
} from "../../types/provider";
import { ManagedProviderBase, type ProviderConfig } from "./base.provider";

export class MetaplexProvider extends ManagedProviderBase {
  private connection: Connection;
  private metaplex: Metaplex;

  constructor(
    config: ProviderConfig,
    logger: ManagedLoggingService,
    connection: Connection,
  ) {
    super(config, logger);
    this.connection = connection;
    this.metaplex = new Metaplex(connection);
  }

  protected override async initializeProvider(): Promise<void> {
    try {
      // Test connection
      await this.connection.getSlot();
      this.logger.info("Metaplex connection established");
    } catch (error) {
      this.logger.error("Failed to initialize Metaplex connection", { error });
      throw error;
    }
  }

  protected override async cleanupProvider(): Promise<void> {
    // No cleanup needed
  }

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

  public override getCapabilities(): ProviderCapabilities {
    return {
      canGetPrice: false,
      canGetOHLCV: false,
      canGetOrderBook: false,
    };
  }

  /**
   * Gets the NFT metadata for a given mint address
   * @param mintAddress The mint address of the NFT
   * @returns Promise<NFTMetadata>
   */
  public async getNFTMetadata(mintAddress: string): Promise<NFTMetadata> {
    try {
      const nft = await this.metaplex.nfts().findByMint({
        mintAddress: new PublicKey(mintAddress),
      });

      if (!nft) {
        throw new Error(`NFT not found for mint address: ${mintAddress}`);
      }

      return {
        name: nft.name,
        symbol: nft.symbol,
        description: nft.json?.description || "",
        image: nft.uri,
        attributes:
          (nft.json?.attributes as Array<{
            trait_type: string;
            value: string;
          }>) || [],
        collection: nft.collection?.address.toString(),
        creators:
          nft.creators?.map((creator) => ({
            address: creator.address.toString(),
            share: creator.share,
            verified: creator.verified,
          })) || [],
        royalties: {
          sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
          creators:
            nft.creators?.map((creator) => ({
              address: creator.address.toString(),
              share: creator.share,
            })) || [],
        },
        uses: nft.uses
          ? {
              useMethod: Number(nft.uses.useMethod),
              remaining: Number(nft.uses.remaining),
              total: Number(nft.uses.total),
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error("Failed to fetch NFT metadata", {
        mintAddress,
        error,
      });
      throw error;
    }
  }

  /**
   * Gets the collection metadata for a given collection address
   * @param collectionAddress The collection address
   * @returns Promise<CollectionMetadata>
   */
  public async getCollectionMetadata(
    collectionAddress: string,
  ): Promise<CollectionMetadata> {
    try {
      const collection = await this.metaplex.nfts().findByMint({
        mintAddress: new PublicKey(collectionAddress),
      });

      if (!collection) {
        throw new Error(
          `Collection not found for address: ${collectionAddress}`,
        );
      }

      return {
        name: collection.name,
        symbol: collection.symbol,
        description: collection.json?.description || "",
        image: collection.uri,
        attributes:
          (collection.json?.attributes as Array<{
            trait_type: string;
            value: string;
          }>) || [],
        creators:
          collection.creators?.map((creator) => ({
            address: creator.address.toString(),
            share: creator.share,
            verified: creator.verified,
          })) || [],
        royalties: {
          sellerFeeBasisPoints: collection.sellerFeeBasisPoints,
          creators:
            collection.creators?.map((creator) => ({
              address: creator.address.toString(),
              share: creator.share,
            })) || [],
        },
      };
    } catch (error) {
      this.logger.error("Failed to fetch collection metadata", {
        collectionAddress,
        error,
      });
      throw error;
    }
  }
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  collection?: string;
  creators: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  royalties: {
    sellerFeeBasisPoints: number;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
  uses?: {
    useMethod: number;
    remaining: number;
    total: number;
  };
}

export interface CollectionMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  creators: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  royalties: {
    sellerFeeBasisPoints: number;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}
