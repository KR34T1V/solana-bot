/**
 * @file Test Suite for Managed Authentication Service
 * @version 1.0.0
 * @description Tests for service manager compatible authentication service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ManagedAuthService } from "../core/managed-auth";
import { ServiceStatus } from "../core/service.manager";
import { AuthenticationError, ValidationError } from "$lib/utils/errors";
import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "$lib/utils/jwt";

// Mock modules first (these must be at the top level)
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("$lib/utils/jwt", () => ({
  generateToken: vi.fn(),
}));

describe("ManagedAuthService", () => {
  // Mock functions
  const mockConnect = vi.fn();
  const mockDisconnect = vi.fn();
  const mockFindUnique = vi.fn();
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDeleteMany = vi.fn();

  let authService: ManagedAuthService;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup PrismaClient mock implementation
    const mockPrismaClient = {
      $connect: mockConnect,
      $disconnect: mockDisconnect,
      user: {
        findUnique: mockFindUnique,
        create: mockCreate,
        update: mockUpdate,
      },
      session: {
        create: mockCreate,
        deleteMany: mockDeleteMany,
      },
    };

    vi.mocked(PrismaClient).mockImplementation(
      () => mockPrismaClient as unknown as PrismaClient,
    );

    // Setup bcrypt mock implementations
    vi.mocked(bcrypt.hash).mockImplementation(() =>
      Promise.resolve("hashed_password"),
    );
    vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false));

    // Setup JWT mock implementation
    vi.mocked(generateToken).mockImplementation(() =>
      Promise.resolve("test_token"),
    );

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      logAuthAttempt: vi.fn(),
      logAuthSuccess: vi.fn(),
      logAuthFailure: vi.fn(),
      logAccountLock: vi.fn(),
      logError: vi.fn(),
    };

    // Create auth service instance
    authService = new ManagedAuthService(mockLogger);
  });

  afterEach(async () => {
    // Only stop if not already stopped
    if (authService.getStatus() !== ServiceStatus.STOPPED) {
      await authService.stop();
    }
  });

  describe("Service Lifecycle", () => {
    it("should initialize in PENDING state", () => {
      expect(authService.getStatus()).toBe(ServiceStatus.PENDING);
    });

    it("should start successfully", async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
      expect(authService.getStatus()).toBe(ServiceStatus.RUNNING);
      expect(mockConnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Auth service started",
        expect.any(Object),
      );
    });

    it("should handle start errors", async () => {
      mockConnect.mockRejectedValueOnce(new Error("Connection failed"));
      await expect(authService.start()).rejects.toThrow("Connection failed");
      expect(authService.getStatus()).toBe(ServiceStatus.ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should stop successfully", async () => {
      // Start fresh
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
      expect(authService.getStatus()).toBe(ServiceStatus.RUNNING);

      // Test stop
      mockDisconnect.mockResolvedValueOnce(undefined);
      await authService.stop();
      expect(authService.getStatus()).toBe(ServiceStatus.STOPPED);
      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Auth service stopping");
    });

    it("should handle stop errors", async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
      mockDisconnect.mockRejectedValueOnce(new Error("Disconnect failed"));
      await expect(authService.stop()).rejects.toThrow("Disconnect failed");
      expect(authService.getStatus()).toBe(ServiceStatus.ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Registration", () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
    });

    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: "user_id",
        email: userData.email,
      });

      const result = await authService.register(userData);

      expect(result).toEqual({
        success: true,
        message: "Registration successful",
        data: {
          user: {
            id: "user_id",
            email: userData.email,
          },
          token: "test_token",
        },
      });

      expect(mockLogger.logAuthAttempt).toHaveBeenCalled();
      expect(mockLogger.logAuthSuccess).toHaveBeenCalled();
    });

    it("should prevent duplicate email registration", async () => {
      const userData = {
        email: "existing@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      mockFindUnique.mockResolvedValueOnce({
        id: "existing_id",
        email: userData.email,
      });

      await expect(authService.register(userData)).rejects.toThrow(
        ValidationError,
      );
      expect(mockLogger.logAuthFailure).toHaveBeenCalled();
    });
  });

  describe("Login", () => {
    beforeEach(async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
    });

    it("should login user successfully", async () => {
      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user_id",
        email: credentials.email,
        password: "hashed_password",
        loginAttempts: 0,
        lockedUntil: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockImplementationOnce(() =>
        Promise.resolve(true),
      );
      mockUpdate.mockResolvedValueOnce(mockUser);
      mockCreate.mockResolvedValueOnce({ token: "test_token" });

      const result = await authService.login(credentials);

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

      expect(mockLogger.logAuthAttempt).toHaveBeenCalled();
      expect(mockLogger.logAuthSuccess).toHaveBeenCalled();
    });

    it("should handle non-existent user", async () => {
      const credentials = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      mockFindUnique.mockResolvedValueOnce(null);

      await expect(authService.login(credentials)).rejects.toThrow(
        AuthenticationError,
      );
      expect(mockLogger.logAuthFailure).toHaveBeenCalled();
    });

    it("should handle locked account", async () => {
      const credentials = {
        email: "locked@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user_id",
        email: credentials.email,
        password: "hashed_password",
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + 900000), // 15 minutes from now
      };

      mockFindUnique.mockResolvedValueOnce(mockUser);

      await expect(authService.login(credentials)).rejects.toThrow(
        AuthenticationError,
      );
      expect(mockLogger.logAuthFailure).toHaveBeenCalled();
    });

    it("should handle invalid password and increment attempts", async () => {
      const credentials = {
        email: "test@example.com",
        password: "wrong_password",
      };

      const mockUser = {
        id: "user_id",
        email: credentials.email,
        password: "hashed_password",
        loginAttempts: 0,
        lockedUntil: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockImplementationOnce(() =>
        Promise.resolve(false),
      );
      mockUpdate.mockResolvedValueOnce({
        ...mockUser,
        loginAttempts: 1,
      });

      await expect(authService.login(credentials)).rejects.toThrow(
        AuthenticationError,
      );
      expect(mockLogger.logAuthFailure).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { loginAttempts: 1 },
      });
    });

    it("should lock account after max attempts", async () => {
      const credentials = {
        email: "test@example.com",
        password: "wrong_password",
      };

      const mockUser = {
        id: "user_id",
        email: credentials.email,
        password: "hashed_password",
        loginAttempts: 4, // One more attempt will trigger lock
        lockedUntil: null,
      };

      mockFindUnique.mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockImplementationOnce(() =>
        Promise.resolve(false),
      );
      mockUpdate.mockImplementationOnce((args) =>
        Promise.resolve({
          ...mockUser,
          loginAttempts: args.data.loginAttempts,
          lockedUntil: args.data.lockedUntil,
        }),
      );

      await expect(authService.login(credentials)).rejects.toThrow(
        AuthenticationError,
      );
      expect(mockLogger.logAccountLock).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          loginAttempts: 5,
          lockedUntil: expect.any(Date),
        },
      });
    });
  });

  describe("Logout", () => {
    const userId = "user_id";

    beforeEach(async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await authService.start();
    });

    it("should logout user successfully", async () => {
      mockDeleteMany.mockResolvedValueOnce({ count: 1 });

      await authService.logout(userId);

      expect(mockLogger.logAuthAttempt).toHaveBeenCalled();
      expect(mockLogger.logAuthSuccess).toHaveBeenCalled();
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { token: userId },
      });
    });

    it("should handle logout errors", async () => {
      mockDeleteMany.mockRejectedValueOnce(new Error("Logout failed"));

      await expect(authService.logout(userId)).rejects.toThrow("Logout failed");
      expect(mockLogger.logAuthFailure).toHaveBeenCalled();
    });
  });
});
