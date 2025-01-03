/**
 * @file Test suite for validating functionality
 * @version 1.0.0
 * @module routes/api/auth/logout/server.test
 * @author Development Team
 * @lastModified 2025-01-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../logout/+server";
import { createRequestEvent } from "../../../../tests/utils/testHelpers";
import { mockUser } from "../../../../tests/fixtures/auth";
import { generateToken } from "$lib/utils/jwt";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully logout a user", async () => {
    const token = await generateToken(mockUser.id);
    const event = await createRequestEvent("POST", "/api/auth/logout", null, {
      authorization: `Bearer ${token}`,
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Logout successful");
  });

  it("should return error when no token is provided", async () => {
    const event = await createRequestEvent("POST", "/api/auth/logout");
    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("No authorization token provided");
  });

  it("should return error for invalid token", async () => {
    const event = await createRequestEvent("POST", "/api/auth/logout", null, {
      authorization: "Bearer invalid.token.here",
    });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Logout failed. Please try again.");
  });
});
