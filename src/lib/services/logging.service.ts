import winston from "winston";
import { join } from "path";

// Test pre-commit hook: Adding a comment to trigger change
const LOG_DIR = "logs";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_FILES = 14; // 14 days worth of files

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

class LoggingService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: "solana-bot" },
      transports: [
        // Write all logs with importance level of 'error' or less to error.log
        new winston.transports.File({
          filename: join(LOG_DIR, "error.log"),
          level: "error",
          maxsize: MAX_SIZE,
          maxFiles: MAX_FILES,
          tailable: true,
        }),
        // Write all logs with importance level of 'info' or less to combined.log
        new winston.transports.File({
          filename: join(LOG_DIR, "combined.log"),
          maxsize: MAX_SIZE,
          maxFiles: MAX_FILES,
          tailable: true,
        }),
      ],
    });

    // If we're not in production, log to the console with custom format
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

  error(message: string, meta?: Record<string, unknown>) {
    this.logger.error(message, this.enrichMetadata(meta || {}));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, this.enrichMetadata(meta || {}));
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(message, this.enrichMetadata(meta || {}));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.logger.debug(message, this.enrichMetadata(meta || {}));
  }

  // Auth specific logging methods
  logAuthAttempt(data: Omit<AuthMetadata, "type" | "timestamp">) {
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_ATTEMPT",
    });
    this.info(`Authentication attempt: ${data.action}`, metadata);
  }

  logAuthSuccess(
    data: Omit<AuthMetadata, "type" | "timestamp" | "failureReason">,
  ) {
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_SUCCESS",
    });
    this.info(`Authentication successful: ${data.action}`, metadata);
  }

  logAuthFailure(data: Omit<AuthMetadata, "type" | "timestamp">) {
    const metadata = this.enrichMetadata({
      ...data,
      type: "AUTH_FAILURE",
    });
    this.error(`Authentication failed: ${data.action}`, metadata);
  }

  logAccountLock(data: Omit<AuthMetadata, "type" | "timestamp" | "action">) {
    const metadata = this.enrichMetadata({
      ...data,
      action: "account_lock" as AuthAction,
      type: "ACCOUNT_LOCK",
    });
    this.warn("Account locked", metadata);
  }

  // Trading specific logging methods
  logTradeExecution(data: Omit<TradeMetadata, "type" | "timestamp">) {
    const metadata = this.enrichMetadata({
      ...data,
      type: "TRADE_EXECUTION",
    });
    this.info("Trade executed", metadata);
  }

  logStrategySignal(data: Omit<SignalMetadata, "type" | "timestamp">) {
    const metadata = this.enrichMetadata({
      ...data,
      type: "STRATEGY_SIGNAL",
    });
    this.debug("Strategy signal generated", metadata);
  }

  logError(error: Error, context?: Record<string, unknown>) {
    const metadata = this.enrichMetadata({
      ...context,
      stack: error.stack,
      type: "ERROR",
    });
    this.error(error.message, metadata);
  }

  // Method to test if logging is properly configured
  testLogging(): boolean {
    try {
      this.info("Test log message");
      return true;
    } catch (error) {
      console.error("Logging test failed:", error);
      return false;
    }
  }
}

// Export as singleton
export const logger = new LoggingService();
