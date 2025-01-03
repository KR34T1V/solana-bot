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
  rateLimitMs?: number;
  maxRequestsPerWindow?: number;
  burstLimit?: number;
  retryAttempts?: number;
  cacheTimeout?: number;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstLimit: number;
  priority: number;
}

interface RateLimitState {
  windowStart: number;
  requestCount: number;
  tokenBucket: number;
  lastRefill: number;
}

interface QueuedOperation<T> {
  operation: () => Promise<T>;
  priority: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  queuedAt: number;
}

export abstract class ManagedProviderBase implements Service, BaseProvider {
  protected status: ServiceStatus = ServiceStatus.PENDING;
  protected config: ProviderConfig;
  protected logger: ManagedLoggingService;
  protected cache: Map<string, CachedData<any>>;
  protected lastRequest: number;
  protected operationQueue: QueuedOperation<any>[] = [];
  protected isProcessingQueue: boolean = false;

  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private queueMetrics = {
    totalProcessed: 0,
    totalErrors: 0,
    avgProcessingTime: 0,
    maxQueueLength: 0,
    priorityStats: new Map<number, { count: number; avgWaitTime: number }>(),
  };

  constructor(config: ProviderConfig, logger: ManagedLoggingService) {
    // Validate required config fields
    if (!config.name || config.name.trim() === "") {
      throw new ServiceError(
        "Provider name cannot be empty",
        "INVALID_CONFIG",
        false,
      );
    }
    if (!config.version || config.version.trim() === "") {
      throw new ServiceError(
        "Provider version cannot be empty",
        "INVALID_CONFIG",
        false,
      );
    }

    this.config = {
      cacheTimeout: 30000,
      retryAttempts: 3,
      rateLimitMs: 100,
      ...config,
    };
    this.logger = logger;
    this.cache = new Map();
    this.lastRequest = 0;
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
    return this.withRateLimit(() => this.getPriceImpl(tokenMint), "getPrice");
  }

  async getOrderBook(tokenMint: string, limit?: number): Promise<MarketDepth> {
    this.validateRunning();
    return this.withRateLimit(
      () => this.getOrderBookImpl(tokenMint, limit),
      "getOrderBook",
    );
  }

