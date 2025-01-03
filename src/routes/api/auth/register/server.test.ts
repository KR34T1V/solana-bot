/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module routes/api/auth/register/server.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../register/+server";
import { createRequestEvent } from "../../../../tests/utils/testHelpers";
import {
  validRegistrationData,
  invalidRegistrationData,
  mockUser,
} from "../../../../tests/fixtures/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully register a new user", async () => {
    // Mock findUnique to return null (no existing user)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    // Mock create to return a new user
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      ...mockUser,
      id: "new-user-id",
      email: validRegistrationData.email,
    });

    const event = await createRequestEvent(
      "POST",
      "/api/auth/register",
      validRegistrationData,
    );
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Registration successful");
    expect(data.data?.user).toBeDefined();
    expect(data.data?.token).toBeDefined();
  });

  it.each(invalidRegistrationData)(
    "should return validation error for invalid data: $email",
    async (invalidData) => {
      const event = await createRequestEvent(
        "POST",
        "/api/auth/register",
        invalidData,
      );
      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Validation failed");
      expect(data.errors).toBeDefined();
    },
  );

  it("should return error if email already exists", async () => {
    const existingEmailData = {
      ...validRegistrationData,
      email: "test@example.com", // Use the email that our mock returns as existing
    };

    // Mock findUnique to return an existing user
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

    const event = await createRequestEvent(
      "POST",
      "/api/auth/register",
      existingEmailData,
    );
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Email already exists");
    expect(data.errors?.email).toContain("Email already exists");
  });
});
