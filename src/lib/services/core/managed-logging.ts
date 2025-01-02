/**
 * @file Service implementation for business logic
 * @version 1.0.0
 * @module lib/services/core/managed-logging
 * @author Development Team
 * @lastModified 2025-01-02
 */

import winston from "winston";
import { join } from "path";
import type { Service } from "../interfaces/service";
import { ServiceStatus } from "../core/service.manager";

// Standard metadata interface
type BaseMetadata = Record<string, unknown> & {
  type: string;
  timestamp?: Date;
  userId?: string;
  requestId?: string;
  ip?: string;
};

type AuthAction =
  | "register"
  | "login"
  | "logout"
  | "session_create"
  | "session_delete"
  | "account_lock";

type AuthMetadata = BaseMetadata & {
  email?: string;
  action: AuthAction;
  failureReason?: string;
  loginAttempts?: number;
  lockedUntil?: Date;
};

type TradeMetadata = BaseMetadata & {
  strategy: string;
  action: "BUY" | "SELL";
  token: string;
  amount: number;
  price: number;
};

type SignalMetadata = BaseMetadata & {
  strategy: string;
  signal: string;
  indicators: Record<string, number>;
};

interface LoggingConfig {
  logDir?: string;
  maxSize?: number;
  maxFiles?: number;
  level?: string;
  serviceName?: string;
}

const VALID_LOG_LEVELS = ["error", "warn", "info", "debug"];

export class ManagedLoggingService implements Service {
  private logger: winston.Logger = winston.createLogger();
  private readonly config: LoggingConfig;
  private serviceStatus: ServiceStatus;
  private readonly LOG_DIR: string;
  private readonly MAX_SIZE: number;
  private readonly MAX_FILES: number;

  constructor(config: LoggingConfig = {}) {
    // Validate log directory
    if (
      config.logDir !== undefined &&
      (!config.logDir || typeof config.logDir !== "string")
    ) {
      throw new Error("Invalid log directory");
    }

    // Validate log level
    if (config.level && !VALID_LOG_LEVELS.includes(config.level)) {
      throw new Error("Invalid log level");
    }

    this.config = config;
    this.LOG_DIR = config.logDir || "logs";
    this.MAX_SIZE = config.maxSize || 20 * 1024 * 1024; // 20MB
    this.MAX_FILES = config.maxFiles || 14; // 14 days
    this.serviceStatus = ServiceStatus.PENDING;
  }

  getName(): string {
    return "logging-service";
  }

  getStatus(): ServiceStatus {
    return this.serviceStatus;
  }

  async start(): Promise<void> {
    try {
      if (this.serviceStatus === ServiceStatus.RUNNING) {
        throw new Error("Service is already running");
      }

      if (this.serviceStatus === ServiceStatus.STARTING) {
        throw new Error("Service is already starting");
      }

      this.serviceStatus = ServiceStatus.STARTING;

      // Create logger instance with configuration
      this.logger = winston.createLogger({
        level:
          this.config.level ||
          (process.env.NODE_ENV === "production" ? "info" : "debug"),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        defaultMeta: { service: this.config.serviceName || "solana-bot" },
        transports: [
          // Write all logs with importance level of 'error' or less to error.log
          new winston.transports.File({
            filename: join(this.LOG_DIR, "error.log"),
            level: "error",
            maxsize: this.MAX_SIZE,
            maxFiles: this.MAX_FILES,
            tailable: true,
          }),
          // Write all logs with importance level of 'info' or less to combined.log
          new winston.transports.File({
            filename: join(this.LOG_DIR, "combined.log"),
            maxsize: this.MAX_SIZE,
            maxFiles: this.MAX_FILES,
            tailable: true,
          }),
        ],
      });

      // Add console transport in development
      if (process.env.NODE_ENV !== "production") {
        this.logger.add(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
        );
      }

      this.serviceStatus = ServiceStatus.RUNNING;
      this.info("Logging service started", { config: this.config });
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      console.error("Failed to start logging service:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.serviceStatus === ServiceStatus.STOPPED) {
        throw new Error("Service is already stopped");
      }

      if (this.serviceStatus === ServiceStatus.STOPPING) {
        throw new Error("Service is already stopping");
      }

      this.serviceStatus = ServiceStatus.STOPPING;

      // Close all transports
      await new Promise<void>((resolve, reject) => {
        this.logger.on("finish", resolve);
        this.logger.on("error", reject);
        this.logger.end();
      });

      this.serviceStatus = ServiceStatus.STOPPED;
    } catch (error) {
      this.serviceStatus = ServiceStatus.ERROR;
      console.error("Failed to stop logging service:", error);
      throw error;
    }
  }

  private enrichMetadata<T extends Record<string, unknown>>(
    meta: T,
  ): T & { timestamp: Date } {
    const timestamp =
      meta.timestamp instanceof Date ? meta.timestamp : new Date();
    return {
      ...meta,
      timestamp,
    };
  }

  private validateRunning(operation: string): void {
    if (this.serviceStatus !== ServiceStatus.RUNNING) {
      throw new Error(`Service not running: cannot ${operation}`);
    }
  }

  private canLog(): boolean {
    return this.serviceStatus === ServiceStatus.RUNNING;
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (!this.canLog()) return;
    this.logger.error(message, this.enrichMetadata(meta || {}));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (!this.canLog()) return;
    this.logger.warn(message, this.enrichMetadata(meta || {}));
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (!this.canLog()) return;
    this.logger.info(message, this.enrichMetadata(meta || {}));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (!this.canLog()) return;
    this.logger.debug(message, this.enrichMetadata(meta || {}));
  }

  // Error logging method
  logError(error: Error, context?: Record<string, unknown>) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...context,
      stack: error.stack,
      type: "ERROR",
    });
    this.error(error.message, metadata);
  }

  // Auth specific logging methods
  logAuthAttempt(data: Omit<AuthMetadata, "type" | "timestamp">) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_ATTEMPT",
    });
    this.info(`Authentication attempt: ${data.action}`, metadata);
  }

  logAuthSuccess(
    data: Omit<AuthMetadata, "type" | "timestamp" | "failureReason">,
  ) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_SUCCESS",
    });
    this.info(`Authentication successful: ${data.action}`, metadata);
  }

  logAuthFailure(data: Omit<AuthMetadata, "type" | "timestamp">) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_FAILURE",
    });
    this.error(`Authentication failed: ${data.action}`, metadata);
  }

  logAccountLock(data: Omit<AuthMetadata, "type" | "timestamp" | "action">) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      action: "account_lock" as AuthAction,
      type: "ACCOUNT_LOCK",
    });
    this.warn("Account locked", metadata);
  }

  // Trading specific logging methods
  logTradeExecution(data: Omit<TradeMetadata, "type" | "timestamp">) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      type: "TRADE_EXECUTION",
    });
    this.info("Trade executed", metadata);
  }

  // Strategy signal logging
  logStrategySignal(data: Omit<SignalMetadata, "type" | "timestamp">) {
    if (!this.canLog()) return;
    const metadata = this.enrichMetadata({
      ...data,
      type: "STRATEGY_SIGNAL",
    });
    this.debug("Strategy signal generated", metadata);
  }

  // Method to test if logging is properly configured
  testLogging(): boolean {
    if (this.serviceStatus !== ServiceStatus.RUNNING) return false;
    try {
      this.info("Test log message");
      return true;
    } catch (error) {
      console.error("Logging test failed:", error);
      return false;
    }
  }
}