  async getOHLCV(
    tokenMint: string,
    timeframe: number,
    limit: number,
  ): Promise<OHLCVData> {
    this.validateRunning();
    return this.withRateLimit(
      () => this.getOHLCVImpl(tokenMint, timeframe, limit),
      "getOHLCV",
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

  protected getRateLimitConfig(_endpoint: string): RateLimitConfig {
    return {
      windowMs: this.config.rateLimitMs || 1000,
      maxRequests: this.config.maxRequestsPerWindow || 10,
      burstLimit: this.config.burstLimit || 5,
      priority: 1,
    };
  }

  protected getOperationPriority(endpoint: string): number {
    switch (endpoint) {
      case "getOrderBook":
        return 3; // Highest priority
      case "getOHLCV":
        return 2;
      case "getPrice":
      default:
        return 1;
    }
  }

  protected async enforceRateLimit(endpoint: string): Promise<void> {
    const config = this.getRateLimitConfig(endpoint);
    let state = this.rateLimitStates.get(endpoint);

    if (!state) {
      state = {
        windowStart: Date.now(),
        requestCount: 0,
        tokenBucket: config.burstLimit,
        lastRefill: Date.now(),
      };
      this.rateLimitStates.set(endpoint, state);
    }

    const now = Date.now();
    const windowElapsed = now - state.windowStart;
    const timeSinceLastRequest = now - this.lastRequest;

    // Calculate required delay
    let requiredDelay = 0;

    // Add minimum delay between requests if needed
    if (timeSinceLastRequest < config.windowMs) {
      requiredDelay = Math.max(
        requiredDelay,
        config.windowMs - timeSinceLastRequest,
      );
    }

    // Add rate limit delay if needed
    if (state.requestCount >= config.maxRequests) {
      const windowRemainder = config.windowMs - windowElapsed;
      requiredDelay = Math.max(
        requiredDelay,
        windowRemainder > 0 ? windowRemainder : config.windowMs,
      );

      // Reset state after window
      state.windowStart = now + requiredDelay;
      state.requestCount = 0;
      state.tokenBucket = config.burstLimit;
    }

    // Apply delay if needed
    if (requiredDelay > 0) {
      this.logger.debug("Rate limiting request", {
        endpoint,
        delay: requiredDelay,
        requestCount: state.requestCount,
        windowElapsed,
      });
      await new Promise((resolve) => setTimeout(resolve, requiredDelay));
    }

    // Update state
    state.requestCount++;
    this.lastRequest = Date.now();
  }

  protected async withRateLimit<T>(
    operation: () => Promise<T>,
    endpoint: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const priority = this.getOperationPriority(endpoint);
      const queuedOperation: QueuedOperation<T> = {
        operation: async () => {
          await this.enforceRateLimit(endpoint);
          return operation();
        },
        priority,
        resolve,
        reject,
        queuedAt: Date.now(),
      };

      // Find insertion point maintaining priority order
      const insertIndex = this.operationQueue.findIndex(
        (op) =>
          op.priority < priority ||
          (op.priority === priority && op.queuedAt > queuedOperation.queuedAt),
      );

      // Insert operation at correct position
      if (insertIndex === -1) {
        this.operationQueue.push(queuedOperation);
      } else {
        this.operationQueue.splice(insertIndex, 0, queuedOperation);
      }

      // Log queue state for debugging
      this.logger.debug("Queue state after insert", {
        queueLength: this.operationQueue.length,
        insertedPriority: priority,
        queuePriorities: this.operationQueue.map((op) => op.priority),
        endpoint,
      });

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        setImmediate(() => this.processQueue());
      }
    });
  }

  private updateQueueMetrics(
    operation: QueuedOperation<any>,
    processingTime: number,
  ) {
    // Update general metrics
    this.queueMetrics.totalProcessed++;
    this.queueMetrics.maxQueueLength = Math.max(
      this.queueMetrics.maxQueueLength,
      this.operationQueue.length,
    );

    // Update priority stats
    const stats = this.queueMetrics.priorityStats.get(operation.priority) || {
      count: 0,
      avgWaitTime: 0,
    };
    const waitTime = Date.now() - operation.queuedAt;
    stats.count++;
    stats.avgWaitTime =
      (stats.avgWaitTime * (stats.count - 1) + waitTime) / stats.count;
    this.queueMetrics.priorityStats.set(operation.priority, stats);

    // Update average processing time
    this.queueMetrics.avgProcessingTime =
      (this.queueMetrics.avgProcessingTime *
        (this.queueMetrics.totalProcessed - 1) +
        processingTime) /
      this.queueMetrics.totalProcessed;

    // Log metrics periodically
    if (this.queueMetrics.totalProcessed % 100 === 0) {
      this.logger.info("Queue metrics", {
        metrics: this.getQueueMetrics(),
        provider: this.getName(),
      });
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process highest priority operation
      const operation = this.operationQueue[0];
      const startTime = Date.now();

      try {
        const result = await operation.operation();
        operation.resolve(result);
        this.updateQueueMetrics(operation, Date.now() - startTime);
      } catch (error) {
        operation.reject(error);
        this.queueMetrics.totalErrors++;
        this.logger.error("Operation failed", {
          error,
          priority: operation.priority,
          queuedAt: operation.queuedAt,
          processingTime: Date.now() - startTime,
        });
      } finally {
        // Remove processed operation
        this.operationQueue.shift();
      }
    } finally {
      this.isProcessingQueue = false;

      // Continue processing if there are more operations
      if (this.operationQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
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

  protected getQueueMetrics() {
    return { ...this.queueMetrics };
  }
}
