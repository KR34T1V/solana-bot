/**
 * @file Managed Auth Service Tests
 * @version 1.0.0
 * @description Test suite for the ManagedAuthService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ManagedAuthService } from "../managed-auth";
import { BaseServiceTest } from "../../__tests__/base-service.test";
import { ServiceStatus } from "../service.manager";
import { PrismaClient, type User } from "@prisma/client";
import { AuthenticationError, ValidationError } from "$lib/utils/errors";
import type { ManagedLoggingService } from "../managed-logging";
import type { LoginCredentials, RegistrationData } from "$lib/types/auth";

// Mock implementations
const mockPrismaClient = {
  $connect: vi.fn(async () => {}),
  $disconnect: vi.fn(async () => {}),
  user: {
    findUnique: vi.fn(async () => null as User | null),
    create: vi.fn(async () => null as User | null),
    update: vi.fn(async () => null as User | null),
  },
  session: {
    create: vi.fn(async () => null as any),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
};

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

// Mock bcrypt with proper types
const mockBcrypt = {
  hash: vi.fn().mockImplementation(async () => "hashed_password"),
  compare: vi.fn().mockImplementation(async () => true),
};
vi.mock("bcryptjs", () => mockBcrypt);

vi.mock("$lib/utils/jwt", () => ({
  generateToken: vi.fn(async () => "test_token"),
}));

// Mock logger
const createMockLogger = () => ({
  info: vi.fn(() => {}),
  error: vi.fn(() => {}),
  warn: vi.fn(() => {}),
  debug: vi.fn(() => {}),
  logAuthAttempt: vi.fn(() => {}),
  logAuthSuccess: vi.fn(() => {}),
  logAuthFailure: vi.fn(() => {}),
  logAccountLock: vi.fn(() => {}),
  logError: vi.fn(() => {}),
});

// Mock user factory
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "user_1",
  email: "test@example.com",
  password: "hashed_password",
  loginAttempts: 0,
  lastLoginAt: null,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

class ManagedAuthServiceTest extends BaseServiceTest {
  private mockLogger = createMockLogger();

  protected createService(): ManagedAuthService {
    return new ManagedAuthService(
      this.mockLogger as unknown as ManagedLoggingService,
    );
  }

  public beforeAll(): void {
    super.beforeAll();

    describe("Managed Auth Service Specific Tests", () => {
      let authService: ManagedAuthService;

      beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create fresh service instance
        authService = this.createService();

        // Start the service
        await authService.start();
      });

      afterEach(async () => {
        try {
          if (authService.getStatus() !== ServiceStatus.STOPPED) {
            await authService.stop();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      });

      describe("Service Lifecycle", () => {
        it("should initialize Prisma client on start", async () => {
          expect(PrismaClient).toHaveBeenCalled();
          expect(mockPrismaClient.$connect).toHaveBeenCalled();
          expect(authService.getStatus()).toBe(ServiceStatus.RUNNING);
        });

        it("should handle start errors", async () => {
          const errorService = this.createService();
          mockPrismaClient.$connect.mockRejectedValueOnce(
            new Error("Connection failed"),
          );

          await expect(errorService.start()).rejects.toThrow(
            "Connection failed",
          );
          expect(errorService.getStatus()).toBe(ServiceStatus.ERROR);
        });

        it("should disconnect Prisma client on stop", async () => {
          await authService.stop();
          expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
          expect(authService.getStatus()).toBe(ServiceStatus.STOPPED);
        });

        it("should handle stop errors", async () => {
          mockPrismaClient.$disconnect.mockRejectedValueOnce(
            new Error("Disconnect failed"),
          );

          await expect(authService.stop()).rejects.toThrow("Disconnect failed");
          expect(authService.getStatus()).toBe(ServiceStatus.ERROR);
        });
      });

      describe("Registration", () => {
        const validRegistration: RegistrationData = {
          email: "test@example.com",
          password: "password123",
          confirmPassword: "password123",
        };

        beforeEach(() => {
          const mockUser = createMockUser();
          mockPrismaClient.user.create.mockResolvedValue(mockUser);
        });

        it("should register a new user successfully", async () => {
          mockPrismaClient.user.findUnique.mockResolvedValue(null);

          const result = await authService.register(validRegistration);

          expect(result).toEqual({
            success: true,
            message: "Registration successful",
            data: {
              user: {
                id: "user_1",
                email: validRegistration.email,
              },
              token: "test_token",
            },
          });

          expect(mockBcrypt.hash).toHaveBeenCalledWith(
            validRegistration.password,
            10,
          );
          expect(this.mockLogger.logAuthSuccess).toHaveBeenCalled();
        });

        it("should prevent duplicate email registration", async () => {
          mockPrismaClient.user.findUnique.mockResolvedValue(createMockUser());

          await expect(authService.register(validRegistration)).rejects.toThrow(
            ValidationError,
          );
          expect(this.mockLogger.logAuthFailure).toHaveBeenCalled();
        });
      });

      describe("Login", () => {
        const validCredentials: LoginCredentials = {
          email: "test@example.com",
          password: "password123",
        };

        const mockUser = createMockUser();

        beforeEach(() => {
          mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
          mockPrismaClient.session.create.mockResolvedValue({
            id: "session_1",
            token: "test_token",
            userId: mockUser.id,
            expiresAt: new Date(),
            createdAt: new Date(),
          });
        });

        it("should login successfully with valid credentials", async () => {
          const result = await authService.login(validCredentials);

          expect(result).toEqual({
            success: true,
            message: "Login successful",
            data: {
              user: {
                id: mockUser.id,
                email: mockUser.email,
              },
              token: "test_token",
            },
          });

          expect(this.mockLogger.logAuthSuccess).toHaveBeenCalled();
        });

        it("should fail login with invalid password", async () => {
          mockBcrypt.compare.mockResolvedValueOnce(false);

          await expect(authService.login(validCredentials)).rejects.toThrow(
            AuthenticationError,
          );
          expect(this.mockLogger.logAuthFailure).toHaveBeenCalled();
        });

        it("should lock account after max login attempts", async () => {
          mockBcrypt.compare.mockResolvedValueOnce(false);
          mockPrismaClient.user.findUnique.mockResolvedValue(
            createMockUser({ loginAttempts: 4 }),
          );

          await expect(authService.login(validCredentials)).rejects.toThrow(
            AuthenticationError,
          );

          expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
            where: { id: mockUser.id },
            data: expect.objectContaining({
              loginAttempts: 5,
              lockedUntil: expect.any(Date),
            }),
          });

          expect(this.mockLogger.logAccountLock).toHaveBeenCalled();
        });

        it("should prevent login when account is locked", async () => {
          const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          mockPrismaClient.user.findUnique.mockResolvedValue(
            createMockUser({ loginAttempts: 5, lockedUntil }),
          );

          await expect(authService.login(validCredentials)).rejects.toThrow(
            /Account is locked/,
          );
          expect(this.mockLogger.logAuthFailure).toHaveBeenCalled();
        });
      });

      describe("Logout", () => {
        it("should logout successfully", async () => {
          const userId = "user_1";
          mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 1 });

          const result = await authService.logout(userId);

          expect(result).toEqual({
            success: true,
            message: "Logout successful",
          });

          expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
            where: { userId },
          });
        });

        it("should handle logout when no active session exists", async () => {
          const userId = "user_1";
          mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 0 });

          const result = await authService.logout(userId);

          expect(result).toEqual({
            success: true,
            message: "Logout successful",
          });
        });
      });
    });
  }
}

// Create an instance and run the tests
new ManagedAuthServiceTest().beforeAll();
