/**
 * @file Managed Logging Service Tests
 * @version 1.0.0
 * @description Test suite for the ManagedLoggingService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ManagedLoggingService } from "../managed-logging";
import { BaseServiceTest } from "../../__tests__/base-service.test";
import { ServiceStatus } from "../service.manager";
import { join } from "path";
import fs from "fs/promises";
import winston from "winston";

// Event listener types
type FinishListener = () => void;
type ErrorListener = (error: Error) => void;

interface LoggerEvents {
  finish: FinishListener[];
  error: ErrorListener[];
}

interface MockLogger {
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  listeners: LoggerEvents;
}

let currentMockLogger: MockLogger;

// Create a fresh mock logger instance
function createMockLogger(): MockLogger {
  currentMockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    end: vi.fn(function (this: MockLogger) {
      // Immediately call the 'finish' event listener
      this.listeners.finish.forEach((listener) => listener());
      return this;
    }),
    on: vi.fn(function (
      this: MockLogger,
      event: keyof LoggerEvents,
      listener: FinishListener | ErrorListener,
    ) {
      if (event === "error" && typeof listener === "function") {
        this.listeners.error.push(listener as ErrorListener);
      } else if (event === "finish" && typeof listener === "function") {
        this.listeners.finish.push(listener as FinishListener);
      }
      return this;
    }),
    add: vi.fn(),
    listeners: {
      finish: [],
      error: [],
    },
  };
  return currentMockLogger;
}

// Mock winston
vi.mock("winston", () => {
  return {
    default: {
      createLogger: vi.fn(() => currentMockLogger || createMockLogger()),
      format: {
        timestamp: vi.fn(),
        errors: vi.fn(),
        json: vi.fn(),
        combine: vi.fn(() => ({})),
        colorize: vi.fn(),
        simple: vi.fn(),
      },
      transports: {
        File: vi.fn(),
        Console: vi.fn(),
      },
    },
  };
});

class ManagedLoggingServiceTest extends BaseServiceTest {
  private tempDir: string = join(process.cwd(), "test-logs");

  protected createService(): ManagedLoggingService {
    return new ManagedLoggingService({
      logDir: this.tempDir,
      maxSize: 1024,
      maxFiles: 2,
      level: "debug",
      serviceName: "test-service",
    });
  }

  public beforeAll(): void {
    super.beforeAll();

    describe("Managed Logging Service Specific Tests", () => {
      let loggingService: ManagedLoggingService;

      beforeEach(async () => {
        // Create a fresh mock logger
        createMockLogger();

        // Create temp directory
        await fs.mkdir(this.tempDir, { recursive: true });
        loggingService = this.createService();
        await loggingService.start();
      });

      afterEach(async () => {
        try {
          if (loggingService.getStatus() !== ServiceStatus.STOPPED) {
            await loggingService.stop();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
        // Clean up temp directory
        await fs.rm(this.tempDir, { recursive: true, force: true });
      });

      it("should configure winston logger on start", async () => {
        expect(winston.createLogger).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "debug",
            defaultMeta: expect.objectContaining({
              service: "test-service",
            }),
          }),
        );
      });

      it("should not log when service is not running", async () => {
        await loggingService.stop();

        // Clear previous calls
        currentMockLogger.info.mockClear();

        loggingService.info("test message");
        expect(currentMockLogger.info).not.toHaveBeenCalled();
      });

      it("should log with correct log levels", async () => {
        const testMessage = "test message";
        const testMeta = { test: "meta" };

        loggingService.error(testMessage, testMeta);
        loggingService.warn(testMessage, testMeta);
        loggingService.info(testMessage, testMeta);
        loggingService.debug(testMessage, testMeta);

        expect(currentMockLogger.error).toHaveBeenCalledWith(
          testMessage,
          expect.objectContaining(testMeta),
        );
        expect(currentMockLogger.warn).toHaveBeenCalledWith(
          testMessage,
          expect.objectContaining(testMeta),
        );
        expect(currentMockLogger.info).toHaveBeenCalledWith(
          testMessage,
          expect.objectContaining(testMeta),
        );
        expect(currentMockLogger.debug).toHaveBeenCalledWith(
          testMessage,
          expect.objectContaining(testMeta),
        );
      });

      it("should enrich metadata with timestamp", async () => {
        const testMessage = "test message";
        const testMeta = { test: "meta" };

        loggingService.info(testMessage, testMeta);

        expect(currentMockLogger.info).toHaveBeenCalledWith(
          testMessage,
          expect.objectContaining({
            ...testMeta,
            timestamp: expect.any(Date),
          }),
        );
      });

      it("should log auth attempts correctly", async () => {
        const authData = {
          action: "login" as const,
          email: "test@example.com",
          userId: "123",
          requestId: "req-123",
        };

        loggingService.logAuthAttempt(authData);

        expect(currentMockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Authentication attempt"),
          expect.objectContaining({
            ...authData,
            type: "AUTH_ATTEMPT",
            timestamp: expect.any(Date),
          }),
        );
      });

      it("should log trade executions correctly", async () => {
        const tradeData = {
          strategy: "test-strategy",
          action: "BUY" as const,
          token: "SOL",
          amount: 1.0,
          price: 100.0,
        };

        loggingService.logTradeExecution(tradeData);

        expect(currentMockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("Trade executed"),
          expect.objectContaining({
            ...tradeData,
            type: "TRADE_EXECUTION",
            timestamp: expect.any(Date),
          }),
        );
      });

      it("should handle errors during start", async () => {
        const errorService = new ManagedLoggingService();
        vi.mocked(winston.createLogger).mockImplementationOnce(() => {
          throw new Error("Failed to create logger");
        });

        await expect(errorService.start()).rejects.toThrow(
          "Failed to create logger",
        );
        expect(errorService.getStatus()).toBe(ServiceStatus.ERROR);
      });

      it("should handle errors during stop", async () => {
        currentMockLogger.end.mockImplementationOnce(function (
          this: MockLogger,
        ) {
          this.listeners.error.forEach((listener) =>
            listener(new Error("Failed to close logger")),
          );
          return this;
        });

        await expect(loggingService.stop()).rejects.toThrow(
          "Failed to close logger",
        );
        expect(loggingService.getStatus()).toBe(ServiceStatus.ERROR);
      });

      it("should test logging functionality", async () => {
        expect(loggingService.testLogging()).toBe(true);
        expect(currentMockLogger.info).toHaveBeenCalledWith(
          "Test log message",
          expect.objectContaining({
            timestamp: expect.any(Date),
          }),
        );
      });

      it("should log errors with stack traces", async () => {
        const error = new Error("Test error");
        const context = { source: "test" };

        loggingService.logError(error, context);

        expect(currentMockLogger.error).toHaveBeenCalledWith(
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
  }
}

// Create an instance and run the tests
new ManagedLoggingServiceTest().beforeAll();
