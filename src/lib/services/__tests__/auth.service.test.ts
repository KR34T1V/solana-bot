import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth.service";
import { ValidationError } from "$lib/utils/errors";
import { mockUser, validRegistrationData } from "$tests/fixtures/auth";
import { PrismaClient } from "@prisma/client";
import { logger } from "../logging.service";

// Mock logger
vi.mock("../logging.service", () => ({
  logger: {
    logAuthAttempt: vi.fn(),
    logAuthSuccess: vi.fn(),
    logAuthFailure: vi.fn(),
    logAccountLock: vi.fn(),
    logError: vi.fn(),
  },
}));

describe("AuthService", () => {
  let authService: AuthService;
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    authService = new AuthService(prisma);
  });

  describe("register", () => {
    it("should successfully register a new user and log events", async () => {
      // Mock findUnique to return null (no existing user)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await authService.register(validRegistrationData);

      // Verify logging
      expect(logger.logAuthAttempt).toHaveBeenCalledWith({
        action: "register",
        email: validRegistrationData.email,
      });

      expect(logger.logAuthSuccess).toHaveBeenCalledWith({
        action: "register",
        email: validRegistrationData.email,
        userId: "new-user-id",
      });

      expect(result).toEqual({
        success: true,
        message: "Registration successful",
        data: {
          user: {
            id: "new-user-id",
            email: validRegistrationData.email,
          },
          token: "mock.jwt.token",
        },
      });
    });

    it("should log failure when email already exists", async () => {
      // Mock findUnique to return existing user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        ValidationError,
      );

      // Verify logging
      expect(logger.logAuthAttempt).toHaveBeenCalledWith({
        action: "register",
        email: validRegistrationData.email,
      });

      expect(logger.logAuthFailure).toHaveBeenCalledWith({
        action: "register",
        email: validRegistrationData.email,
        failureReason: "Email already exists",
      });
    });

    it("should log unexpected errors during registration", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(error);

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        error,
      );

      expect(logger.logError).toHaveBeenCalledWith(error, {
        action: "register",
        email: validRegistrationData.email,
      });
    });
  });

  describe("login", () => {
    const validCredentials = {
      email: "test@example.com",
      password: "Password123!",
    };

    it("should successfully login a user and log events", async () => {
      // Mock findUnique to return valid user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await authService.login(validCredentials);

      // Verify logging
      expect(logger.logAuthAttempt).toHaveBeenCalledWith({
        action: "login",
        email: validCredentials.email,
      });

      expect(logger.logAuthSuccess).toHaveBeenCalledWith({
        action: "login",
        email: validCredentials.email,
        userId: mockUser.id,
      });

      expect(result).toEqual({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
          token: "mock.jwt.token",
        },
      });
    });

    it("should log failure for invalid credentials", async () => {
      // Mock findUnique to return user for password check
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(
        authService.login({
          ...validCredentials,
          password: "wrongpassword",
        }),
      ).rejects.toThrow("Invalid email or password");

      // Verify logging
      expect(logger.logAuthFailure).toHaveBeenCalledWith({
        action: "login",
        email: validCredentials.email,
        userId: mockUser.id,
        failureReason: "Invalid password",
        loginAttempts: 1,
      });
    });

    it("should log account lock after multiple failures", async () => {
      // Mock user with 4 previous attempts
      const userWithAttempts = {
        ...mockUser,
        loginAttempts: 4,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(userWithAttempts);

      await expect(
        authService.login({
          ...validCredentials,
          password: "wrongpassword",
        }),
      ).rejects.toThrow("Invalid email or password");

      // Verify account lock logging
      expect(logger.logAccountLock).toHaveBeenCalledWith({
        email: validCredentials.email,
        userId: mockUser.id,
        loginAttempts: 5,
        lockedUntil: expect.any(Date),
      });
    });

    it("should log failure for locked account", async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 1000 * 60), // Locked for 1 minute
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(lockedUser);

      await expect(authService.login(validCredentials)).rejects.toThrow(
        /Account is locked/,
      );

      // Verify logging
      expect(logger.logAuthFailure).toHaveBeenCalledWith({
        action: "login",
        email: validCredentials.email,
        userId: mockUser.id,
        failureReason: "Account locked",
        lockedUntil: lockedUser.lockedUntil,
      });
    });

    it("should log failure for non-existent user", async () => {
      // Mock findUnique to return null
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        authService.login({
          email: "nonexistent@example.com",
          password: "Password123!",
        }),
      ).rejects.toThrow("Invalid email or password");

      // Verify logging
      expect(logger.logAuthFailure).toHaveBeenCalledWith({
        action: "login",
        email: "nonexistent@example.com",
        failureReason: "User not found",
      });
    });
  });

  describe("logout", () => {
    const userId = "test-user-id";

    it("should successfully logout a user and log events", async () => {
      const result = await authService.logout(userId);

      // Verify logging
      expect(logger.logAuthAttempt).toHaveBeenCalledWith({
        action: "logout",
        userId,
      });

      expect(logger.logAuthSuccess).toHaveBeenCalledWith({
        action: "logout",
        userId,
      });

      expect(result).toEqual({
        success: true,
        message: "Logout successful",
      });
    });

    it("should log errors during logout", async () => {
      const error = new Error("Session deletion failed");
      vi.mocked(prisma.session.deleteMany).mockRejectedValueOnce(error);

      await expect(authService.logout(userId)).rejects.toThrow(error);

      expect(logger.logError).toHaveBeenCalledWith(error, {
        action: "logout",
        userId,
      });
    });
  });
});
