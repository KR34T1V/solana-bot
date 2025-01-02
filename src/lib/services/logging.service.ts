import winston from "winston";
import { join } from "path";

const LOG_DIR = "logs";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_FILES = 14; // 14 days worth of files

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

  error(message: string, meta?: Record<string, unknown>) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.logger.debug(message, meta);
  }

  // Trading specific logging methods
  logTradeExecution(data: {
    strategy: string;
    action: "BUY" | "SELL";
    token: string;
    amount: number;
    price: number;
    timestamp: Date;
  }) {
    this.info("Trade executed", { ...data, type: "TRADE_EXECUTION" });
  }

  logStrategySignal(data: {
    strategy: string;
    signal: string;
    indicators: Record<string, number>;
    timestamp: Date;
  }) {
    this.debug("Strategy signal generated", {
      ...data,
      type: "STRATEGY_SIGNAL",
    });
  }

  logError(error: Error, context?: Record<string, unknown>) {
    this.error(error.message, {
      ...context,
      stack: error.stack,
      type: "ERROR",
    });
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
