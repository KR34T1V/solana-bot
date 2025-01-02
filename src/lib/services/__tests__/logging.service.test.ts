import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import winston from "winston";
import { join } from "path";

// Mock winston
vi.mock("winston", () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    add: vi.fn(),
  };

  const mockFormat = {
    combine: vi.fn().mockReturnValue("combined-format"),
    timestamp: vi.fn().mockReturnValue("timestamp-format"),
    errors: vi.fn().mockReturnValue("errors-format"),
    json: vi.fn().mockReturnValue("json-format"),
    colorize: vi.fn().mockReturnValue("colorize-format"),
    simple: vi.fn().mockReturnValue("simple-format"),
  };

  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      format: mockFormat,
      transports: {
        File: vi.fn().mockImplementation((config) => ({
          ...config,
          level: config.level || "info",
        })),
        Console: vi.fn().mockImplementation((config) => ({
          ...config,
          level: "debug",
        })),
      },
    },
  };
});

describe("LoggingService", () => {
  let mockLogger: ReturnType<typeof winston.createLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    mockLogger = winston.createLogger();
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.NODE_ENV;
  });

  describe("Logger Configuration", () => {
    it("should configure file transports correctly", async () => {
      // Clear the module cache to force new instance
      vi.resetModules();

      // Import the logger to trigger configuration
      const { logger } = await import("../logging.service");
      expect(logger).toBeDefined();

      // Verify File transport configuration
      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(winston.transports.File).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          filename: join("logs", "error.log"),
          level: "error",
          maxsize: 20 * 1024 * 1024,
          maxFiles: 14,
          tailable: true,
        }),
      );
      expect(winston.transports.File).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          filename: join("logs", "combined.log"),
          maxsize: 20 * 1024 * 1024,
          maxFiles: 14,
          tailable: true,
        }),
      );
    });

    it("should add console transport in development", async () => {
      // Clear the module cache to force new instance
      vi.resetModules();
      process.env.NODE_ENV = "development";

      // Import the logger to trigger configuration
      const { logger } = await import("../logging.service");
      expect(logger).toBeDefined();

      // Verify Console transport configuration
      expect(winston.format.combine).toHaveBeenCalled();
      expect(winston.format.colorize).toHaveBeenCalled();
      expect(winston.format.simple).toHaveBeenCalled();

      expect(winston.transports.Console).toHaveBeenCalledTimes(1);
      expect(winston.transports.Console).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "combined-format",
        }),
      );
    });

    it("should not add console transport in production", async () => {
      // Clear the module cache to force new instance
      vi.resetModules();
      process.env.NODE_ENV = "production";

      // Import the logger to trigger configuration
      const { logger } = await import("../logging.service");
      expect(logger).toBeDefined();

      expect(winston.transports.Console).not.toHaveBeenCalled();
    });
  });

  describe("Basic logging methods", () => {
    it("should log error messages with metadata", async () => {
      const { logger } = await import("../logging.service");
      const message = "Test error";
      const meta = { context: "test", userId: "123" };

      logger.error(message, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, meta);
    });

    it("should log warning messages with metadata", async () => {
      const { logger } = await import("../logging.service");
      const message = "Test warning";
      const meta = { context: "test", operation: "backup" };

      logger.warn(message, meta);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    it("should log info messages with metadata", async () => {
      const { logger } = await import("../logging.service");
      const message = "Test info";
      const meta = { context: "test", duration: 1500 };

      logger.info(message, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(message, meta);
    });

    it("should log debug messages with metadata", async () => {
      const { logger } = await import("../logging.service");
      const message = "Test debug";
      const meta = { context: "test", query: "SELECT *" };

      logger.debug(message, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, meta);
    });

    it("should handle undefined metadata", async () => {
      const { logger } = await import("../logging.service");
      const message = "Test message";

      logger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe("Trading specific logging methods", () => {
    it("should log buy trade executions", async () => {
      const { logger } = await import("../logging.service");
      const tradeData = {
        strategy: "TestStrategy",
        action: "BUY" as const,
        token: "SOL",
        amount: 1.5,
        price: 100.5,
        timestamp: new Date("2024-01-01T12:00:00Z"),
      };

      logger.logTradeExecution(tradeData);

      expect(mockLogger.info).toHaveBeenCalledWith("Trade executed", {
        ...tradeData,
        type: "TRADE_EXECUTION",
      });
    });

    it("should log sell trade executions", async () => {
      const { logger } = await import("../logging.service");
      const tradeData = {
        strategy: "TestStrategy",
        action: "SELL" as const,
        token: "SOL",
        amount: 1.5,
        price: 105.5,
        timestamp: new Date("2024-01-01T12:00:00Z"),
      };

      logger.logTradeExecution(tradeData);

      expect(mockLogger.info).toHaveBeenCalledWith("Trade executed", {
        ...tradeData,
        type: "TRADE_EXECUTION",
      });
    });

    it("should log strategy signals with indicators", async () => {
      const { logger } = await import("../logging.service");
      const signalData = {
        strategy: "TestStrategy",
        signal: "BULLISH",
        indicators: {
          rsi: 70,
          macd: 0.5,
          volume: 1000000,
          price: 102.5,
        },
        timestamp: new Date("2024-01-01T12:00:00Z"),
      };

      logger.logStrategySignal(signalData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Strategy signal generated",
        { ...signalData, type: "STRATEGY_SIGNAL" },
      );
    });

    it("should log errors with stack traces and context", async () => {
      const { logger } = await import("../logging.service");
      const error = new Error("Test error");
      const context = {
        operation: "trade_execution",
        strategy: "TestStrategy",
        token: "SOL",
      };

      logger.logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        ...context,
        stack: error.stack,
        type: "ERROR",
      });
    });

    it("should log errors without context", async () => {
      const { logger } = await import("../logging.service");
      const error = new Error("Test error");

      logger.logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        stack: error.stack,
        type: "ERROR",
      });
    });
  });

  describe("Error handling", () => {
    it("should handle logging errors gracefully", async () => {
      const { logger } = await import("../logging.service");
      const mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Force the info method to throw an error
      vi.mocked(mockLogger.info).mockImplementationOnce(() => {
        throw new Error("Logging failed");
      });

      const result = logger.testLogging();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });
  });
});
