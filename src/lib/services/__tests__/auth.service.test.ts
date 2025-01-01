import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth.service";
import { PrismaClient } from "@prisma/client";
import {
  mockUser,
  validRegistrationData,
  validLoginCredentials,
} from "../../../tests/fixtures/auth";
import { ValidationError, AuthenticationError } from "$lib/utils/errors";
import bcrypt from "bcryptjs";
import { generateToken } from "$lib/utils/jwt";

// Mock external dependencies
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback()),
  })),
}));

vi.mock("bcryptjs", async () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/utils/jwt", () => ({
  generateToken: vi.fn().mockResolvedValue("mock.jwt.token"),
}));

describe("AuthService", () => {
  let authService: AuthService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    authService = new AuthService(prisma);
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const hashedPassword = "hashedPassword123";
      const token = "jwt.token.here";

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);
      vi.mocked(generateToken).mockResolvedValue(token);

      const result = await authService.register(validRegistrationData);

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe(token);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: validRegistrationData.email,
          password: hashedPassword,
        },
      });
    });

    it("should throw ValidationError if email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("login", () => {
    it("should successfully login a user", async () => {
      const token = "jwt.token.here";

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(generateToken).mockResolvedValue(token);

      const result = await authService.login(validLoginCredentials);

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe(token);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          loginAttempts: 0,
          lastLoginAt: expect.any(Date),
        },
      });
    });

    it("should throw AuthenticationError if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.login(validLoginCredentials)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("should throw AuthenticationError if password is incorrect", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(authService.login(validLoginCredentials)).rejects.toThrow(
        AuthenticationError,
      );
    });
  });

  describe("logout", () => {
    it("should successfully logout a user", async () => {
      const userId = mockUser.id;
      const result = await authService.logout(userId);

      expect(result.success).toBe(true);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});
