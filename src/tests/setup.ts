import { vi } from "vitest";
import { mockUser } from "./fixtures/auth";

// Mock environment variables
vi.mock("$env/static/private", () => ({
  JWT_SECRET: "test-jwt-secret",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
}));

// Mock Prisma
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

// Mock bcrypt
vi.mock("bcryptjs", async () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock JWT utilities
vi.mock("$lib/utils/jwt", () => ({
  generateToken: vi.fn().mockResolvedValue("mock.jwt.token"),
  verifyToken: vi.fn().mockResolvedValue({ userId: mockUser.id }),
}));
