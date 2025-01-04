/**
 * @file Service implementation for business logic
 * @version 1.1.0
 * @module lib/services/providers/base.provider
 * @author Development Team
 * @lastModified 2025-01-04
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
import { EventEmitter } from "events";

export type {
  BaseProvider,
  PriceData,
  OHLCVData,
  MarketDepth,
  ProviderCapabilities,
};

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
  circuitBreakerThreshold?: number;
  adaptiveRateLimiting?: boolean;
  batchingEnabled?: boolean;
  batchTimeoutMs?: number;
  healthCheckIntervalMs?: number;
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
  reject: (reason: Error) => void;
  queuedAt: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  nextRetry: number;
}

interface BatchOperation<T> {
  operation: () => Promise<T>;
  key: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export interface ProviderError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProviderMetrics {
  requestLatency: number[];
  errorRates: Map<string, number>;
  cacheHitRate: number;
  queueLength: number[];
  totalProcessed: number;
  totalErrors: number;
  avgProcessingTime: number;
  maxQueueLength: number;
  priorityStats: Map<number, { count: number; avgWaitTime: number }>;
}

export interface EndpointHealth {
  isHealthy: boolean;
  lastCheck: number;
  errorRate: number;
  latency: number;
  metrics: ProviderMetrics;
}

export interface MetricsManager {
  recordLatency(endpoint: string, latency: number): void;
  recordError(endpoint: string, error: Error): void;
  recordSuccess(endpoint: string): void;
  getMetrics(): ProviderMetrics;
}

export interface ResourcePool<T> {
  acquire(): Promise<T>;
  release(resource: T): void;
  status(): ResourceStatus;
}

export interface ResourceStatus {
  available: number;
  inUse: number;
  maxSize: number;
}

export interface ConnectionConfig {
  maxPoolSize: number;
  minPoolSize: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
}

export abstract class ManagedProviderBase implements Service, BaseProvider {
  protected status: ServiceStatus = ServiceStatus.PENDING;
  protected readonly logger: ManagedLoggingService;
  protected readonly config: ProviderConfig;
  protected readonly eventEmitter: EventEmitter;
  
  private readonly rateLimitStates: Map<string, RateLimitState> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly operationQueue: QueuedOperation<unknown>[] = [];
  private readonly cache: Map<string, CachedData<unknown>> = new Map();
  private readonly batchOperations: Map<string, BatchOperation<unknown>[]> = new Map();

  constructor(config: ProviderConfig, logger: ManagedLoggingService) {
    this.config = config;
    this.logger = logger;
    this.eventEmitter = new EventEmitter();
  }

  public getName(): string {
    return this.config.name;
  }

  public getStatus(): ServiceStatus {
    return this.status;
  }

  public async start(): Promise<void> {
    if (this.status === ServiceStatus.RUNNING) {
      throw new ServiceError("Service is already running", "INVALID_STATE", false);
    }

    try {
      this.status = ServiceStatus.STARTING;
      await this.initializeProvider();
      this.status = ServiceStatus.RUNNING;
      this.logger.info(`Provider ${this.getName()} started successfully`);
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to start provider ${this.getName()}`, { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.status === ServiceStatus.STOPPED) {
      throw new ServiceError("Service is already stopped", "INVALID_STATE", false);
    }

    try {
      this.status = ServiceStatus.STOPPING;
      await this.cleanupProvider();
      this.status = ServiceStatus.STOPPED;
      this.logger.info(`Provider ${this.getName()} stopped successfully`);
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to stop provider ${this.getName()}`, { error });
      throw error;
    }
  }

  public async getPrice(tokenMint: string): Promise<PriceData> {
    return this.executeOperation("getPrice", () => this.getPriceImpl(tokenMint));
  }

  public async getOrderBook(tokenMint: string, limit?: number): Promise<MarketDepth> {
    return this.executeOperation("getOrderBook", () => this.getOrderBookImpl(tokenMint, limit));
  }

  public async getOHLCV(tokenMint: string, timeframe: number, limit?: number): Promise<OHLCVData> {
    return this.executeOperation("getOHLCV", () => this.getOHLCVImpl(tokenMint, timeframe, limit));
  }

  protected abstract initializeProvider(): Promise<void>;
  protected abstract cleanupProvider(): Promise<void>;
  protected abstract getPriceImpl(tokenMint: string): Promise<PriceData>;
  protected abstract getOrderBookImpl(tokenMint: string, limit?: number): Promise<MarketDepth>;
  protected abstract getOHLCVImpl(tokenMint: string, timeframe: number, limit?: number): Promise<OHLCVData>;
  public abstract getCapabilities(): ProviderCapabilities;

  protected getRateLimitConfig(_endpoint: string): RateLimitConfig {
    return {
      windowMs: this.config.rateLimitMs || 1000,
      maxRequests: this.config.maxRequestsPerWindow || 10,
      burstLimit: this.config.burstLimit || 2,
      priority: 1
    };
  }

  private async executeOperation<T>(endpoint: string, operation: () => Promise<T>): Promise<T> {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new ServiceError("Service is not running", "INVALID_STATE", false);
    }

    const rateLimitConfig = this.getRateLimitConfig(endpoint);
    await this.checkRateLimit(endpoint, rateLimitConfig);
    await this.checkCircuitBreaker(endpoint);

    try {
      const result = await operation();
      this.updateCircuitBreaker(endpoint, true);
      return result;
    } catch (error) {
      this.updateCircuitBreaker(endpoint, false);
      throw error;
    }
  }

  private async checkRateLimit(endpoint: string, config: RateLimitConfig): Promise<void> {
    let state = this.rateLimitStates.get(endpoint);
    if (!state) {
      state = {
        windowStart: Date.now(),
        requestCount: 0,
        tokenBucket: config.burstLimit,
        lastRefill: Date.now()
      };
      this.rateLimitStates.set(endpoint, state);
    }

    const now = Date.now();
    if (now - state.windowStart >= config.windowMs) {
      state.windowStart = now;
      state.requestCount = 0;
    }

    if (state.requestCount >= config.maxRequests) {
      throw new ServiceError(
        "Rate limit exceeded",
        "RATE_LIMIT_EXCEEDED",
        true,
        { endpoint, config }
      );
    }

    state.requestCount++;
  }

  private async checkCircuitBreaker(endpoint: string): Promise<void> {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return;

    if (breaker.isOpen) {
      if (Date.now() < breaker.nextRetry) {
        throw new ServiceError(
          "Circuit breaker is open",
          "CIRCUIT_BREAKER_OPEN",
          true,
          { endpoint, nextRetry: breaker.nextRetry }
        );
      }
    }
  }

  private updateCircuitBreaker(endpoint: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        nextRetry: 0
      };
      this.circuitBreakers.set(endpoint, breaker);
    }

    if (success) {
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= (this.config.circuitBreakerThreshold || 5)) {
        breaker.isOpen = true;
        breaker.nextRetry = Date.now() + 30000; // 30 second timeout
      }
    }
  }
}
