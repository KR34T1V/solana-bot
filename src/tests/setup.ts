import { vi } from "vitest";
import { mockUser } from "./fixtures/auth";
import type { PrismaClient, Prisma } from "@prisma/client";

// Mock environment variables
vi.mock("$env/static/private", () => ({
  JWT_SECRET: "test-jwt-secret",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
}));

// Mock Prisma
vi.mock("@prisma/client", () => {
  const mockPrismaClient = vi.fn(() => ({
    user: {
      create: vi.fn().mockImplementation((args: Prisma.UserCreateArgs) => {
        return Promise.resolve({
          ...mockUser,
          ...args.data,
          id: "new-user-id",
        });
      }),
      findUnique: vi
        .fn()
        .mockImplementation((args: Prisma.UserFindUniqueArgs) => {
          // Special case for locked user test
          if (args.where.email === "locked@example.com") {
            return Promise.resolve({
              ...mockUser,
              email: "locked@example.com",
              loginAttempts: 5,
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
            });
          }
          // Return mock user for existing email during login
          if (args.where.email === "test@example.com") {
            return Promise.resolve(mockUser);
          }
          // Return null for registration of new email
          if (args.where.email === "new@example.com") {
            return Promise.resolve(null);
          }
          // Return mock user for all other cases (simulating existing email)
          return Promise.resolve(mockUser);
        }),
      update: vi.fn().mockImplementation((args: Prisma.UserUpdateArgs) => {
        return Promise.resolve({
          ...mockUser,
          ...args.data,
        });
      }),
    },
    session: {
      create: vi.fn().mockResolvedValue({
        id: "mock-session-id",
        token: "mock.jwt.token",
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn((callback) => callback()),
  })) as unknown as () => PrismaClient;

  return {
    PrismaClient: mockPrismaClient,
  };
});

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashedPassword"),
  compare: vi.fn().mockImplementation((password: string, _hash: string) => {
    // Return true for valid credentials, false for invalid
    return Promise.resolve(password === "Password123!");
  }),
}));

// Mock JWT utilities
vi.mock("$lib/utils/jwt", () => ({
  generateToken: vi.fn().mockResolvedValue("mock.jwt.token"),
  verifyToken: vi.fn().mockImplementation((token) => {
    if (token === "invalid.token.here") {
      throw new Error("Invalid token");
    }
    return Promise.resolve({ userId: mockUser.id });
  }),
}));
