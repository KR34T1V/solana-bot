import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth.service";
import { ValidationError } from "$lib/utils/errors";
import { mockUser, validRegistrationData } from "$tests/fixtures/auth";
import { PrismaClient } from "@prisma/client";

describe("AuthService", () => {
  let authService: AuthService;
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    authService = new AuthService(prisma);
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      // Mock findUnique to return null (no existing user)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await authService.register(validRegistrationData);

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

    it("should throw error if email already exists", async () => {
      // Mock findUnique to return existing user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("login", () => {
    it("should successfully login a user", async () => {
      // Mock findUnique to return valid user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password123!",
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

    it("should throw error for invalid credentials", async () => {
      // Mock findUnique to return user for password check
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw error for non-existent user", async () => {
      // Mock findUnique to return null
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        authService.login({
          email: "nonexistent@example.com",
          password: "Password123!",
        }),
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("logout", () => {
    it("should successfully logout a user", async () => {
      const result = await authService.logout("mock.jwt.token");
      expect(result).toEqual({
        success: true,
        message: "Logout successful",
      });
    });
  });
});
