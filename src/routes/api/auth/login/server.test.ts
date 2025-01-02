import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../login/+server";
import { createRequestEvent } from "$tests/utils/testHelpers";
import { validLoginCredentials, mockUser } from "$tests/fixtures/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully login a user", async () => {
    // Mock findUnique to return valid user
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

    const event = await createRequestEvent(
      "POST",
      "/api/auth/login",
      validLoginCredentials,
    );
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Login successful");
    expect(data.data.user.id).toBeDefined();
    expect(data.data.user.email).toBeDefined();
    expect(data.data.token).toBeDefined();
  });

  it("should return error for invalid credentials", async () => {
    const invalidCredentials = {
      email: "invalid@example.com",
      password: "wrongpassword",
    };

    // Mock findUnique to return null for invalid email
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const event = await createRequestEvent(
      "POST",
      "/api/auth/login",
      invalidCredentials,
    );
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Invalid email or password");
  });

  it("should return error for locked account", async () => {
    const lockedCredentials = {
      email: "locked@example.com",
      password: "Password123!",
    };

    const event = await createRequestEvent(
      "POST",
      "/api/auth/login",
      lockedCredentials,
    );
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Account is locked");
  });
});
