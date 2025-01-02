/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/providers/base.provider
 * @author Development Team
 * @lastModified 2025-01-02
 */

import type { Service } from "../core/service.manager";
import { ServiceStatus } from "../core/service.manager";
import type { ManagedLoggingService } from "../core/managed-logging";
import type {
  BaseProvider,
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
} from "../../types/provider";

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export interface ProviderConfig {
  name: string;
  version: string;
  cacheTimeout?: number;
  retryAttempts?: number;
  rateLimitMs?: number;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

export abstract class ManagedProviderBase implements Service, BaseProvider {
  protected status: ServiceStatus = ServiceStatus.PENDING;
  protected readonly config: ProviderConfig;
  protected readonly logger: ManagedLoggingService;
  protected cache: Map<string, CachedData<any>>;
  protected lastRequest: number = 0;

  constructor(config: ProviderConfig, logger: ManagedLoggingService) {
    this.config = {
      cacheTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      rateLimitMs: 100,
      ...config,
    };
    this.logger = logger;
    this.cache = new Map();
  }

  // Service Interface Implementation
  getName(): string {
    return this.config.name;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  async start(): Promise<void> {
    try {
      if (this.status === ServiceStatus.RUNNING) {
        throw new ServiceError(
          "Provider already running",
          "ALREADY_RUNNING",
          false,
        );
      }

      this.status = ServiceStatus.STARTING;
      this.logger.info("Starting provider", { provider: this.getName() });

      await this.initializeProvider();

      this.status = ServiceStatus.RUNNING;
      this.logger.info("Provider started", { provider: this.getName() });
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error("Failed to start provider", {
        provider: this.getName(),
        error,
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.status === ServiceStatus.STOPPED) {
        throw new ServiceError(
          "Provider already stopped",
          "ALREADY_STOPPED",
          false,
        );
      }

      this.status = ServiceStatus.STOPPING;
      this.logger.info("Stopping provider", { provider: this.getName() });

      await this.cleanupProvider();
      this.cache.clear();

      this.status = ServiceStatus.STOPPED;
      this.logger.info("Provider stopped", { provider: this.getName() });
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error("Failed to stop provider", {
        provider: this.getName(),
        error,
      });
      throw error;
    }
  }

  // Provider Interface Implementation
  abstract getCapabilities(): ProviderCapabilities;

  // Abstract methods that must be implemented by providers
  protected abstract initializeProvider(): Promise<void>;
  protected abstract cleanupProvider(): Promise<void>;
  protected abstract getPriceImpl(tokenMint: string): Promise<PriceData>;
  protected abstract getOrderBookImpl(
    tokenMint: string,
    limit?: number,
  ): Promise<MarketDepth>;
  protected abstract getOHLCVImpl(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData>;

  // Public interface methods
  async getPrice(tokenMint: string): Promise<PriceData> {
    this.validateRunning();
    return this.withRateLimit(() => this.getPriceImpl(tokenMint));
  }

  async getOrderBook(tokenMint: string, limit?: number): Promise<MarketDepth> {
    this.validateRunning();
    return this.withRateLimit(() => this.getOrderBookImpl(tokenMint, limit));
  }

  async getOHLCV(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData> {
    this.validateRunning();
    return this.withRateLimit(() =>
      this.getOHLCVImpl(tokenMint, timeframe, limit),
    );
  }

  // Protected utility methods
  protected validateRunning(): void {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new ServiceError(
        `Provider ${this.getName()} is not running`,
        "NOT_RUNNING",
        false,
      );
    }
  }

  protected async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const waitTime = Math.max(
      0,
      this.config.rateLimitMs! - timeSinceLastRequest,
    );

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now(); // Update after waiting to ensure precise timing
  }

  protected async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.enforceRateLimit();
    return operation();
  }

  // Cache management methods
  protected getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTimeout!) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  protected setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  protected validateOperation(
    operation: string,
    capability: keyof ProviderCapabilities,
  ): void {
    this.validateRunning();
    if (!this.getCapabilities()[capability]) {
      throw new ServiceError(
        `Operation ${operation} not supported by provider ${this.getName()}`,
        "OPERATION_NOT_SUPPORTED",
        false,
      );
    }
  }

  protected async handleOperation<T>(
    operation: () => Promise<T>,
    description: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`Failed to ${description.toLowerCase()}`, { error });
      throw error;
    }
  }
}
