import { describe, it, expect, vi, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../auth.service";
import { PrismaClient } from "@prisma/client";
import {
  mockUser,
  validRegistrationData,
  validLoginCredentials,
} from "$tests/fixtures/auth";
import type { Mock } from "vitest";

vi.mock("bcryptjs");
vi.mock("@prisma/client");

describe("AuthService", () => {
  let authService: AuthService;
  let prisma: PrismaClient;
  const hashedPassword = "hashedPassword";

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    authService = new AuthService(prisma);

    // Type assertion to handle mock types
    (bcrypt.hash as unknown as Mock).mockResolvedValue(hashedPassword);
    (bcrypt.compare as unknown as Mock).mockResolvedValue(true);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const response = await authService.register(validRegistrationData);

      expect(response.success).toBe(true);
      expect(response.message).toBe("Registration successful");
      expect(response.data?.user).toBeDefined();
      expect(response.data?.token).toBeDefined();
    });

    it("should throw an error if email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        "Registration failed",
      );
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as unknown as Mock).mockResolvedValueOnce(true);

      const response = await authService.login(validLoginCredentials);

      expect(response.success).toBe(true);
      expect(response.message).toBe("Login successful");
      expect(response.data?.user).toBeDefined();
      expect(response.data?.token).toBeDefined();
    });

    it("should throw an error if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(authService.login(validLoginCredentials)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw an error if password is invalid", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as unknown as Mock).mockResolvedValueOnce(false);

      await expect(authService.login(validLoginCredentials)).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });
});
