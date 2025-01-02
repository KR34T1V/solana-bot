/**
 * @file Tests for Managed Logging Service
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import winston from "winston";
import { ManagedLoggingService } from "../managed-logging.service";
import { ServiceStatus } from "../service.manager";

// Mock winston
vi.mock("winston", () => {
  const createMockLogger = () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    add: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  });

  const mockLogger = createMockLogger();

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

describe("ManagedLoggingService", () => {
  let loggingService: ManagedLoggingService;
  let mockLogger: ReturnType<typeof winston.createLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    mockLogger = winston.createLogger();
    loggingService = new ManagedLoggingService({
      logDir: "test-logs",
      maxSize: 1024 * 1024,
      maxFiles: 7,
      level: "debug",
      serviceName: "test-service",
    });
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.NODE_ENV;
  });

  describe("Service Interface", () => {
    it("should implement Service interface correctly", () => {
      expect(loggingService.getName()).toBe("logging-service");
      expect(loggingService.getStatus()).toBe(ServiceStatus.PENDING);
      expect(typeof loggingService.start).toBe("function");
      expect(typeof loggingService.stop).toBe("function");
    });

    it("should start service successfully", async () => {
      await loggingService.start();
      expect(loggingService.getStatus()).toBe(ServiceStatus.RUNNING);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Logging service started",
        expect.objectContaining({
          config: expect.any(Object),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should stop service successfully", async () => {
      // Start the service
      await loggingService.start();

      // Clear previous calls
      vi.mocked(mockLogger.info).mockClear();

      // Mock successful end
      vi.mocked(mockLogger.on).mockImplementation((event, callback) => {
        if (event === "finish") {
          setTimeout(() => callback(), 0);
        }
        return mockLogger;
      });

      // Stop the service
      await loggingService.stop();

      expect(loggingService.getStatus()).toBe(ServiceStatus.STOPPED);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Logging service stopping",
        expect.any(Object),
      );
    });

    it("should handle start errors correctly", async () => {
      vi.mocked(winston.createLogger).mockImplementationOnce(() => {
        throw new Error("Failed to create logger");
      });

      await expect(loggingService.start()).rejects.toThrow(
        "Failed to create logger",
      );
      expect(loggingService.getStatus()).toBe(ServiceStatus.ERROR);
    });

    it("should handle stop errors correctly", async () => {
      await loggingService.start();
      vi.mocked(mockLogger.info).mockClear();

      // Mock error during stop
      vi.mocked(mockLogger.on).mockImplementation((event, callback) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Failed to stop")), 0);
        }
        return mockLogger;
      });

      await expect(loggingService.stop()).rejects.toThrow("Failed to stop");
      expect(loggingService.getStatus()).toBe(ServiceStatus.ERROR);
    });
  });

  describe("Logging Methods", () => {
    beforeEach(async () => {
      await loggingService.start();
      vi.mocked(mockLogger.info).mockClear();
      vi.mocked(mockLogger.error).mockClear();
      vi.mocked(mockLogger.warn).mockClear();
      vi.mocked(mockLogger.debug).mockClear();
    });

    it("should not log when service is not running", async () => {
      // Mock successful stop
      vi.mocked(mockLogger.on).mockImplementation((event, callback) => {
        if (event === "finish") {
          setTimeout(() => callback(), 0);
        }
        return mockLogger;
      });

      await loggingService.stop();
      vi.mocked(mockLogger.info).mockClear();

      loggingService.info("Test message");
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log error messages with metadata", () => {
      const message = "Test error";
      const meta = { context: "test", userId: "123" };

      loggingService.error(message, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          ...meta,
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should log auth attempts", () => {
      const authData = {
        action: "login" as const,
        userId: "123",
        email: "test@example.com",
      };

      loggingService.logAuthAttempt(authData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Authentication attempt: login",
        expect.objectContaining({
          ...authData,
          type: "AUTH_ATTEMPT",
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should log trade executions", () => {
      const tradeData = {
        strategy: "TestStrategy",
        action: "BUY" as const,
        token: "SOL",
        amount: 1.5,
        price: 100.5,
      };

      loggingService.logTradeExecution(tradeData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Trade executed",
        expect.objectContaining({
          ...tradeData,
          type: "TRADE_EXECUTION",
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should log strategy signals", () => {
      const signalData = {
        strategy: "TestStrategy",
        signal: "BULLISH",
        indicators: {
          rsi: 70,
          macd: 0.5,
        },
      };

      loggingService.logStrategySignal(signalData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Strategy signal generated",
        expect.objectContaining({
          ...signalData,
          type: "STRATEGY_SIGNAL",
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await loggingService.start();
    });

    it("should handle logging errors gracefully", () => {
      const mockConsoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(mockLogger.info).mockImplementationOnce(() => {
        throw new Error("Logging failed");
      });

      const result = loggingService.testLogging();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });

    it("should log errors with stack traces", () => {
      const error = new Error("Test error");
      const context = { operation: "test" };

      loggingService.logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({
          ...context,
          stack: error.stack,
          type: "ERROR",
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe("Configuration", () => {
    it("should use default configuration values", () => {
      const defaultService = new ManagedLoggingService();
      expect(defaultService["LOG_DIR"]).toBe("logs");
      expect(defaultService["MAX_SIZE"]).toBe(20 * 1024 * 1024);
      expect(defaultService["MAX_FILES"]).toBe(14);
    });

    it("should use custom configuration values", () => {
      const customConfig = {
        logDir: "custom-logs",
        maxSize: 5 * 1024 * 1024,
        maxFiles: 5,
        level: "info",
        serviceName: "custom-service",
      };

      const customService = new ManagedLoggingService(customConfig);
      expect(customService["LOG_DIR"]).toBe(customConfig.logDir);
      expect(customService["MAX_SIZE"]).toBe(customConfig.maxSize);
      expect(customService["MAX_FILES"]).toBe(customConfig.maxFiles);
    });
  });
});
